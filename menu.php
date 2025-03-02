<?php
session_start();
if (!isset($_SESSION['user'])) {
    header("Location: index.html");
    exit();
}
$user = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Casino - Menu</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      background: radial-gradient(circle, #2c3e50 0%, #1a1a2e 100%);
      color: #fff;
      margin: 0;
      padding: 0;
    }
    header {
      background: linear-gradient(to right, #6b2c91, #9b59b6);
      color: white;
      text-align: center;
      padding: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      position: sticky;
      top: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title {
      flex-grow: 1;
      text-align: center;
    }
    .logout-btn {
      background: linear-gradient(to right, #e74c3c, #c0392b);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      font-size: 0.9rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      margin-right: 15px;
    }
    .logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    /* Styles pour le portefeuille */
    .wallet-container {
      position: relative;
      display: inline-block;
      margin-right: 15px;
      cursor: pointer;
    }
    .wallet-icon {
      font-size: 1.5rem;
    }
    .wallet-dropdown {
      display: none;
      position: absolute;
      right: 0;
      top: 120%;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 5px;
      min-width: 150px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 1;
    }
    .wallet-dropdown a {
      color: #fff;
      padding: 0.5rem 1rem;
      text-decoration: none;
      display: block;
      transition: background 0.3s;
    }
    .wallet-dropdown a:hover {
      background: rgba(255,255,255,0.1);
    }
    .wallet-container:hover .wallet-dropdown {
      display: block;
    }
    .menu-container {
      max-width: 600px;
      margin: 5rem auto;
      background: rgba(0, 0, 0, 0.7);
      padding: 2rem;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .menu-container h2 {
      color: #f1c40f;
      margin-bottom: 1rem;
    }
    .menu-container p {
      margin-bottom: 2rem;
      font-size: 1.2rem;
    }
    .game-button {
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      background: linear-gradient(to right, #e74c3c, #f39c12);
      color: white;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 1rem;
      display: block;
      width: 100%;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
    }
    .game-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.4);
    }
    .user-stats {
      margin-top: 2rem;
      background: rgba(0, 0, 0, 0.5);
      padding: 1rem;
      border-radius: 10px;
    }
    .user-stats h3 {
      color: #f1c40f;
      margin-bottom: 0.5rem;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .stat-item {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.8rem;
      border-radius: 8px;
    }
    .stat-item .label {
      font-size: 0.9rem;
      color: #ccc;
      margin-bottom: 0.3rem;
    }
    .stat-item .value {
      font-size: 1.3rem;
      font-weight: bold;
      color: #fff;
    }
    /* Style pour la barre de progression */
    .progress-container {
      margin-top: 1rem;
      background: rgba(255,255,255,0.2);
      border-radius: 5px;
      overflow: hidden;
      height: 20px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(to right, #ffd700, #ffc107);
      width: 0;
      transition: width 0.5s ease-in-out;
    }
    .progress-text {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #ccc;
    }
    /* Style pour les formulaires de dépôt et retrait dans la page principale */
    .transaction-container {
      margin-top: 2rem;
      background: rgba(0, 0, 0, 0.5);
      padding: 1rem;
      border-radius: 10px;
    }
    .transaction-container h3 {
      margin-bottom: 1rem;
      color: #f1c40f;
    }
    .transaction-container form {
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .transaction-container input[type="number"] {
      padding: 0.5rem;
      border: none;
      border-radius: 5px;
      margin-right: 0.5rem;
      width: 70%;
      max-width: 200px;
    }
    .transaction-container button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 5px;
      background: linear-gradient(to right, #27ae60, #2ecc71);
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }
    .transaction-container button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <header>
    <div class="header-title">
      <h1>Casino</h1>
    </div>
    <!-- Portefeuille dans l'en-tête -->
    <div class="wallet-container">
      <span class="wallet-icon">💰</span>
      <div class="wallet-dropdown">
        <a href="deposit.php">Déposer</a>
        <a href="withdraw.php">Retirer</a>
      </div>
    </div>
    <button onclick="window.location.href='logout.php'" class="logout-btn">Déconnexion</button>
  </header>
  <div class="menu-container">
    <h2>Bienvenue, <?php echo htmlspecialchars($user['username']); ?>!</h2>
    <p>Solde : <?php echo htmlspecialchars($user['balance']); ?> €</p>
    
    <!-- Section VIP -->
    <?php if ($user['vip'] == 1): ?>
      <div class="vip-banner" style="margin-top: 2rem; padding: 1rem; background: linear-gradient(to right, #ffd700, #ffc107); border-radius: 10px; color: #000;">
        <h3>Félicitations VIP!</h3>
        <p>Vous bénéficiez maintenant d'avantages exclusifs, comme des bonus et des offres personnalisées.</p>
      </div>
    <?php endif; ?>

    <!-- Barre de progression vers le statut VIP -->
    <?php
      $seuilVIP = 500; // Seuil requis pour débloquer le statut VIP
      $progress = min(100, ($user['spend_money'] / $seuilVIP) * 100);
    ?>
    <div class="progress-container">
      <div class="progress-bar" style="width: <?php echo $progress; ?>%;"></div>
    </div>
    <p class="progress-text"><?php echo round($progress, 1); ?>% du chemin vers le statut VIP</p>

    <h3>Choisissez l'un de nos jeux :</h3>
    <!-- Crazy Time est l'un des jeux disponibles -->
    <button onclick="window.location.href='crazytime.php'" class="game-button">Jouer au Crazy Time</button>
    
    <!-- Statistiques utilisateur -->
    <div class="user-stats">
      <h3>Vos statistiques</h3>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="label">Dépenses totales</div>
          <div class="value"><?php echo htmlspecialchars($user['spend_money']); ?> €</div>
        </div>
        <div class="stat-item">
          <div class="label">Solde actuel</div>
          <div class="value"><?php echo htmlspecialchars($user['balance']); ?> €</div>
        </div>
      </div>
    </div>
    
  </div>
</body>
</html>
