// Configuration du jeu
const WHEEL_SEGMENTS = 54;
const SEGMENT_DISTRIBUTION = {
    'x1': 21,  // 21 segments x1
    'x2': 13,  // 13 segments x2
    'x5': 7,   // 7 segments x5
    'x10': 4,  // 4 segments x10
    'cash-hunt': 2,  // 2 segments Cash Hunt
    'coin-flip': 2,  // 2 segments Coin Flip
    'pachinko': 2,   // 2 segments Pachinko
    'crazy-time': 3  // 3 segments Crazy Time
};

const SEGMENT_COLORS = {
    'x1': 0x95a5a6,
    'x2': 0xe74c3c,
    'x5': 0x27ae60,
    'x10': 0x3498db,
    'cash-hunt': 0x9b59b6,
    'coin-flip': 0xf1c40f,
    'pachinko': 0x1abc9c,
    'crazy-time': 0xe67e22
};

const SEGMENT_LABELS = {
    'x1': '1',
    'x2': '2',
    'x5': '5',
    'x10': '10',
    'cash-hunt': 'CASH HUNT',
    'coin-flip': 'COIN FLIP',
    'pachinko': 'PACHINKO',
    'crazy-time': 'CRAZY TIME'
};

// État du jeu
let gameState = {
    userId: userData ? userData.id : 0,
    balance: userData ? userData.initialBalance : 1000,
    currentChip: 10,
    bets: {
        'x1': 0,
        'x2': 0,
        'x5': 0,
        'x10': 0,
        'cash-hunt': 0,
        'coin-flip': 0,
        'pachinko': 0,
        'crazy-time': 0
    },
    // Stocker les mises précédentes pour la fonction "remiser"
    previousBets: {
        'x1': 0,
        'x2': 0,
        'x5': 0,
        'x10': 0,
        'cash-hunt': 0,
        'coin-flip': 0,
        'pachinko': 0,
        'crazy-time': 0
    },
    totalBet: 0,
    previousTotalBet: 0,
    isSpinning: false,
    spinSpeed: 0,
    wheelAngle: 0,
    winningSegment: null,
    lastWin: 0,
    lastResult: '--',
    topMultiplier: 'x1',
    nextBonus: '--',
    history: []
};

// Fonction pour mettre à jour le solde dans la base de données
async function serverUpdateTransaction(amount, isWin) {
    try {
        const response = await fetch('update_balance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: gameState.userId,
                amount: amount,
                isWin:  isWin
            }),
        });
        const data = await response.json();

        if (!data.success) {
            console.error('Erreur BDD:', data.message);
            alert(data.message || 'Erreur update_balance.php');
            return false;
        }

        // Le serveur renvoie la VRAIE nouvelle balance
        gameState.balance = data.newBalance;
        updateUI(); // Réactualise l'affichage
        return true;

    } catch (error) {
        console.error('Erreur réseau:', error);
        alert('Connexion serveur impossible.');
        return false;
    }
}


// Initialisation de PIXI.js
const app = new PIXI.Application({
    view: document.getElementById('wheel-canvas'),
    width: 500,
    height: 500,
    backgroundColor: 0x000000,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
});

// Créer les conteneurs principaux
const wheelContainer = new PIXI.Container();
wheelContainer.position.set(app.screen.width / 2, app.screen.height / 2);
app.stage.addChild(wheelContainer);

// Créer la structure de la roue
const wheel = new PIXI.Container();
wheelContainer.addChild(wheel);

// Créer tous les segments de la roue
function createWheel() {
    // Création de tous les segments
    const segments = [];
    let currentAngle = 0;
    const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS;

    // Distribuer les types de segments selon leur fréquence
    let segmentTypes = [];
    for (const [type, count] of Object.entries(SEGMENT_DISTRIBUTION)) {
        for (let i = 0; i < count; i++) {
            segmentTypes.push(type);
        }
    }

    // Mélanger les segments pour plus de variété
    shuffleArray(segmentTypes);

    // Créer chaque segment
    for (let i = 0; i < WHEEL_SEGMENTS; i++) {
        const segmentType = segmentTypes[i];
        const segment = createSegment(segmentAngle, SEGMENT_COLORS[segmentType], SEGMENT_LABELS[segmentType], segmentType);
        segment.rotation = currentAngle;
        segment.segmentType = segmentType;
        wheel.addChild(segment);
        segments.push(segment);
        
        currentAngle += segmentAngle;
    }

    return segments;
}

// Création d'un segment individuel avec meilleure visibilité
function createSegment(angle, color, label, type) {
    const container = new PIXI.Container();
    
    // Dessiner le segment de base avec un dégradé
    const segment = new PIXI.Graphics();
    
    // Couleur de base avec léger dégradé pour plus de profondeur
    const gradientColor = adjustColor(color, 20);
    segment.beginFill(color);
    segment.moveTo(0, 0);
    segment.arc(0, 0, 230, -angle / 2, angle / 2);
    segment.lineTo(0, 0);
    segment.endFill();
    
    // Bordure blanche entre les segments
    segment.lineStyle(2, 0xFFFFFF, 0.8);
    segment.moveTo(0, 0);
    segment.arc(0, 0, 230, -angle / 2, angle / 2);
    segment.lineTo(0, 0);
    
    container.addChild(segment);
    
    // Ajouter un effet de rayons pour chaque segment (alternés)
    if (Math.random() > 0.5) {
        const rays = new PIXI.Graphics();
        rays.beginFill(0xFFFFFF, 0.15);
        
        // Créer des rayons alternés
        for (let i = 0; i < 3; i++) {
            const rayWidth = angle / 10;
            const rayStart = -angle / 2 + i * angle / 3;
            rays.moveTo(0, 0);
            rays.arc(0, 0, 230, rayStart, rayStart + rayWidth);
            rays.lineTo(0, 0);
        }
        
        rays.endFill();
        container.addChild(rays);
    }
    
    // Déterminer si c'est un bonus ou un multiplicateur standard
    let isBonus = type.includes('cash-hunt') || type.includes('coin-flip') || 
                  type.includes('pachinko') || type.includes('crazy-time');
    
    // Définir la taille et position du texte (plus grand pour meilleure visibilité)
    let fontSize = isBonus ? 18 : 36; // Augmenté pour plus de visibilité
    let textDistance = isBonus ? 130 : 150;
    
    // Style de texte avec contour épais pour meilleure lisibilité
    const text = new PIXI.Text(label, {
        fontFamily: 'Arial',
        fontSize: fontSize,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: isBonus ? 4 : 6 // Contour plus épais pour multiplicateurs standard
    });
    
    // Positionner le texte correctement sur le segment
    text.anchor.set(0.5);
    const textAngle = 0; // Angle au milieu du segment
    const x = Math.cos(textAngle) * textDistance;
    const y = Math.sin(textAngle) * textDistance;
    text.position.set(x, y);
    
    // Rotation du texte pour qu'il soit lisible (perpendiculaire au rayon)
    text.rotation = Math.PI /.2 + textAngle;
    
    container.addChild(text);
    
    // Design spécial pour les segments bonus
    if (isBonus) {
        // Ajouter un surlignage pour les bonus
        const highlight = new PIXI.Graphics();
        highlight.lineStyle(8, 0xFFD700, 0.9); // Plus visible
        highlight.arc(0, 0, 220, -angle / 2, angle / 2);
        container.addChild(highlight);
        
        // Ajouter un second texte en dessous pour les bonus
        const bonusText = new PIXI.Text(label, {
            fontFamily: 'Arial',
            fontSize: 20,
            fontWeight: 'bold',
            fill: 0xFFFFFF,
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 4
        });
        
        bonusText.anchor.set(0.5);
        bonusText.position.set(x, y + 30);
        bonusText.rotation = Math.PI / 2 + textAngle;
        container.addChild(bonusText);
        
        // Ajouter une icône pour les bonus
        let iconText;
        switch(type) {
            case 'cash-hunt':
                iconText = '🎯';
                break;
            case 'coin-flip':
                iconText = '💰';
                break;
            case 'pachinko':
                iconText = '🎪';
                break;
            case 'crazy-time':
                iconText = '🎉';
                break;
        }
        
        const icon = new PIXI.Text(iconText, {
            fontSize: 24,
            align: 'center'
        });
        
        icon.anchor.set(0.5);
        icon.position.set(x, y - 30);
        icon.rotation = Math.PI / 2 + textAngle;
        container.addChild(icon);
    }
    
    return container;
}

// Ajuster la couleur pour les dégradés
function adjustColor(color, amount) {
    // Extraire les composantes RGB
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Ajuster chaque composante
    const newR = Math.min(255, Math.max(0, r + amount));
    const newG = Math.min(255, Math.max(0, g + amount));
    const newB = Math.min(255, Math.max(0, b + amount));
    
    // Recombiner en une couleur hexadécimale
    return (newR << 16) | (newG << 8) | newB;
}

// Création d'une bordure pour la roue
function createWheelBorder() {
    // Bordure extérieure noire
    const outerRing = new PIXI.Graphics();
    outerRing.beginFill(0x000000);
    outerRing.drawCircle(0, 0, 250);
    outerRing.endFill();
    wheelContainer.addChildAt(outerRing, 0);
    
    // Bordure dorée
    const goldenRing = new PIXI.Graphics();
    goldenRing.beginFill(0xF1C40F);
    goldenRing.drawCircle(0, 0, 240);
    goldenRing.endFill();
    wheelContainer.addChildAt(goldenRing, 1);
    
    // Cercle intérieur pour les segments
    const innerCircle = new PIXI.Graphics();
    innerCircle.beginFill(0x000000, 0.3);
    innerCircle.drawCircle(0, 0, 230);
    innerCircle.endFill();
    wheelContainer.addChildAt(innerCircle, 2);
    
    // Cercle central jaune
    const centerCircle = new PIXI.Graphics();
    centerCircle.beginFill(0xF1C40F);
    centerCircle.drawCircle(0, 0, 50);
    centerCircle.endFill();
    
    // Bordure dorée supplémentaire
    centerCircle.lineStyle(3, 0xFFFFFF, 0.7);
    centerCircle.drawCircle(0, 0, 50);
    
    // Texte CRAZY TIME au centre
    const centerText1 = new PIXI.Text("CRAZY", {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 1
    });
    centerText1.anchor.set(0.5);
    centerText1.position.set(0, -8);
    
    const centerText2 = new PIXI.Text("TIME", {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 1
    });
    centerText2.anchor.set(0.5);
    centerText2.position.set(0, 8);
    
    wheelContainer.addChild(centerCircle);
    wheelContainer.addChild(centerText1);
    wheelContainer.addChild(centerText2);
    
    // Effet de lueur autour de la roue
    const glowFilter = new PIXI.BlurFilter();
    glowFilter.blur = 15;
    glowFilter.quality = 10;
    
    const glow = new PIXI.Graphics();
    glow.beginFill(0xF1C40F, 0.5);
    glow.drawCircle(0, 0, 255);
    glow.endFill();
    glow.filters = [glowFilter];
    
    wheelContainer.addChildAt(glow, 0);
}

// Initialisation du jeu
function initGame() {
    // Créer la roue et ses segments
    const segments = createWheel();
    
    // Créer la bordure de la roue
    createWheelBorder();
    
    // Initialiser les contrôles UI
    initUIControls();
    
    // Initialiser les boutons de test
    initTestButtons(segments);
    
    // Initialiser l'affichage
    updateUI();
    
    // Désactiver le bouton Remiser au démarrage
    document.getElementById('rebet-btn').disabled = true;
    document.getElementById('rebet-btn').style.opacity = "0.5";
    
    // Boucle de jeu principale
    app.ticker.add((delta) => gameLoop(delta, segments));
    
    // Animation au démarrage
    animateStartup();
}

// Animation de démarrage
function animateStartup() {
    gsap.from(wheel, {
        rotation: Math.PI * 2,
        duration: 2,
        ease: "power2.out"
    });
    
    gsap.from(wheel.scale, {
        x: 0.5,
        y: 0.5,
        duration: 1.5,
        ease: "elastic.out(1, 0.5)"
    });
}

// Boucle de jeu principale
function gameLoop(delta, segments) {
    if (gameState.isSpinning) {
        // Rotation de la roue
        wheel.rotation += gameState.spinSpeed * delta * 0.01;
        
        // Réduction progressive de la vitesse
        gameState.spinSpeed *= 0.985;
        
        // Détection de l'arrêt de la roue
        if (gameState.spinSpeed < 0.1 && gameState.isSpinning) {
            stopWheel(segments);
        }
    }
}

// Arrêt de la roue et détermination du résultat
function stopWheel(segments) {
    gameState.isSpinning = false;
    
    // Calcul du segment gagnant
    const angle = normalizeAngle(wheel.rotation);
    const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS;
    
    let winningIndex = Math.floor(angle / segmentAngle) % WHEEL_SEGMENTS;
    winningIndex = (WHEEL_SEGMENTS - winningIndex) % WHEEL_SEGMENTS; // Inversion pour correspondre à la rotation
    
    gameState.winningSegment = segments[winningIndex];
    
    // Effet de "tremblement" de la roue sur sa position finale
    shakeWheel(() => {
        // Traitement du résultat
        processResult(gameState.winningSegment.segmentType);
    });
}

// Effet de tremblement de la roue
function shakeWheel(callback) {
    let amplitude = 0.02;
    let decay = 0.85;
    let duration = 15;
    let frame = 0;
    
    function shake() {
        if (frame < duration) {
            wheel.rotation += Math.sin(frame * 0.5) * amplitude;
            amplitude *= decay;
            frame++;
            requestAnimationFrame(shake);
        } else {
            if (callback) callback();
        }
    }
    
    shake();
}

// Normalisation de l'angle entre 0 et 2π
function normalizeAngle(angle) {
    return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

// Lancement de la roue
async function spinWheel() {
    if (gameState.isSpinning) return;

    // Vérifier solde local et mise
    if (gameState.totalBet <= 0) {
        alert("Veuillez placer au moins une mise !");
        return;
    }
    if (gameState.totalBet > gameState.balance) {
        alert("Votre solde est insuffisant !");
        return;
    }

    // Sauvegarder les mises
    saveBets();

    // APPEL SERVEUR pour retirer la mise
    const success = await serverUpdateTransaction(gameState.totalBet, false); 
    if (!success) {
        // Si échec, on arrête tout
        return;
    }
        
        gameState.isSpinning = true;
        gameState.spinSpeed = 15 + Math.random() * 10; // Vitesse aléatoire
        
        // Déduire les mises du solde
        const oldBalance = gameState.balance;
        gameState.balance -= gameState.totalBet;
        
        // Mettre à jour le solde dans la base de données (mise)
        const updateSuccess = await updateBalanceInDatabase(gameState.balance, gameState.totalBet, false);
        
        // En cas d'échec de mise à jour BDD, revenir à l'état précédent
        if (!updateSuccess) {
            gameState.balance = oldBalance;
            gameState.isSpinning = false;
            return;
        }
        
        // Désactiver le bouton spin pendant la rotation
        document.getElementById('spin-btn').disabled = true;
        document.getElementById('spin-btn').style.opacity = "0.5";
        document.getElementById('rebet-btn').disabled = true;
        document.getElementById('rebet-btn').style.opacity = "0.5";
        
        // Désactiver les boutons de mise
        toggleBetButtons(false);
        
        // Mettre à jour l'interface
        updateUI();
    }

// Fonction pour sauvegarder les mises actuelles
function saveBets() {
    gameState.previousTotalBet = gameState.totalBet;
    
    for (const betType in gameState.bets) {
        gameState.previousBets[betType] = gameState.bets[betType];
    }
}

// Fonction pour remettre les mises précédentes
async function reBet() {
    // Vérifier s'il y a des mises précédentes
    if (gameState.previousTotalBet === 0) {
        alert("Pas de mises précédentes à reproduire !");
        return;
    }
    
    // Vérifier si le joueur a assez d'argent
    if (gameState.previousTotalBet > gameState.balance) {
        alert("Solde insuffisant pour reproduire les mises précédentes !");
        return;
    }
    
    // Réinitialiser les mises actuelles
    resetBets();
    
    // Appliquer les mises précédentes
    for (const betType in gameState.previousBets) {
        gameState.bets[betType] = gameState.previousBets[betType];
    }
    
    gameState.totalBet = gameState.previousTotalBet;
    
    // Animer les mises replacées
    document.querySelectorAll('.bet-option').forEach(option => {
        const betType = option.dataset.bet;
        if (gameState.bets[betType] > 0) {
            option.classList.add('rebet-animation');
            setTimeout(() => {
                option.classList.remove('rebet-animation');
            }, 400);
        }
    });
    
    // Mettre à jour l'affichage
    updateBetDisplay();
    updateUI();
}

// Traitement du résultat
async function processResult(segmentType) {
    gameState.lastResult = SEGMENT_LABELS[segmentType];

    if (gameState.bets[segmentType] > 0) {
        let winAmount = 0;
        switch (segmentType) {
            case 'x1':  winAmount = gameState.bets[segmentType] * 1;  break;
            case 'x2':  winAmount = gameState.bets[segmentType] * 2;  break;
            case 'x5':  winAmount = gameState.bets[segmentType] * 5;  break;
            case 'x10': winAmount = gameState.bets[segmentType] * 10; break;
            case 'cash-hunt':
            case 'coin-flip':
            case 'pachinko':
            case 'crazy-time':
                // Lancer le bonus => NE PAS MODIFIER LA BALANCE ICI
                startBonusGame(segmentType);
                return;
        }

        // APPEL SERVEUR => gain
        const success = await serverUpdateTransaction(winAmount, true);
        if (!success) {
            resetForNextRound();
            return;
        }

        // On ne modifie plus gameState.balance ici
        // Le serveur renvoie la newBalance

        gameState.lastWin = winAmount;
        showWinAnimation(winAmount);

    } else {
        // Joueur n'a pas misé sur ce segment
        gameState.lastWin = 0;
        document.getElementById('last-win').textContent = "0€";
        resetForNextRound();
    }

    // Historique etc.
    gameState.history.unshift(segmentType);
    if (gameState.history.length > 10) {
        gameState.history.pop();
    }

    // Réactiver Rebet
    document.getElementById('rebet-btn').disabled = false;
    document.getElementById('rebet-btn').style.opacity = "1";

    updateUI();
}


// Afficher l'animation de gain
function showWinAnimation(amount) {
    // Mise à jour de l'interface
    document.getElementById('last-win').textContent = amount + "€";
    
    const balanceElement = document.getElementById('balance');
    balanceElement.classList.add('win-animation');
    
    setTimeout(() => {
        balanceElement.classList.remove('win-animation');
    }, 1500);
    
    // Afficher le message de gain
    const winMessage = document.createElement('div');
    winMessage.textContent = `GAIN: ${amount}€!`;
    winMessage.style.position = 'absolute';
    winMessage.style.top = '50%';
    winMessage.style.left = '50%';
    winMessage.style.transform = 'translate(-50%, -50%)';
    winMessage.style.fontSize = '3rem';
    winMessage.style.color = '#FFD700';
    winMessage.style.fontWeight = 'bold';
    winMessage.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    winMessage.style.zIndex = '50';
    winMessage.style.padding = '2rem';
    winMessage.style.background = 'rgba(0, 0, 0, 0.7)';
    winMessage.style.borderRadius = '20px';
    
    document.querySelector('.game-container').appendChild(winMessage);
    
    setTimeout(() => {
        winMessage.remove();
        resetForNextRound();
    }, 2000);
}

// Démarrer un jeu bonus
function startBonusGame(bonusType) {
    const overlay = document.getElementById('bonus-overlay');
    const bonusTitle = document.getElementById('bonus-title');
    const bonusContent = document.getElementById('bonus-content');
    
    // Configurer le jeu bonus
    bonusTitle.textContent = SEGMENT_LABELS[bonusType];
    bonusContent.innerHTML = '';
    
    // Implémenter le contenu du jeu bonus selon le type
    switch (bonusType) {
        case 'cash-hunt':
            setupCashHunt(bonusContent);
            break;
        case 'coin-flip':
            setupCoinFlip(bonusContent);
            break;
        case 'pachinko':
            setupPachinko(bonusContent);
            break;
        case 'crazy-time':
            setupCrazyTime(bonusContent);
            break;
    }
    
    // Afficher l'overlay
    overlay.classList.add('active');
}

// Configuration du jeu bonus Cash Hunt
function setupCashHunt(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <h3 style="margin-bottom: 1.5rem; color: #f1c40f;">Choisissez un symbole pour révéler votre multiplicateur!</h3>
            <div id="cash-hunt-grid"></div>
        </div>
    `;
    
    const grid = document.createElement('div');
    grid.id = 'cash-hunt-grid';
    container.appendChild(grid);
    
    // Définir des symboles visuellement attrayants pour Cash Hunt
    const symbols = [
        { emoji: '🍒', color: '#e74c3c' },
        { emoji: '🍋', color: '#f1c40f' },
        { emoji: '🍊', color: '#e67e22' },
        { emoji: '💎', color: '#3498db' },
        { emoji: '⭐', color: '#f39c12' },
        { emoji: '7️⃣', color: '#9b59b6' },
        { emoji: '🍇', color: '#8e44ad' },
        { emoji: '🎰', color: '#34495e' },
        { emoji: '💰', color: '#f1c40f' },
        { emoji: '🔥', color: '#e74c3c' }
    ];
    
    const multipliers = [];
    
    // Générer les multiplicateurs selon la distribution souhaitée
    for (let i = 0; i < 30; i++) {
        if (i < 15) {
            // 50% petits multiplicateurs (5x-25x)
            multipliers.push(Math.floor(Math.random() * 21) + 5);
        } else if (i < 24) {
            // 30% multiplicateurs moyens (30x-100x)
            multipliers.push(Math.floor(Math.random() * 71) + 30);
        } else if (i < 28) {
            // 15% gros multiplicateurs (150x-250x)
            multipliers.push(Math.floor(Math.random() * 101) + 150);
        } else {
            // 5% multiplicateurs énormes (300x-500x)
            multipliers.push(Math.floor(Math.random() * 201) + 300);
        }
    }
    
    // Mélanger les multiplicateurs
    shuffleArray(multipliers);
    
    // Créer les cases du jeu
    for (let i = 0; i < 30; i++) {
        const symbolIndex = Math.floor(Math.random() * symbols.length);
        const symbol = symbols[symbolIndex];
        const tile = document.createElement('div');
        tile.className = 'cash-hunt-tile';
        tile.style.backgroundColor = symbol.color;
        
        tile.innerHTML = `<span style="font-size: 2.5rem;">${symbol.emoji}</span>`;
        tile.dataset.multiplier = multipliers[i];
        
        tile.addEventListener('click', async function() {
            // Désactiver tous les tiles
            const allTiles = document.querySelectorAll('.cash-hunt-tile');
            allTiles.forEach(t => {
                t.style.pointerEvents = 'none';
                t.style.opacity = '0.7';
                t.innerHTML = `<span style="font-size: 1.8rem;">x${t.dataset.multiplier}</span>`;
            });
            
            // Mettre en évidence le tile sélectionné
            this.style.opacity = '1';
            this.style.transform = 'scale(1.2)';
            this.style.boxShadow = '0 0 20px rgba(241, 196, 15, 0.7)';
            this.style.backgroundColor = '#f1c40f';
            this.style.color = 'black';
            this.style.fontWeight = 'bold';
            
            // Calculer le gain
            const multiplier = parseInt(this.dataset.multiplier);
            // Si c'est un test, utilisez une mise par défaut
            const betAmount = gameState.bets['cash-hunt'] || 50;
            const winAmount = betAmount * multiplier;
            
            // Ajouter le gain au solde
            await serverUpdateTransaction(winAmount, true);
            gameState.lastWin = winAmount;
            
            // Mettre à jour le solde dans la base de données
            await updateBalanceInDatabase(gameState.balance, 0, true);
            
            // Afficher le résultat
            setTimeout(() => {
                const resultDiv = document.createElement('div');
                resultDiv.innerHTML = `
                    <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                        <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">FÉLICITATIONS!</h2>
                        <p style="font-size: 1.5rem; margin-bottom: 1rem;">Multiplicateur: <span style="color: #f1c40f; font-weight: bold;">x${multiplier}</span></p>
                        <p style="font-size: 1.8rem; margin-bottom: 1.5rem;">Vous avez gagné <span style="color: #f1c40f; font-weight: bold;">${winAmount}€</span>!</p>
                        <button class="bonus-btn" id="close-bonus">CONTINUER</button>
                    </div>
                `;
                resultDiv.style.position = 'absolute';
                resultDiv.style.top = '50%';
                resultDiv.style.left = '50%';
                resultDiv.style.transform = 'translate(-50%, -50%)';
                resultDiv.style.zIndex = '150';
                resultDiv.style.width = '90%';
                resultDiv.style.maxWidth = '500px';
                
                container.appendChild(resultDiv);
                
                // Fermer le jeu bonus
                document.getElementById('close-bonus').addEventListener('click', () => {
                    document.getElementById('bonus-overlay').classList.remove('active');
                    resetForNextRound();
                    updateUI();
                });
            }, 2000);
        });
        
        grid.appendChild(tile);
    }
}

// Configuration du jeu bonus Coin Flip
function setupCoinFlip(container) {
    // Générer les multiplicateurs pour chaque face
    const redMultiplier = Math.floor(Math.random() * 100) + 50;
    const blueMultiplier = Math.floor(Math.random() * 100) + 50;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="margin-bottom: 2rem; color: #f1c40f;">La pièce va être lancée! Quelle face va apparaître?</h3>
            
            <div style="display: flex; justify-content: space-around; margin-bottom: 2rem;">
                <div style="text-align: center;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; color: white; box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);">
                        x${redMultiplier}
                    </div>
                    <p style="margin-top: 1rem; font-size: 1.5rem; color: #e74c3c;">Rouge</p>
                </div>
                
                <div style="text-align: center;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; color: white; box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);">
                        x${blueMultiplier}
                    </div>
                    <p style="margin-top: 1rem; font-size: 1.5rem; color: #3498db;">Bleu</p>
                </div>
            </div>
            
            <div id="coin-container">
                <div id="coin">
                    <div id="coin-front">
                        x${redMultiplier}
                    </div>
                    <div id="coin-back">
                        x${blueMultiplier}
                    </div>
                </div>
            </div>
            
            <button class="bonus-btn" id="flip-btn" style="margin-top: 2rem;">LANCER LA PIÈCE</button>
        </div>
    `;
    
    // Attachement de l'événement pour lancer la pièce
    document.getElementById('flip-btn').addEventListener('click', async function() {
        this.disabled = true;
        this.style.opacity = '0.5';
        
        const coin = document.getElementById('coin');
        const isHeads = Math.random() > 0.5;
        
        // Animation de la pièce (rotation complète de 720 degrés + le résultat)
        coin.style.transform = `rotateY(${720 + (isHeads ? 0 : 180)}deg)`;
        
        // Calculer les gains
        setTimeout(async () => {
            const winMultiplier = isHeads ? redMultiplier : blueMultiplier;
            // Si c'est un test, utilisez une mise par défaut
            const betAmount = gameState.bets['coin-flip'] || 50;
            const winAmount = betAmount * winMultiplier;
            
            // Ajouter le gain au solde
            await serverUpdateTransaction(winAmount, true);
            gameState.lastWin = winAmount;
            
            // Mettre à jour le solde dans la base de données
            await updateBalanceInDatabase(gameState.balance, 0, true);
            
            // Afficher le résultat
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `
                <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                    <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">RÉSULTAT</h2>
                    <p style="font-size: 1.5rem; margin-bottom: 1rem;">Face: <span style="color: ${isHeads ? '#e74c3c' : '#3498db'}; font-weight: bold;">${isHeads ? 'Rouge' : 'Bleu'}</span></p>
                    <p style="font-size: 1.5rem; margin-bottom: 1rem;">Multiplicateur: <span style="color: #f1c40f; font-weight: bold;">x${winMultiplier}</span></p>
                    <p style="font-size: 1.8rem; margin-bottom: 1.5rem;">Vous avez gagné <span style="color: #f1c40f; font-weight: bold;">${winAmount}€</span>!</p>
                    <button class="bonus-btn" id="close-bonus">CONTINUER</button>
                </div>
            `;
            resultDiv.style.position = 'absolute';
            resultDiv.style.top = '50%';
            resultDiv.style.left = '50%';
            resultDiv.style.transform = 'translate(-50%, -50%)';
            resultDiv.style.zIndex = '150';
            resultDiv.style.width = '90%';
            resultDiv.style.maxWidth = '500px';
            
            container.appendChild(resultDiv);
            
            // Fermer le jeu bonus
            document.getElementById('close-bonus').addEventListener('click', () => {
                document.getElementById('bonus-overlay').classList.remove('active');
                resetForNextRound();
                updateUI();
            });
        }, 3000);
    });
}

// Configuration du jeu bonus Pachinko
function setupPachinko(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <h3 style="margin-bottom: 1.5rem; color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);">
                Le palet va être lâché sur le mur de Pachinko!
            </h3>
            
            <div id="pachinko-board" style="box-shadow: 0 0 30px rgba(26, 188, 156, 0.5); border: 2px solid #16a085; overflow: hidden;">
                <div id="puck"></div>
                <div id="multipliers"></div>
                
                <!-- Éléments décoratifs pour le Pachinko -->
                <div style="position: absolute; top: 15px; left: 15px; font-size: 24px; color: rgba(255,255,255,0.2);">🎪</div>
                <div style="position: absolute; top: 15px; right: 15px; font-size: 24px; color: rgba(255,255,255,0.2);">🎪</div>
                <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 16px; color: rgba(255,255,255,0.5); font-weight: bold;">PACHINKO</div>
                <div class="pachinko-light" style="position: absolute; top: 5px; left: 5px; width: 8px; height: 8px; background: #e74c3c; border-radius: 50%;"></div>
                <div class="pachinko-light" style="position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; background: #3498db; border-radius: 50%;"></div>
            </div>
            
            <button class="bonus-btn" id="drop-btn" style="margin-top: 1.5rem; background: linear-gradient(to right, #16a085, #1abc9c); animation: pulse-button 2s infinite;">LÂCHER LE PALET</button>
        </div>
        
        <style>
            /* Styles spécifiques au Pachinko */
            #pachinko-board {
                width: 90%;
                height: 450px;
                margin: 2rem auto;
                background: linear-gradient(to bottom, #2c3e50, #1a1a2e);
                position: relative;
                border-radius: 15px;
            }
            
            #puck {
                width: 22px;
                height: 22px;
                background: radial-gradient(circle, #f1c40f, #f39c12);
                border-radius: 50%;
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                box-shadow: 0 0 15px rgba(241, 196, 15, 0.8);
                z-index: 20;
            }
            
            #multipliers {
                display: flex;
                position: absolute;
                bottom: 0;
                width: 100%;
                height: 70px;
            }
            
            #multipliers div {
                flex: 1;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 1.2rem;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                border-top: 3px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            #multipliers div:last-child {
                border-right: none;
            }
            
            #multipliers div:hover {
                transform: translateY(-3px);
                box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.3);
            }
            
            .peg {
                position: absolute;
                width: 12px;
                height: 12px;
                background: radial-gradient(circle, #ecf0f1, #bdc3c7);
                border-radius: 50%;
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
                z-index: 10;
            }
            
            @keyframes peg-pulse {
                0% { transform: scale(1); box-shadow: 0 0 3px rgba(255, 255, 255, 0.5); }
                50% { transform: scale(1.1); box-shadow: 0 0 8px rgba(255, 255, 255, 0.8); }
                100% { transform: scale(1); box-shadow: 0 0 3px rgba(255, 255, 255, 0.5); }
            }
            
            @keyframes pulse-button {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .pachinko-light {
                animation: blink 1.5s infinite alternate;
            }
            
            @keyframes blink {
                0% { opacity: 0.4; }
                100% { opacity: 1; }
            }
            
            .trail {
                position: absolute;
                width: 8px;
                height: 8px;
                background: rgba(241, 196, 15, 0.6);
                border-radius: 50%;
                z-index: 5;
                pointer-events: none;
            }
        </style>
    `;
    
    // Générer les multiplicateurs pour le bas du tableau
    const multiplierContainer = document.getElementById('multipliers');
    const multipliers = [];
    
    // Couleurs pour les multiplicateurs
    const colorClasses = [
        {bg: '#3498db', text: 'white'}, // bleu
        {bg: '#e74c3c', text: 'white'}, // rouge
        {bg: '#2ecc71', text: 'white'}, // vert
        {bg: '#9b59b6', text: 'white'}, // violet
        {bg: '#f39c12', text: 'black'}, // orange/jaune
        {bg: '#1abc9c', text: 'white'}, // turquoise
        {bg: '#e67e22', text: 'white'}, // orange foncé
        {bg: '#f1c40f', text: 'black'}  // jaune
    ];
    
    // Générer des multiplicateurs selon la distribution souhaitée
    for (let i = 0; i < 8; i++) {
        let multiplier;
        if (i < 4) {
            // 50% petits multiplicateurs (5x-50x)
            multiplier = Math.floor(Math.random() * 46) + 5;
        } else if (i < 6) {
            // 25% multiplicateurs moyens (75x-150x)
            multiplier = Math.floor(Math.random() * 76) + 75;
        } else if (i < 7) {
            // 12.5% gros multiplicateurs (200x-500x)
            multiplier = Math.floor(Math.random() * 301) + 200;
        } else {
            // 12.5% "DOUBLE" qui double tous les multiplicateurs
            multiplier = "DOUBLE";
        }
        
        multipliers.push(multiplier);
        
        const color = colorClasses[i % colorClasses.length];
        const isSpecial = multiplier === "DOUBLE" || multiplier >= 200;
        
        const multDiv = document.createElement('div');
        multDiv.style.flex = '1';
        multDiv.style.backgroundColor = isSpecial ? '#f39c12' : color.bg;
        multDiv.style.color = isSpecial ? 'black' : color.text;
        multDiv.style.transition = 'all 0.3s ease';
        multDiv.style.cursor = 'pointer';
        
        // Style spécial pour les valeurs élevées
        if (isSpecial) {
            multDiv.style.fontWeight = 'bold';
            multDiv.style.boxShadow = 'inset 0 0 15px rgba(255, 255, 255, 0.3)';
        }
        
        multDiv.textContent = multiplier === "DOUBLE" ? "DOUBLE" : `x${multiplier}`;
        multDiv.dataset.multiplier = multiplier;
        
        // Effet de survol
        multDiv.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 -5px 15px rgba(0, 0, 0, 0.5)';
        });
        
        multDiv.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
        
        multiplierContainer.appendChild(multDiv);
    }
    
    // Générer les chevilles du Pachinko
    const board = document.getElementById('pachinko-board');
    const pegRows = 6; // Plus de rangées
    const pegsPerRow = 9; // Plus de chevilles par rangée
    const pegs = [];
    
    for (let row = 0; row < pegRows; row++) {
        for (let col = 0; col < (row % 2 === 0 ? pegsPerRow : pegsPerRow - 1); col++) {
            const peg = document.createElement('div');
            peg.className = 'peg';
            
            // Calcul de la position en fonction de la rangée et de la colonne
            const xOffset = row % 2 === 0 ? 0 : (board.clientWidth / pegsPerRow) / 2;
            const pegSpacing = board.clientWidth / (pegsPerRow + 1);
            const x = xOffset + (col + 1) * pegSpacing; // +1 pour éviter les bords
            const y = 60 + row * 60;
            
            peg.style.left = `${x}px`;
            peg.style.top = `${y}px`;
            
            // Animation aléatoire pour certaines chevilles
            if (Math.random() < 0.2) {
                peg.style.animation = `peg-pulse ${2 + Math.random() * 3}s infinite`;
                peg.style.animationDelay = `${Math.random() * 2}s`;
            }
            
            // Taille légèrement variable pour plus de naturel
            const size = 10 + Math.random() * 4;
            peg.style.width = `${size}px`;
            peg.style.height = `${size}px`;
            
            board.appendChild(peg);
            pegs.push({
                element: peg,
                x: x,
                y: y,
                radius: size/2
            });
        }
    }
    
    // Attachement de l'événement pour lâcher le palet
    document.getElementById('drop-btn').addEventListener('click', function() {
        this.disabled = true;
        this.style.opacity = '0.5';
        this.style.animation = 'none';
        
        const puck = document.getElementById('puck');
        const boardRect = board.getBoundingClientRect();
        const multiplierDivs = document.querySelectorAll('#multipliers div');
        const multiplierWidth = multiplierDivs[0].offsetWidth;
        
        // Jouer un son au début (si supporté)
        playSound('drop');
        
        // Animation de chute du palet avec rebonds améliorés
        let posX = boardRect.width / 2;
        let posY = 0;
        let velocityX = 0;
        let velocityY = 2;
        let gravity = 0.2;
        let friction = 0.98;
        let dampening = 0.75; // Amortissement des rebonds
        let trails = []; // Tableau pour stocker les traces de la balle
        
        function createTrail(x, y) {
            if (Math.random() < 0.3) { // Ne pas créer une trace à chaque frame
                const trail = document.createElement('div');
                trail.className = 'trail';
                trail.style.left = `${x}px`;
                trail.style.top = `${y}px`;
                board.appendChild(trail);
                
                // Animer la disparition de la trace
                setTimeout(() => {
                    trail.style.opacity = '0';
                    setTimeout(() => {
                        trail.remove();
                    }, 300);
                }, 100);
                
                trails.push(trail);
            }
        }
        
        function playSound(type) {
            // Simuler un son (pourrait être remplacé par de vrais sons)
            try {
                let audio;
                switch(type) {
                    case 'drop':
                        audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwADMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAADwIxTDeleteRegularStart+c0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                        break;
                    case 'hit':
                        audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwADMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAADwIxTDeleteRegularStart+c0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                        break;
                    case 'win':
                        audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwADMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAADwIxTDeleteRegularStart+c0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                        break;
                }
                if (audio) {
                    audio.volume = 0.2; // Volume bas
                    audio.play().catch(e => console.log("Son non joué:", e));
                }
            } catch (e) {
                console.log("Erreur de son:", e);
            }
        }
        
        function checkPegCollision() {
            let collision = false;
            
            // Vérifier la collision avec chaque cheville
            for (let i = 0; i < pegs.length; i++) {
                const peg = pegs[i];
                const dx = posX - peg.x;
                const dy = posY - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = 11 + peg.radius; // Rayon du palet (11px) + rayon de la cheville
                
                if (distance < minDistance) {
                    // Calculer l'angle du vecteur entre le palet et la cheville
                    const angle = Math.atan2(dy, dx);
                    
                    // Ajuster la position pour éviter que le palet ne reste "collé" à la cheville
                    posX = peg.x + Math.cos(angle) * minDistance;
                    posY = peg.y + Math.sin(angle) * minDistance;
                    
                    // Calculer les nouvelles vélocités en fonction de l'angle d'impact
                    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
                    const directionX = Math.cos(angle);
                    const directionY = Math.sin(angle);
                    
                    // Ajouter une composante aléatoire pour plus de réalisme
                    velocityX = directionX * speed * dampening + (Math.random() - 0.5) * 0.5;
                    velocityY = directionY * speed * dampening + (Math.random() - 0.5) * 0.5;
                    
                    // Donner un effet visuel à la cheville touchée
                    peg.element.style.animation = 'peg-pulse 0.5s';
                    setTimeout(() => {
                        peg.element.style.animation = '';
                    }, 500);
                    
                    // Jouer un son de collision
                    playSound('hit');
                    
                    collision = true;
                    break;
                }
            }
            
            return collision;
        }
        
        function animate() {
            // Créer une trace de la trajectoire
            createTrail(posX, posY);
            
            // Vérifier les collisions avec les chevilles
            const hasCollided = checkPegCollision();
            
            // Appliquer la gravité
            velocityY += gravity;
            
            // Appliquer la friction
            velocityX *= friction;
            velocityY *= friction;
            
            // Mettre à jour la position
            posX += velocityX;
            posY += velocityY;
            
            // Collision avec les bords
            if (posX < 11) {
                posX = 11;
                velocityX = Math.abs(velocityX) * dampening;
                playSound('hit');
            } else if (posX > boardRect.width - 11) {
                posX = boardRect.width - 11;
                velocityX = -Math.abs(velocityX) * dampening;
                playSound('hit');
            }
            
            // Mise à jour de la position du palet
            puck.style.left = `${posX}px`;
            puck.style.top = `${posY}px`;
            
            // Effet de rotation (simulé par une transformation CSS)
            const rotation = (posX % 30) - 15; // Rotation légère basée sur la position X
            puck.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            
            // Vérifier si le palet a atteint le bas
            if (posY >= boardRect.height - 80) { // Ajusté pour la hauteur des multiplicateurs
                // Déterminer le multiplicateur atteint
                const multiplierIndex = Math.min(7, Math.max(0, Math.floor(posX / multiplierWidth)));
                const selectedMultiplier = multipliers[multiplierIndex];
                
                // Animation d'arrivée
                puck.style.transition = 'top 0.3s ease-out';
                puck.style.top = `${boardRect.height - 80}px`;
                
                // Mettre en évidence le multiplicateur sélectionné avec une animation
                multiplierDivs.forEach((div, index) => {
                    if (index === multiplierIndex) {
                        div.style.backgroundColor = '#f1c40f';
                        div.style.color = 'black';
                        div.style.fontWeight = 'bold';
                        div.style.transform = 'translateY(-10px) scale(1.1)';
                        div.style.boxShadow = '0 -10px 20px rgba(241, 196, 15, 0.5)';
                        div.style.borderTop = '3px solid #f1c40f';
                        div.style.zIndex = '50';
                    }
                });
                
                // Jouer un son de victoire
                playSound('win');
                
                // Traitement du résultat
                setTimeout(async () => {
                    if (selectedMultiplier === "DOUBLE") {
                        // Cas spécial: doubler tous les multiplicateurs et relancer
                        
                        // Animation pour doubler les valeurs
                        let animationPromises = [];
                        
                        multiplierDivs.forEach((div, index) => {
                            if (multipliers[index] !== "DOUBLE") {
                                animationPromises.push(new Promise(resolve => {
                                    // Animer la transition
                                    div.style.transform = 'scale(1.2)';
                                    div.style.transition = 'all 0.5s ease';
                                    
                                    setTimeout(() => {
                                        // Mettre à jour la valeur
                                        multipliers[index] *= 2;
                                        div.textContent = `x${multipliers[index]}`;
                                        div.style.backgroundColor = '#3498db';
                                        
                                        // Revenir à la normale
                                        setTimeout(() => {
                                            div.style.transform = 'scale(1)';
                                            resolve();
                                        }, 300);
                                    }, 200);
                                }));
                            }
                        });
                        
                        // Attendre que toutes les animations soient terminées
                        await Promise.all(animationPromises);
                        
                        // Message pour le DOUBLE avec animation
                        const doubleMessage = document.createElement('div');
                        doubleMessage.innerHTML = `
                            <div style="text-align: center; background: rgba(0,0,0,0.9); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7); transform: scale(0); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                                <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);">DOUBLE!</h2>
                                <p style="font-size: 1.5rem; margin-bottom: 1.5rem;">Tous les multiplicateurs sont doublés!</p>
                                <button class="bonus-btn" id="continue-pachinko" style="background: linear-gradient(to right, #f39c12, #f1c40f); animation: pulse-button 2s infinite; font-size: 1.2rem; padding: 1rem 2rem;">CONTINUER</button>
                            </div>
                        `;
                        doubleMessage.style.position = 'absolute';
                        doubleMessage.style.top = '50%';
                        doubleMessage.style.left = '50%';
                        doubleMessage.style.transform = 'translate(-50%, -50%)';
                        doubleMessage.style.zIndex = '150';
                        doubleMessage.style.width = '90%';
                        doubleMessage.style.maxWidth = '500px';
                        
                        container.appendChild(doubleMessage);
                        
                        // Animer l'apparition
                        setTimeout(() => {
                            doubleMessage.querySelector('div').style.transform = 'scale(1)';
                        }, 50);
                        
                        // Relancer le palet après un délai
                        document.getElementById('continue-pachinko').addEventListener('click', () => {
                            // Animation de disparition
                            doubleMessage.querySelector('div').style.transform = 'scale(0)';
                            
                            setTimeout(() => {
                                doubleMessage.remove();
                                
                                // Réinitialiser le palet
                                puck.style.transition = 'none';
                                posX = boardRect.width / 2;
                                posY = 0;
                                velocityX = 0;
                                velocityY = 2;
                                
                                puck.style.left = `${posX}px`;
                                puck.style.top = `${posY}px`;
                                puck.style.transform = 'translateX(-50%)';
                                
                                // Supprimer toutes les traces
                                trails.forEach(trail => trail.remove());
                                trails = [];
                                
                                // Réinitialiser l'apparence des multiplicateurs
                                multiplierDivs.forEach(div => {
                                    div.style.transform = '';
                                    div.style.boxShadow = '';
                                    div.style.borderTop = '3px solid rgba(255, 255, 255, 0.2)';
                                });
                                
                                // Relancer l'animation
                                requestAnimationFrame(animate);
                            }, 500);
                        });
                    } else {
                        // Calculer et afficher les gains
                        // Si c'est un test, utilisez une mise par défaut
                        const betAmount = gameState.bets['pachinko'] || 50;
                        const winAmount = betAmount * selectedMultiplier;
                        
                        // Ajouter le gain au solde
                        await serverUpdateTransaction(winAmount, true);
                        gameState.lastWin = winAmount;
                        
                        // Mettre à jour le solde dans la base de données
                        await updateBalanceInDatabase(gameState.balance, 0, true);
                        
                        // Créer l'animation de victoire avec confettis
                        const resultDiv = document.createElement('div');
                        resultDiv.innerHTML = `
                            <div class="win-result" style="text-align: center; background: rgba(0,0,0,0.9); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7); transform: scale(0); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                                <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);">FÉLICITATIONS!</h2>
                                <p style="font-size: 1.5rem; margin-bottom: 1rem;">Multiplicateur: <span style="color: #f1c40f; font-weight: bold;">x${selectedMultiplier}</span></p>
                                <p style="font-size: 1.8rem; margin-bottom: 1.5rem;">Vous avez gagné <span style="color: #f1c40f; font-weight: bold; animation: pulse-win 1s infinite alternate;">${winAmount}€</span>!</p>
                                <button class="bonus-btn" id="close-bonus" style="background: linear-gradient(to right, #f39c12, #f1c40f); animation: pulse-button 2s infinite; font-size: 1.2rem; padding: 1rem 2rem;">CONTINUER</button>
                            </div>
                            <style>
                                @keyframes pulse-win {
                                    0% { text-shadow: 0 0 10px rgba(241, 196, 15, 0.5); }
                                    100% { text-shadow: 0 0 20px rgba(241, 196, 15, 0.8); }
                                }
                                
                                .confetti {
                                    position: absolute;
                                    width: 10px;
                                    height: 10px;
                                    pointer-events: none;
                                    animation: fall linear;
                                }
                                
                                @keyframes fall {
                                    0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                                }
                            </style>
                        `;
                        resultDiv.style.position = 'absolute';
                        resultDiv.style.top = '50%';
                        resultDiv.style.left = '50%';
                        resultDiv.style.transform = 'translate(-50%, -50%)';
                        resultDiv.style.zIndex = '150';
                        resultDiv.style.width = '90%';
                        resultDiv.style.maxWidth = '500px';
                        
                        container.appendChild(resultDiv);
                        
                        // Animer l'apparition
                        setTimeout(() => {
                            resultDiv.querySelector('.win-result').style.transform = 'scale(1)';
                            
                            // Ajouter des confettis
                            for (let i = 0; i < 50; i++) {
                                setTimeout(() => {
                                    const confetti = document.createElement('div');
                                    confetti.className = 'confetti';
                                    confetti.style.left = Math.random() * 100 + '%';
                                    confetti.style.backgroundColor = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'][Math.floor(Math.random() * 5)];
                                    confetti.style.animationDuration = (3 + Math.random() * 2) + 's';
                                    document.body.appendChild(confetti);
                                    
                                    // Supprimer les confettis après leur animation
                                    setTimeout(() => {
                                        confetti.remove();
                                    }, 5000);
                                }, Math.random() * 500);
                            }
                        }, 50);
                        
                        // Fermer le jeu bonus
                        document.getElementById('close-bonus').addEventListener('click', () => {
                            // Animation de disparition
                            resultDiv.querySelector('.win-result').style.transform = 'scale(0)';
                            
                            setTimeout(() => {
                                document.getElementById('bonus-overlay').classList.remove('active');
                                resultDiv.remove();
                                resetForNextRound();
                                updateUI();
                            }, 500);
                        });
                    }
                }, 1000);
                
                return;
            }
            
            // Continuer l'animation
            requestAnimationFrame(animate);
        }
        
        // Lancer l'animation
        animate();
    });
}

// Configuration du jeu bonus Crazy Time
function setupCrazyTime(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <h3 style="margin-bottom: 1.5rem; color: #f1c40f;">Bienvenue au bonus Crazy Time! Choisissez une couleur:</h3>
            
            <div style="display: flex; justify-content: space-around; margin: 2rem 0;">
                <div id="blue-btn" class="color-btn" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                    <span>Bleu</span>
                </div>
                
                <div id="green-btn" class="color-btn" style="background: linear-gradient(135deg, #2ecc71, #27ae60);">
                    <span>Vert</span>
                </div>
                
                <div id="yellow-btn" class="color-btn" style="background: linear-gradient(135deg, #f1c40f, #f39c12); color: black;">
                    <span>Jaune</span>
                </div>
            </div>
            
            <div id="crazy-wheel-container" style="display: none;">
                <canvas id="crazy-wheel" width="400" height="400"></canvas>
                <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);">
                    <svg width="30" height="50" viewBox="0 0 30 50" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="15,0 0,25 15,50 30,25" fill="#e74c3c" />
                    </svg>
                </div>
            </div>
        </div>
    `;
    
    // Multiplicateurs possibles pour Crazy Time
    const possibleMultipliers = [
        25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 
        2000, 5000, "DOUBLE", "TRIPLE"
    ];
    
    // Génération des multiplicateurs pour la roue
    const wheelMultipliers = [];
    for (let i = 0; i < 15; i++) {
        if (i < 10) {
            // 67% valeurs normales
            const randomIndex = Math.floor(Math.random() * 10);
            wheelMultipliers.push(possibleMultipliers[randomIndex]);
        } else if (i < 13) {
            // 20% valeurs élevées
            const randomIndex = 8 + Math.floor(Math.random() * 3);
            wheelMultipliers.push(possibleMultipliers[randomIndex]);
        } else if (i < 14) {
            // 7% DOUBLE
            wheelMultipliers.push("DOUBLE");
        } else {
            // 7% TRIPLE
            wheelMultipliers.push("TRIPLE");
        }
    }
    
    // Mélanger les multiplicateurs
    shuffleArray(wheelMultipliers);
    
    // Variables pour la roue
    let selectedColor = null;
    let isSpinning = false;
    let spinAngle = 0;
    let spinSpeed = 0;
    
    // Événements pour les boutons de couleur
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        });
        
        btn.addEventListener('click', function() {
            // Désactiver tous les boutons
            colorBtns.forEach(b => {
                b.style.pointerEvents = 'none';
                b.style.opacity = '0.5';
            });
            
            // Mettre en évidence le bouton sélectionné
            this.style.opacity = '1';
            this.style.transform = 'scale(1.2)';
            this.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.7)';
            
            // Enregistrer la couleur sélectionnée
            if (this.id === 'blue-btn') selectedColor = 'blue';
            else if (this.id === 'green-btn') selectedColor = 'green';
            else selectedColor = 'yellow';
            
            // Afficher la roue et lancer la rotation
            document.getElementById('crazy-wheel-container').style.display = 'block';
            
            // Initialiser la roue
            const canvas = document.getElementById('crazy-wheel');
            const ctx = canvas.getContext('2d');
            
            // Dessiner la roue avec les multiplicateurs
            function drawWheel() {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = canvas.width / 2 - 10;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Dessiner le cercle extérieur doré
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
                ctx.fillStyle = '#f1c40f';
                ctx.fill();
                
                const segmentAngle = (Math.PI * 2) / wheelMultipliers.length;
                
                // Dessiner chaque segment
                for (let i = 0; i < wheelMultipliers.length; i++) {
                    const startAngle = i * segmentAngle + spinAngle;
                    const endAngle = (i + 1) * segmentAngle + spinAngle;
                    
                    // Couleur du segment alternée
                    let color;
                    if (i % 3 === 0) color = '#3498db'; // Bleu
                    else if (i % 3 === 1) color = '#2ecc71'; // Vert
                    else color = '#f1c40f'; // Jaune
                    
                    // Dessiner le segment
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                    ctx.closePath();
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.stroke();
                    
                    // Ajouter des rayons pour un effet visuel
                    if (i % 2 === 0) {
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, startAngle + segmentAngle * 0.1, startAngle + segmentAngle * 0.2);
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fill();
                    }
                    
                    // Ajouter le texte du multiplicateur
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate(startAngle + segmentAngle / 2);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = (i % 3 === 2) ? '#000000' : '#FFFFFF';
                    ctx.font = 'bold 16px Arial';
                    ctx.shadowColor = '#000';
                    ctx.shadowBlur = 4;
                    
                    const multiplier = wheelMultipliers[i];
                    const text = multiplier === "DOUBLE" || multiplier === "TRIPLE" ? multiplier : `x${multiplier}`;
                    
                    ctx.fillText(text, radius - 15, 5);
                    ctx.restore();
                }
                
                // Dessiner le cercle central
                ctx.beginPath();
                ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
                ctx.fillStyle = '#f1c40f';
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Ajouter "CRAZY TIME" au centre
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText("CRAZY", centerX, centerY - 8);
                ctx.fillText("TIME", centerX, centerY + 12);
            }
            
            // Animation de la roue
            function spinTheWheel() {
                if (!isSpinning) {
                    isSpinning = true;
                    spinSpeed = 0.2 + Math.random() * 0.1;
                    
                    function animate() {
                        spinAngle += spinSpeed;
                        spinSpeed *= 0.99;
                        
                        drawWheel();
                        
                        if (spinSpeed > 0.001) {
                            requestAnimationFrame(animate);
                        } else {
                            // Fin de l'animation
                            isSpinning = false;
                            
                            // Calculer le segment gagnant
                            const normalizedAngle = ((spinAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                            const segmentAngle = (Math.PI * 2) / wheelMultipliers.length;
                            const winningIndex = Math.floor(normalizedAngle / segmentAngle) % wheelMultipliers.length;
                            
                            // Récupérer le multiplicateur gagnant
                            const winningMultiplier = wheelMultipliers[winningIndex];
                            
                            // Déterminer si la couleur du joueur correspond à la couleur gagnante
                            const winningColor = winningIndex % 3 === 0 ? 'blue' : (winningIndex % 3 === 1 ? 'green' : 'yellow');
                            const hasColorMatch = selectedColor === winningColor;
                            
                            // Traitement du résultat
                            setTimeout(async () => {
                                if (winningMultiplier === "DOUBLE" || winningMultiplier === "TRIPLE") {
                                    // Cas spécial: multiplier tous les multiplicateurs et relancer
                                    const multiplier = winningMultiplier === "DOUBLE" ? 2 : 3;
                                    
                                    // Multiplier tous les multiplicateurs numériques
                                    for (let i = 0; i < wheelMultipliers.length; i++) {
                                        if (typeof wheelMultipliers[i] === 'number') {
                                            wheelMultipliers[i] *= multiplier;
                                        }
                                    }
                                    
                                    // Message pour le DOUBLE/TRIPLE
                                    const message = document.createElement('div');
                                    message.innerHTML = `
                                        <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                                            <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">${winningMultiplier}!</h2>
                                            <p style="font-size: 1.5rem; margin-bottom: 1.5rem;">Tous les multiplicateurs sont ${winningMultiplier === "DOUBLE" ? "doublés" : "triplés"}!</p>
                                            <button class="bonus-btn" id="continue-crazy-time">CONTINUER</button>
                                        </div>
                                    `;
                                    message.style.position = 'absolute';
                                    message.style.top = '50%';
                                    message.style.left = '50%';
                                    message.style.transform = 'translate(-50%, -50%)';
                                    message.style.zIndex = '150';
                                    message.style.width = '90%';
                                    message.style.maxWidth = '500px';
                                    
                                    container.appendChild(message);
                                    
                                    // Relancer la roue après un délai
                                    document.getElementById('continue-crazy-time').addEventListener('click', () => {
                                        message.remove();
                                        spinSpeed = 0.2 + Math.random() * 0.1;
                                        isSpinning = true;
                                        animate();
                                    });
                                } else {
                                    // Calculer les gains
                                    let winAmount = 0;
                                    
                                    // Si c'est un test, utilisez une mise par défaut
                                    const betAmount = gameState.bets['crazy-time'] || 50;
                                    
                                    if (hasColorMatch) {
                                        // Le joueur gagne le multiplicateur complet
                                        winAmount = betAmount * winningMultiplier;
                                    } else {
                                        // Le joueur gagne un pourcentage du multiplicateur (20%)
                                        winAmount = Math.floor(betAmount * winningMultiplier * 0.2);
                                    }
                                    
                                    // Ajouter le gain au solde
                                    await serverUpdateTransaction(winAmount, true);
                                    gameState.lastWin = winAmount;
                                    
                                    // Mettre à jour le solde dans la base de données
                                    await updateBalanceInDatabase(gameState.balance, 0, true);
                                    
                                    // Afficher le résultat
                                    const resultDiv = document.createElement('div');
                                    resultDiv.innerHTML = `
                                        <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                                            <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">RÉSULTAT</h2>
                                            <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">Votre couleur: <span style="color: ${selectedColor === 'blue' ? '#3498db' : (selectedColor === 'green' ? '#2ecc71' : '#f1c40f')}; font-weight: bold;">${selectedColor}</span></p>
                                            <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">Couleur gagnante: <span style="color: ${winningColor === 'blue' ? '#3498db' : (winningColor === 'green' ? '#2ecc71' : '#f1c40f')}; font-weight: bold;">${winningColor}</span></p>
                                            <p style="font-size: 1.5rem; margin-bottom: 1rem;">Multiplicateur: <span style="color: #f1c40f; font-weight: bold;">x${winningMultiplier}</span></p>
                                            <h3 style="font-size: 1.8rem; margin-bottom: 1.5rem; color: ${hasColorMatch ? '#f1c40f' : 'white'};">
                                                ${hasColorMatch ? 'MATCH PARFAIT!' : 'Pas de correspondance exacte'}
                                            </h3>
                                            <p style="font-size: 1.8rem; margin-bottom: 1.5rem;">Vous avez gagné <span style="color: #f1c40f; font-weight: bold;">${winAmount}€</span>!</p>
                                            <button class="bonus-btn" id="close-bonus">CONTINUER</button>
                                        </div>
                                    `;
                                    resultDiv.style.position = 'absolute';
                                    resultDiv.style.top = '50%';
                                    resultDiv.style.left = '50%';
                                    resultDiv.style.transform = 'translate(-50%, -50%)';
                                    resultDiv.style.zIndex = '150';
                                    resultDiv.style.width = '90%';
                                    resultDiv.style.maxWidth = '500px';
                                    
                                    container.appendChild(resultDiv);
                                    
                                    // Fermer le jeu bonus
                                    document.getElementById('close-bonus').addEventListener('click', () => {
                                        document.getElementById('bonus-overlay').classList.remove('active');
                                        resetForNextRound();
                                        updateUI();
                                    });
                                }
                            }, 1000);
                        }
                    }
                    
                    animate();
                }
            }
            
            // Dessiner la roue initiale
            drawWheel();
            
            // Lancer la rotation après un petit délai
            setTimeout(() => {
                spinTheWheel();
            }, 500);
        });
    });
}

// Fonction pour initialiser les boutons de test
function initTestButtons(segments) {
    const testButtons = document.querySelectorAll('.test-btn');
    
    testButtons.forEach(button => {
        button.addEventListener('click', function() {
            const gameType = this.dataset.game;
            startBonusGame(gameType);
        });
    });
}

// Réinitialiser les paris
function resetBets() {
    for (const betType in gameState.bets) {
        gameState.bets[betType] = 0;
    }
    gameState.totalBet = 0;
    
    // Mise à jour de l'interface
    updateBetDisplay();
}

// Réinitialisation pour le prochain tour
function resetForNextRound() {
    // Réactiver le bouton spin
    document.getElementById('spin-btn').disabled = false;
    document.getElementById('spin-btn').style.opacity = "1";
    
    // Réactiver le bouton remiser (s'il y a des mises précédentes)
    if (gameState.previousTotalBet > 0) {
        document.getElementById('rebet-btn').disabled = false;
        document.getElementById('rebet-btn').style.opacity = "1";
    }
    
    // Réinitialiser les paris
    resetBets();
    
    // Réactiver les boutons de mise
    toggleBetButtons(true);
    
    // Mise à jour de l'interface
    updateUI();
}

// Activer/désactiver les boutons de mise
function toggleBetButtons(enabled) {
    const betOptions = document.querySelectorAll('.bet-option');
    const chips = document.querySelectorAll('.chip');
    
    betOptions.forEach(option => {
        option.style.pointerEvents = enabled ? 'auto' : 'none';
        option.style.opacity = enabled ? '1' : '0.5';
    });
    
    chips.forEach(chip => {
        chip.style.pointerEvents = enabled ? 'auto' : 'none';
        chip.style.opacity = enabled ? '1' : '0.5';
    });
}

// Initialisation des contrôles de l'interface utilisateur
function initUIControls() {
    // Bouton pour faire tourner la roue
    document.getElementById('spin-btn').addEventListener('click', spinWheel);
    
    // Bouton pour remiser les mêmes paris
    document.getElementById('rebet-btn').addEventListener('click', reBet);
    
    // Sélecteur de jetons
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', function() {
            // Désélectionner tous les jetons
            document.querySelectorAll('.chip').forEach(c => {
                c.classList.remove('selected');
            });
            
            // Sélectionner le jeton cliqué
            this.classList.add('selected');
            
            // Mettre à jour la valeur du jeton
            gameState.currentChip = parseInt(this.dataset.value);
        });
    });
    
    // Options de paris
    document.querySelectorAll('.bet-option').forEach(option => {
        option.addEventListener('click', function() {
            const betType = this.dataset.bet;
            
            // Ajouter la mise
            gameState.bets[betType] += gameState.currentChip;
            gameState.totalBet += gameState.currentChip;
            
            // Mettre à jour l'affichage des mises
            updateBetDisplay();
            
            // Mettre à jour l'interface
            updateUI();
            
            // Effet visuel d'ajout de jeton
            const chipEffect = document.createElement('div');
            chipEffect.style.position = 'absolute';
            chipEffect.style.width = '30px';
            chipEffect.style.height = '30px';
            chipEffect.style.borderRadius = '50%';
            chipEffect.style.backgroundColor = getChipColor(gameState.currentChip);
            chipEffect.style.color = 'white';
            chipEffect.style.fontWeight = 'bold';
            chipEffect.style.display = 'flex';
            chipEffect.style.alignItems = 'center';
            chipEffect.style.justifyContent = 'center';
            chipEffect.style.fontSize = '0.8rem';
            chipEffect.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
            chipEffect.style.zIndex = '5';
            chipEffect.style.transition = 'all 0.3s ease';
            chipEffect.textContent = gameState.currentChip;
            
            // Position initiale du jeton (position du jeton sélectionné)
            const selectedChip = document.querySelector('.chip.selected');
            const chipRect = selectedChip.getBoundingClientRect();
            const optionRect = this.getBoundingClientRect();
            
            chipEffect.style.top = (chipRect.top + chipRect.height/2 - 15) + 'px';
            chipEffect.style.left = (chipRect.left + chipRect.width/2 - 15) + 'px';
            
            document.body.appendChild(chipEffect);
            
            // Animation du jeton vers l'option de mise
            setTimeout(() => {
                chipEffect.style.top = (optionRect.top + optionRect.height/2 - 15) + 'px';
                chipEffect.style.left = (optionRect.left + optionRect.width/2 - 15) + 'px';
                
                setTimeout(() => {
                    chipEffect.style.opacity = '0';
                    setTimeout(() => {
                        chipEffect.remove();
                    }, 300);
                }, 300);
            }, 10);
        });
    });
}

// Obtenir la couleur du jeton en fonction de sa valeur
function getChipColor(value) {
    switch (value) {
        case 1: return '#3498db';
        case 5: return '#e74c3c';
        case 10: return '#f1c40f';
        case 25: return '#9b59b6';
        case 50: return '#2ecc71';
        case 100: return '#fd79a8';
        default: return '#95a5a6';
    }
}

// Mise à jour de l'affichage des mises
function updateBetDisplay() {
    const betOptions = document.querySelectorAll('.bet-option');
    
    betOptions.forEach(option => {
        const betType = option.dataset.bet;
        const betAmount = option.querySelector('.bet-amount');
        
        betAmount.textContent = gameState.bets[betType] + '€';
        
        // Mise en évidence des options avec mise
        if (gameState.bets[betType] > 0) {
            option.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            option.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
        } else {
            option.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            option.style.boxShadow = 'none';
        }
    });
    
    // Mise à jour de la mise totale
    document.getElementById('total-bet').textContent = gameState.totalBet + '€';
}

// Mise à jour de l'interface
function updateUI() {
    // Mise à jour du solde
    document.getElementById('balance').textContent = gameState.balance + '€';
    
    // Mise à jour de la mise totale
    document.getElementById('total-bet').textContent = gameState.totalBet + '€';
    
    // Mise à jour du dernier gain
    document.getElementById('last-win').textContent = gameState.lastWin + '€';
    
    // Mise à jour du dernier résultat
    document.getElementById('last-result').textContent = gameState.lastResult;
    
    // Mise à jour du multiplicateur principal
    document.getElementById('top-multiplier').textContent = gameState.topMultiplier;
    
    // Mise à jour du prochain bonus (simulé de manière aléatoire)
    const bonusOptions = ['CASH HUNT', 'COIN FLIP', 'PACHINKO', 'CRAZY TIME'];
    if (gameState.nextBonus === '--') {
        gameState.nextBonus = bonusOptions[Math.floor(Math.random() * bonusOptions.length)];
    }
    document.getElementById('next-bonus').textContent = gameState.nextBonus;
}

// Fonction pour mélanger un tableau
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Polyfill pour GSAP (animation simple)
const gsap = {
    from: (target, props) => {
        const duration = props.duration || 1;
        const ease = props.ease || 'linear';
        
        // Animation simple pour rotation
        if ('rotation' in props) {
            const startRotation = props.rotation;
            const endRotation = target.rotation || 0;
            const startTime = Date.now();
            const endTime = startTime + duration * 1000;
            
            function animate() {
                const now = Date.now();
                const progress = Math.min(1, (now - startTime) / (endTime - startTime));
                
                // Fonction d'easing simple
                let easedProgress = progress;
                if (ease === 'power2.out') {
                    easedProgress = 1 - Math.pow(1 - progress, 2);
                } else if (ease === 'elastic.out(1, 0.5)') {
                    const p = 1 - progress;
                    easedProgress = 1 - p * Math.sin(progress * 10) * Math.exp(-progress * 4);
                }
                
                // Interpolation linéaire
                target.rotation = startRotation + (endRotation - startRotation) * easedProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }
            
            animate();
        }
        
        // Animation simple pour scale
        if ('scale' in props) {
            const startScale = { x: props.scale.x, y: props.scale.y };
            const endScale = { x: target.scale.x || 1, y: target.scale.y || 1 };
            const startTime = Date.now();
            const endTime = startTime + duration * 1000;
            
            function animate() {
                const now = Date.now();
                const progress = Math.min(1, (now - startTime) / (endTime - startTime));
                
                // Fonction d'easing simple
                let easedProgress = progress;
                if (ease === 'power2.out') {
                    easedProgress = 1 - Math.pow(1 - progress, 2);
                } else if (ease === 'elastic.out(1, 0.5)') {
                    const p = 1 - progress;
                    easedProgress = 1 - p * Math.sin(progress * 10) * Math.exp(-progress * 4);
                }
                
                // Interpolation linéaire
                target.scale.x = startScale.x + (endScale.x - startScale.x) * easedProgress;
                target.scale.y = startScale.y + (endScale.y - startScale.y) * easedProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }
            
            animate();
        }
    }
};

// Lancer le jeu
window.addEventListener('load', initGame);