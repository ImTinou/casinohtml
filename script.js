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
    balance: 1000,
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
    text.rotation = Math.PI / 2 + textAngle;
    
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
                iconText = '🪙';
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
function spinWheel() {
    if (!gameState.isSpinning) {
        // Vérifier si le joueur a assez d'argent
        if (gameState.totalBet > gameState.balance) {
            alert("Votre solde est insuffisant !");
            return;
        }
        
        // Vérifier s'il y a au moins une mise
        if (gameState.totalBet === 0) {
            alert("Veuillez placer au moins une mise avant de tourner la roue !");
            return;
        }
        
        // Sauvegarder les mises actuelles pour la fonction "remiser"
        saveBets();
        
        gameState.isSpinning = true;
        gameState.spinSpeed = 15 + Math.random() * 10; // Vitesse aléatoire
        
        // Déduire les mises du solde
        gameState.balance -= gameState.totalBet;
        
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
}

// Fonction pour sauvegarder les mises actuelles
function saveBets() {
    gameState.previousTotalBet = gameState.totalBet;
    
    for (const betType in gameState.bets) {
        gameState.previousBets[betType] = gameState.bets[betType];
    }
}

// Fonction pour remettre les mises précédentes
function reBet() {
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
function processResult(segmentType) {
    // Mise à jour du dernier résultat
    gameState.lastResult = SEGMENT_LABELS[segmentType];
    
    // Vérifier si le joueur a gagné
    if (gameState.bets[segmentType] > 0) {
        let winAmount = 0;
        
        // Calcul des gains en fonction du type de segment
        switch (segmentType) {
            case 'x1':
                winAmount = gameState.bets[segmentType] * 1;
                break;
            case 'x2':
                winAmount = gameState.bets[segmentType] * 2;
                break;
            case 'x5':
                winAmount = gameState.bets[segmentType] * 5;
                break;
            case 'x10':
                winAmount = gameState.bets[segmentType] * 10;
                break;
            case 'cash-hunt':
            case 'coin-flip':
            case 'pachinko':
            case 'crazy-time':
                // Lancer le jeu bonus
                startBonusGame(segmentType);
                return; // Sortir de la fonction pour traiter le bonus séparément
        }
        
        // Ajouter les gains au solde
        gameState.balance += winAmount;
        gameState.lastWin = winAmount;
        
        // Afficher l'animation de gain
        showWinAnimation(winAmount);
    } else {
        gameState.lastWin = 0;
        document.getElementById('last-win').textContent = "0€";
        
        // Réinitialiser pour le prochain tour
        resetForNextRound();
    }
    
    // Mettre à jour l'historique
    gameState.history.unshift(segmentType);
    if (gameState.history.length > 10) {
        gameState.history.pop();
    }
    
    // Activer le bouton remiser
    document.getElementById('rebet-btn').disabled = false;
    document.getElementById('rebet-btn').style.opacity = "1";
    
    // Mettre à jour l'interface
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
        
        tile.addEventListener('click', function() {
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
            gameState.balance += winAmount;
            gameState.lastWin = winAmount;
            
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
    document.getElementById('flip-btn').addEventListener('click', function() {
        this.disabled = true;
        this.style.opacity = '0.5';
        
        const coin = document.getElementById('coin');
        const isHeads = Math.random() > 0.5;
        
        // Animation de la pièce (rotation complète de 720 degrés + le résultat)
        coin.style.transform = `rotateY(${720 + (isHeads ? 0 : 180)}deg)`;
        
        // Calculer les gains
        setTimeout(() => {
            const winMultiplier = isHeads ? redMultiplier : blueMultiplier;
            // Si c'est un test, utilisez une mise par défaut
            const betAmount = gameState.bets['coin-flip'] || 50;
            const winAmount = betAmount * winMultiplier;
            
            // Ajouter le gain au solde
            gameState.balance += winAmount;
            gameState.lastWin = winAmount;
            
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
            <h3 style="margin-bottom: 1.5rem; color: #f1c40f;">Le palet va être lâché sur le mur de Pachinko!</h3>
            
            <div id="pachinko-board">
                <div id="puck"></div>
                <div id="multipliers"></div>
            </div>
            
            <button class="bonus-btn" id="drop-btn" style="margin-top: 1.5rem;">LÂCHER LE PALET</button>
        </div>
    `;
    
    // Générer les multiplicateurs pour le bas du tableau
    const multiplierContainer = document.getElementById('multipliers');
    const multipliers = [];
    
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
        
        const multDiv = document.createElement('div');
        multDiv.style.flex = '1';
        multDiv.style.backgroundColor = multiplier === "DOUBLE" ? '#f39c12' : '#3498db';
        multDiv.textContent = multiplier === "DOUBLE" ? "DOUBLE" : `x${multiplier}`;
        multDiv.dataset.multiplier = multiplier;
        
        multiplierContainer.appendChild(multDiv);
    }
    
    // Générer les chevilles du Pachinko
    const board = document.getElementById('pachinko-board');
    const pegRows = 5;
    const pegsPerRow = 7;
    
    for (let row = 0; row < pegRows; row++) {
        for (let col = 0; col < (row % 2 === 0 ? pegsPerRow : pegsPerRow - 1); col++) {
            const peg = document.createElement('div');
            peg.style.width = '10px';
            peg.style.height = '10px';
            peg.style.backgroundColor = '#ecf0f1';
            peg.style.borderRadius = '50%';
            peg.style.position = 'absolute';
            
            // Calcul de la position en fonction de la rangée et de la colonne
            const xOffset = row % 2 === 0 ? 0 : (board.clientWidth / pegsPerRow) / 2;
            const pegSpacing = board.clientWidth / pegsPerRow;
            const x = xOffset + col * pegSpacing;
            const y = 60 + row * 60;
            
            peg.style.left = `${x}px`;
            peg.style.top = `${y}px`;
            
            board.appendChild(peg);
        }
    }
    
    // Attachement de l'événement pour lâcher le palet
    document.getElementById('drop-btn').addEventListener('click', function() {
        this.disabled = true;
        this.style.opacity = '0.5';
        
        const puck = document.getElementById('puck');
        const boardRect = board.getBoundingClientRect();
        const multiplierDivs = document.querySelectorAll('#multipliers div');
        const multiplierWidth = multiplierDivs[0].offsetWidth;
        
        // Animation de chute du palet avec rebonds aléatoires
        let posX = boardRect.width / 2;
        let posY = 0;
        let velocityX = 0;
        let velocityY = 2;
        
        function animate() {
            // Mise à jour de la position
            posX += velocityX;
            posY += velocityY;
            
            // Collision avec les bords
            if (posX < 10) {
                posX = 10;
                velocityX = Math.abs(velocityX) * 0.8;
            } else if (posX > boardRect.width - 10) {
                posX = boardRect.width - 10;
                velocityX = -Math.abs(velocityX) * 0.8;
            }
            
            // Augmentation de la vitesse de chute
            velocityY += 0.2;
            
            // Simuler des rebonds aléatoires sur les chevilles
            if (posY < boardRect.height - 70 && Math.random() < 0.1) {
                velocityX += (Math.random() - 0.5) * 3;
            }
            
            // Mise à jour de la position du palet
            puck.style.left = `${posX}px`;
            puck.style.top = `${posY}px`;
            
            // Vérifier si le palet a atteint le bas
            if (posY >= boardRect.height - 25) {
                posY = boardRect.height - 25;
                
                // Déterminer le multiplicateur atteint
                const multiplierIndex = Math.min(7, Math.max(0, Math.floor(posX / multiplierWidth)));
                const selectedMultiplier = multipliers[multiplierIndex];
                
                // Mettre en évidence le multiplicateur sélectionné
                multiplierDivs.forEach((div, index) => {
                    if (index === multiplierIndex) {
                        div.style.backgroundColor = '#f1c40f';
                        div.style.color = 'black';
                        div.style.fontWeight = 'bold';
                        div.style.transform = 'scale(1.1)';
                    }
                });
                
                // Traitement du résultat
                setTimeout(() => {
                    if (selectedMultiplier === "DOUBLE") {
                        // Cas spécial: doubler tous les multiplicateurs et relancer
                        multiplierDivs.forEach((div, index) => {
                            if (multipliers[index] !== "DOUBLE") {
                                multipliers[index] *= 2;
                                div.textContent = `x${multipliers[index]}`;
                                div.style.backgroundColor = '#3498db';
                            }
                        });
                        
                        // Message pour le DOUBLE
                        const doubleMessage = document.createElement('div');
                        doubleMessage.innerHTML = `
                            <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                                <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">DOUBLE!</h2>
                                <p style="font-size: 1.5rem; margin-bottom: 1.5rem;">Tous les multiplicateurs sont doublés!</p>
                                <button class="bonus-btn" id="continue-pachinko">CONTINUER</button>
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
                        
                        // Relancer le palet après un délai
                        document.getElementById('continue-pachinko').addEventListener('click', () => {
                            doubleMessage.remove();
                            posX = boardRect.width / 2;
                            posY = 0;
                            velocityX = 0;
                            velocityY = 2;
                            
                            puck.style.left = `${posX}px`;
                            puck.style.top = `${posY}px`;
                            
                            // Relancer l'animation
                            requestAnimationFrame(animate);
                        });
                    } else {
                        // Calculer et afficher les gains
                        // Si c'est un test, utilisez une mise par défaut
                        const betAmount = gameState.bets['pachinko'] || 50;
                        const winAmount = betAmount * selectedMultiplier;
                        
                        // Ajouter le gain au solde
                        gameState.balance += winAmount;
                        gameState.lastWin = winAmount;
                        
                        const resultDiv = document.createElement('div');
                        resultDiv.innerHTML = `
                            <div style="text-align: center; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 20px; box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);">
                                <h2 style="color: #f1c40f; font-size: 2.5rem; margin-bottom: 1rem;">FÉLICITATIONS!</h2>
                                <p style="font-size: 1.5rem; margin-bottom: 1rem;">Multiplicateur: <span style="color: #f1c40f; font-weight: bold;">x${selectedMultiplier}</span></p>
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
                            setTimeout(() => {
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
                                    gameState.balance += winAmount;
                                    gameState.lastWin = winAmount;
                                    
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

import { inject } from '@vercel/analytics';

// Activer l'analyse
inject();


// Lancer le jeu
window.addEventListener('load', initGame);