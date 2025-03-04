<?php
// handler/login_handler.php

session_start();
require '../config.php'; // Assurez-vous que config.php est bien à la racine

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupération des données et nettoyage
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        die("Tous les champs sont requis.");
    }
    
    // Requête pour trouver l'utilisateur dans la table users
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Vérification du mot de passe
    if ($user && password_verify($password, $user['password'])) {
        // Authentification réussie, enregistrement dans la session
        $_SESSION['user'] = $user;
        header("Location: ../menu.php"); // Redirection vers le menu (à la racine)
        exit();
    } else {
        die("Nom d'utilisateur ou mot de passe incorrect.");
    }
} else {
    header("Location: ../index.html");
    exit();
}
?>
