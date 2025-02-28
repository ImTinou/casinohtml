<?php
// config.php
$host   = "mysql-tinou.alwaysdata.net";
$dbname = "tinou_casinohtml";       // Remplacez par le nom de votre base de données
$user   = "tinou";    // Remplacez par votre nom d'utilisateur
$pass   = "TinouBros123.";         // Remplacez par votre mot de passe

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Erreur de connexion à la base de données: " . $e->getMessage());
}
?>
