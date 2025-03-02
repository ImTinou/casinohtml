<?php
session_start();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    header("Location: index.html");
    exit();
}

// Vérifier que le formulaire a été soumis en POST et que le montant est défini
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['deposit_amount'])) {
    header("Location: menu.php");
    exit();
}

// Récupérer et valider le montant à déposer dans le vault
$deposit_amount = floatval($_POST['deposit_amount']);
if ($deposit_amount <= 0) {
    header("Location: menu.php?error=invalid_amount");
    exit();
}

// Inclusion du fichier de configuration qui établit la connexion à la BDD via PDO
require_once 'config.php'; // Ce fichier doit définir la variable $pdo

$userId = $_SESSION['user']['id'];

try {
    // Démarrer une transaction
    $pdo->beginTransaction();

    // Vérifier que l'utilisateur a suffisamment de solde pour déposer dans le vault
    $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = :id FOR UPDATE");
    $stmt->execute([':id' => $userId]);
    $userData = $stmt->fetch();

    if (!$userData || $userData['balance'] < $deposit_amount) {
        // Solde insuffisant
        $pdo->rollBack();
        header("Location: menu.php?error=insufficient_funds");
        exit();
    }

    // Déduire le montant du solde de l'utilisateur
    $stmt = $pdo->prepare("UPDATE users SET balance = balance - :amount WHERE id = :id");
    $stmt->execute([
        ':amount' => $deposit_amount,
        ':id'     => $userId,
    ]);

    // Vérifier si un enregistrement de vault existe déjà pour cet utilisateur
    $stmt = $pdo->prepare("SELECT balance FROM vault WHERE user_id = :user_id FOR UPDATE");
    $stmt->execute([':user_id' => $userId]);
    $vaultData = $stmt->fetch();

    if ($vaultData) {
        // Mettre à jour le solde existant dans le vault
        $stmt = $pdo->prepare("UPDATE vault SET balance = balance + :amount WHERE user_id = :user_id");
        $stmt->execute([
            ':amount'  => $deposit_amount,
            ':user_id' => $userId,
        ]);
    } else {
        // Insérer une nouvelle entrée dans le vault pour cet utilisateur
        $stmt = $pdo->prepare("INSERT INTO vault (user_id, balance) VALUES (:user_id, :amount)");
        $stmt->execute([
            ':user_id' => $userId,
            ':amount'  => $deposit_amount,
        ]);
    }

    // Valider la transaction
    $pdo->commit();

    // Mettre à jour la session pour refléter le nouveau solde
    $_SESSION['user']['balance'] -= $deposit_amount;

    header("Location: menu.php?success=deposit_to_vault_successful");
    exit();
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erreur lors du dépôt dans le vault: " . $e->getMessage());
    header("Location: menu.php?error=deposit_failed");
    exit();
}
?>
