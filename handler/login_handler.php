<?php
// login_handler.php

session_start();
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupération des données du formulaire en nettoyant le username
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Vérifier que tous les champs sont remplis
    if (empty($username) || empty($password)) {
        die("Tous les champs sont requis.");
    }
    
    // Recherche de l'utilisateur dans la table users
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    if ($user && password_verify($password, $user['password'])) {
        // Authentification réussie : on stocke l'utilisateur dans la session
        $_SESSION['user'] = $user;
        header("Location: menu.php");
        exit();
    } else {
        die("Nom d'utilisateur ou mot de passe incorrect.");
    }
} else {
    header("Location: login.html");
    exit();
}
?>
