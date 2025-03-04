<?php
require_once 'config.php';
// Démarrer la session
session_start();

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    header("Location: index.html");
    exit();
}

// Récupérer les informations utilisateur depuis la session
$user = $_SESSION['user'];
$userId = $user['id'];
$username = $user['username'];

// Récupérer le solde à jour directement depuis la base de données
try {
    $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $initialBalance = $result['balance'] ?? $user['balance'];
    
    // Mettre à jour la session avec le solde à jour
    $_SESSION['user']['balance'] = $initialBalance;
} catch (PDOException $e) {
    // En cas d'erreur, utiliser le solde en session
    $initialBalance = $user['balance'];
}

// Inclure la configuration de la base de données
require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crazy Time</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        /* Le CSS reste inchangé */
        :root {
            --primary-color: #6b2c91;
            --secondary-color: #e74c3c;
            --background-dark: #1e1e2e;
            --accent-color: #f1c40f;
            --text-light: #FFFFFF;
            --text-dark: #121212;
            --bonus-pink: #e84393;
            --bonus-blue: #00a8ff;
            --bonus-green: #4cd137;
            --bonus-orange: #fa8231;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: radial-gradient(circle, #2c3e50 0%, #1a1a2e 100%);
            color: var(--text-light);
            display: flex;
            flex-direction: column;
        }

        header {
            background: linear-gradient(to right, #6b2c91, #9b59b6);
            color: white;
            text-align: center;
            padding: 0.8rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10;
            position: sticky;
            top: 0;
        }

        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            color: var(--accent-color);
        }

        .game-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            position: relative;
            margin-bottom: 2rem;
        }

        .test-panel {
            width: 100%;
            max-width: 800px;
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .test-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 0.5rem;
        }

        .test-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
        }

        .test-btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 20px;
            background: linear-gradient(135deg, #333, #222);
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
            font-size: 0.9rem;
        }

        .test-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .top-display {
            width: 100%;
            max-width: 800px;
            height: 120px;
            background: #333;
            border: 5px solid #f1c40f;
            border-radius: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 1rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
        }

        .top-display-content {
            display: flex;
            justify-content: space-around;
            align-items: center;
            width: 100%;
            height: 100%;
        }

        .display-item {
            width: 33.33%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 0.5rem;
            border-right: 2px solid #f1c40f;
        }

        .display-item:last-child {
            border-right: none;
        }

        .display-item-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: #f1c40f;
            margin-bottom: 0.5rem;
        }

        .display-item-value {
            font-size: 2rem;
            font-weight: bold;
            color: #fff;
        }

        .wheel-container {
            position: relative;
            width: 70vmin;
            height: 70vmin;
            max-width: 500px;
            max-height: 500px;
            margin: 1rem auto;
        }

        #wheel-canvas {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }

        .wheel-pointer {
            position: absolute;
            width: 40px;
            height: 40px;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7));
            z-index: 100;
        }

        .wheel-pointer svg {
            width: 100%;
            height: 100%;
        }

        .bet-controls {
            width: 100%;
            max-width: 800px;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 1rem;
        }

        .bet-options {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            width: 100%;
        }

        .bet-option {
            position: relative;
            width: calc(25% - 0.5rem);
            aspect-ratio: 3/2;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
            padding: 0.5rem;
        }

        .bet-option:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .bet-option:active {
            transform: translateY(1px);
        }

        .bet-option-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            text-align: center;
            z-index: 2;
        }

        .bet-amount {
            position: absolute;
            bottom: 5px;
            right: 5px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 0.8rem;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 10px;
            z-index: 2;
        }

        .bet-controls-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-top: 1rem;
        }

        .chip-selector {
            display: flex;
            gap: 0.3rem;
        }

        .chip {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .chip:hover {
            transform: scale(1.1);
        }

        .chip.selected {
            border-color: white;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .chip-1 { background: linear-gradient(135deg, #3498db, #2980b9); }
        .chip-5 { background: linear-gradient(135deg, #e74c3c, #c0392b); }
        .chip-10 { background: linear-gradient(135deg, #f1c40f, #f39c12); }
        .chip-25 { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
        .chip-50 { background: linear-gradient(135deg, #2ecc71, #27ae60); }
        .chip-100 { background: linear-gradient(135deg, #fd79a8, #e84393); }

        .bet-x1 { background: linear-gradient(135deg, #7f8c8d, #95a5a6); }
        .bet-x2 { background: linear-gradient(135deg, #c0392b, #e74c3c); }
        .bet-x5 { background: linear-gradient(135deg, #27ae60, #2ecc71); }
        .bet-x10 { background: linear-gradient(135deg, #2980b9, #3498db); }
        .bet-cash-hunt { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
        .bet-coin-flip { background: linear-gradient(135deg, #f39c12, #f1c40f); }
        .bet-pachinko { background: linear-gradient(135deg, #16a085, #1abc9c); }
        .bet-crazy-time { background: linear-gradient(135deg, #d35400, #e67e22); }

        .bet-badge {
            position: absolute;
            top: 5px;
            left: 5px;
            background-color: var(--accent-color);
            color: black;
            font-size: 0.8rem;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 10px;
            z-index: 2;
        }

        .action-buttons {
            display: flex;
            gap: 1rem;
        }

        .spin-btn, .rebet-btn {
            background: linear-gradient(to right, #e74c3c, #f39c12);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 0.8rem 2rem;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        }

        .rebet-btn {
            background: linear-gradient(to right, #9b59b6, #8e44ad);
        }

        .spin-btn:hover, .rebet-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }

        .spin-btn:active, .rebet-btn:active {
            transform: translateY(1px);
        }

        .game-info {
            display: flex;
            justify-content: space-between;
            width: 100%;
            max-width: 800px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            padding: 0.8rem;
            margin-top: 1rem;
        }

        .info-item {
            text-align: center;
        }

        .info-label {
            font-size: 0.8rem;
            color: #ccc;
        }

        .info-value {
            font-size: 1.2rem;
            font-weight: bold;
            color: white;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .overlay.active {
            opacity: 1;
            pointer-events: all;
        }

        .bonus-game {
            background: radial-gradient(circle, #2c3e50 0%, #1a1a2e 100%);
            width: 90%;
            max-width: 800px;
            height: 80%;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 0 30px rgba(241, 196, 15, 0.7);
            position: relative;
            overflow: auto; /* Permettre le défilement à l'intérieur des bonus si nécessaire */
        }

        .bonus-title {
            text-align: center;
            margin-bottom: 1rem;
            font-size: 2rem;
            color: var(--accent-color);
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        /* Cash Hunt Specific Styles */
        #cash-hunt-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin-top: 1rem;
        }

        .cash-hunt-tile {
            background-color: #333;
            color: white;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            transform: scale(1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .cash-hunt-tile:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        /* Coin Flip Specific Styles */
        #coin-container {
            width: 200px;
            height: 200px;
            position: relative;
            margin: 0 auto;
            perspective: 1000px;
        }

        #coin {
            width: 100%;
            height: 100%;
            position: absolute;
            transform-style: preserve-3d;
            transition: transform 3s ease-out;
        }

        #coin-front, #coin-back {
            width: 100%;
            height: 100%;
            position: absolute;
            border-radius: 50%;
            backface-visibility: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: bold;
            color: white;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
        }

        #coin-front {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        #coin-back {
            background: linear-gradient(135deg, #3498db, #2980b9);
            transform: rotateY(180deg);
        }

        /* Pachinko Specific Styles */
        #pachinko-board {
            width: 80%;
            height: 400px;
            margin: 2rem auto;
            background-color: #2c3e50;
            position: relative;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }

        #puck {
            width: 20px;
            height: 20px;
            background-color: #f1c40f;
            border-radius: 50%;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            box-shadow: 0 0 10px rgba(241, 196, 15, 0.7);
        }

        #multipliers {
            display: flex;
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 60px;
        }

        #multipliers div {
            flex: 1;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            border-right: 1px solid #2c3e50;
        }

        /* Crazy Time Specific Styles */
        .color-btn {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
            margin: 0 1rem;
        }

        .color-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        }

        .color-btn span {
            font-size: 1.2rem;
            font-weight: bold;
        }

        #crazy-wheel-container {
            margin: 2rem auto;
            width: 400px;
            height: 400px;
            position: relative;
        }

        .bonus-btn {
            background: linear-gradient(to right, #f1c40f, #f39c12);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 0.8rem 2rem;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            margin-top: 1.5rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        }

        .bonus-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }

        @keyframes winPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .win-animation {
            animation: winPulse 0.5s ease-in-out 3;
        }

        .rebet-animation {
            animation: rebetPulse 0.4s ease-in-out;
        }

        @keyframes rebetPulse {
            0% { transform: scale(1); background-color: rgba(155, 89, 182, 0.5); }
            50% { transform: scale(1.1); background-color: rgba(155, 89, 182, 0.8); }
            100% { transform: scale(1); background-color: transparent; }
        }

        @media (max-width: 768px) {
            .bet-option {
                width: calc(50% - 0.5rem);
            }

            .wheel-container {
                width: 80vmin;
                height: 80vmin;
            }

            .top-display {
                height: 100px;
            }

            .display-item-title {
                font-size: 0.9rem;
            }

            .display-item-value {
                font-size: 1.5rem;
            }

            .chip {
                width: 35px;
                height: 35px;
                font-size: 0.8rem;
            }

            .game-info {
                flex-wrap: wrap;
            }

            .info-item {
                width: 48%;
                margin-bottom: 0.5rem;
            }

            .action-buttons {
                flex-direction: column;
                width: 100%;
            }

            .spin-btn, .rebet-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <header>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 1rem;">
            <button onclick="window.location.href='menu.php'" style="background: linear-gradient(to right, #3498db, #2980b9); color: white; border: none; border-radius: 5px; padding: 8px 15px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                ← Menu
            </button>
            <div class="logo">
                <h1>CRAZY TIME</h1>
            </div>
            <div style="width: 80px;"><!-- espace équilibré --></div>
        </div>
    </header>

    <div class="game-container">
        <!-- Panneau de test pour les mini-jeux -->
        <div class="test-panel">
            <div class="test-title">MODE TEST - MINI-JEUX</div>
            <div class="test-buttons">
                <button class="test-btn" data-game="cash-hunt">Cash Hunt</button>
                <button class="test-btn" data-game="coin-flip">Coin Flip</button>
                <button class="test-btn" data-game="pachinko">Pachinko</button>
                <button class="test-btn" data-game="crazy-time">Crazy Time</button>
            </div>
        </div>

        <div class="top-display">
            <div class="top-display-content">
                <div class="display-item">
                    <div class="display-item-title">MULTIPLICATEUR TOP</div>
                    <div class="display-item-value" id="top-multiplier">x1</div>
                </div>
                <div class="display-item">
                    <div class="display-item-title">DERNIER RÉSULTAT</div>
                    <div class="display-item-value" id="last-result">--</div>
                </div>
                <div class="display-item">
                    <div class="display-item-title">PROCHAIN BONUS</div>
                    <div class="display-item-value" id="next-bonus">--</div>
                </div>
            </div>
        </div>

        <div class="wheel-container">
            <canvas id="wheel-canvas"></canvas>
            <div class="wheel-pointer">
                <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="20,0 0,20 20,40 40,20" fill="#e74c3c" stroke="#fff" stroke-width="2"/>
                </svg>
            </div>
        </div>

        <div class="bet-controls">
            <div class="bet-options">
                <div class="bet-option bet-x1" data-bet="x1">
                    <div class="bet-badge">x1</div>
                    <div class="bet-option-title">1</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-x2" data-bet="x2">
                    <div class="bet-badge">x2</div>
                    <div class="bet-option-title">2</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-x5" data-bet="x5">
                    <div class="bet-badge">x5</div>
                    <div class="bet-option-title">5</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-x10" data-bet="x10">
                    <div class="bet-badge">x10</div>
                    <div class="bet-option-title">10</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-cash-hunt" data-bet="cash-hunt">
                    <div class="bet-badge">BONUS</div>
                    <div class="bet-option-title">CASH HUNT</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-coin-flip" data-bet="coin-flip">
                    <div class="bet-badge">BONUS</div>
                    <div class="bet-option-title">COIN FLIP</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-pachinko" data-bet="pachinko">
                    <div class="bet-badge">BONUS</div>
                    <div class="bet-option-title">PACHINKO</div>
                    <div class="bet-amount">0€</div>
                </div>
                <div class="bet-option bet-crazy-time" data-bet="crazy-time">
                    <div class="bet-badge">BONUS</div>
                    <div class="bet-option-title">CRAZY TIME</div>
                    <div class="bet-amount">0€</div>
                </div>
            </div>

            <div class="bet-controls-bottom">
                <div class="chip-selector">
                    <div class="chip chip-1" data-value="1">1€</div>
                    <div class="chip chip-5" data-value="5">5€</div>
                    <div class="chip chip-10 selected" data-value="10">10€</div>
                    <div class="chip chip-25" data-value="25">25€</div>
                    <div class="chip chip-50" data-value="50">50€</div>
                    <div class="chip chip-100" data-value="100">100€</div>
                </div>
                <div class="action-buttons">
                    <button id="rebet-btn" class="rebet-btn">REMISER</button>
                    <button id="spin-btn" class="spin-btn">TOURNER LA ROUE</button>
                </div>
            </div>
        </div>

        <div class="game-info">
            <div class="info-item">
                <div class="info-label">SOLDE</div>
                <div class="info-value" id="balance"><?php echo $initialBalance; ?>€</div>
            </div>
            <div class="info-item">
                <div class="info-label">MISE TOTALE</div>
                <div class="info-value" id="total-bet">0€</div>
            </div>
            <div class="info-item">
                <div class="info-label">DERNIER GAIN</div>
                <div class="info-value" id="last-win">0€</div>
            </div>
        </div>
        
        <!-- Bouton pour revenir au menu (conservé en bas de page également) -->
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.location.href='menu.php'" style="padding: 10px 20px; background: linear-gradient(to right, #6b2c91, #9b59b6); border: none; border-radius: 5px; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                Retourner au menu
            </button>
        </div>
    </div>

    <div class="overlay" id="bonus-overlay">
        <div class="bonus-game" id="bonus-game-container">
            <h2 class="bonus-title" id="bonus-title">Cash Hunt</h2>
            <div id="bonus-content"></div>
        </div>
    </div>

    <!-- Données utilisateur pour JavaScript -->
    <script>
        // Transmettre les données utilisateur au JavaScript
        const userData = {
            id: <?php echo $userId; ?>,
            username: "<?php echo $username; ?>",
            initialBalance: <?php echo $initialBalance; ?>
        };
    </script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js"></script>
    <script src="assets/js/scriptcrazytime.js"></script>
</body>
</html>