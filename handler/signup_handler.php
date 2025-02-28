<?php
// handler/signup_handler.php

require '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupération et nettoyage des données du formulaire
    $name     = trim($_POST['name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($name) || empty($username) || empty($email) || empty($password)) {
        die("Tous les champs sont requis.");
    }

    // Hachage du mot de passe
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Insertion de l'utilisateur dans la table users
    $stmt = $pdo->prepare("INSERT INTO users (name, username, email, password) VALUES (:name, :username, :email, :password)");
    try {
        $stmt->execute([
            ':name'     => $name,
            ':username' => $username,
            ':email'    => $email,
            ':password' => $hashedPassword
        ]);
        // Rediriger vers la page de connexion après inscription
        header("Location: ../index.html");
        exit();
    } catch (PDOException $e) {
        die("Erreur lors de la création du compte : " . $e->getMessage());
    }
} else {
    header("Location: ../index.html");
    exit();
}
?>
