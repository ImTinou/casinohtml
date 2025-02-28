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
    .menu-container button {
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      background: linear-gradient(to right, #e74c3c, #f39c12);
      color: white;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }
    .menu-container button:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <header>
    <h1>Casino</h1>
  </header>
  <div class="menu-container">
    <h2>Bienvenue, <?php echo htmlspecialchars($user['username']); ?>!</h2>
    <p>Solde : <?php echo htmlspecialchars($user['balance']); ?> €</p>
    <p>Choisissez l'un de nos jeux :</p>
    <!-- Crazy Time est l'un des jeux disponibles -->
    <button onclick="window.location.href='crazytime.html'">Jouer au Crazy Time</button>
  </div>
</body>
</html>
