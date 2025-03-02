<?php
// update_balance.php - Mise à jour du solde utilisateur via AJAX

session_start();

// Indiquer qu'on renvoie du JSON
header('Content-Type: application/json');

require_once 'config.php';  // Doit définir $pdo

// 1) Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Utilisateur non connecté'
    ]);
    exit;
}

// 2) Récupérer et vérifier les données JSON envoyées par fetch
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['userId'], $data['newBalance'], $data['spendAmount'], $data['isWin'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Données manquantes (userId, newBalance, spendAmount, isWin)'
    ]);
    exit;
}

$userId      = (int)$data['userId'];
$newBalance  = (float)$data['newBalance'];
$spendAmount = (float)$data['spendAmount'];
$isWin       = (bool)$data['isWin'];

// 3) Vérifier la cohérence avec la session
if ($userId !== (int)$_SESSION['user']['id']) {
    echo json_encode([
        'success' => false,
        'message' => 'ID utilisateur invalide (ne correspond pas à la session)'
    ]);
    exit;
}

try {
    // 4) Commencer une transaction pour tout valider/annuler en bloc
    $pdo->beginTransaction();

    // 5) Vérifier que l'utilisateur existe vraiment en BDD
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
    $checkStmt->execute([$userId]);
    $countUser = (int)$checkStmt->fetchColumn();

    if ($countUser === 0) {
        // Annuler la transaction
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'message' => 'Utilisateur introuvable en base'
        ]);
        exit;
    }

    // 6) Vérifier qu'on n'autorise pas un solde négatif
    if ($newBalance < 0) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'message' => 'Solde insuffisant ou négatif'
        ]);
        exit;
    }

    // 7) Mettre à jour la balance
    $updateBalance = $pdo->prepare("
        UPDATE users
           SET balance = :balance
         WHERE id = :id
    ");
    $updateBalance->execute([
        ':balance' => $newBalance,
        ':id'      => $userId
    ]);

    // Vérifier si une ligne a été modifiée (optionnel)
    if ($updateBalance->rowCount() === 0) {
        // Si rowCount = 0, l'utilisateur n'a pas été mis à jour
        // (ex. l'id n'existe plus, ou la balance est déjà la même)
        // On ne considère pas forcément ça comme un échec, à adapter
    }

    // 8) Mettre à jour spend_money si c'est une mise et non un gain
    //    => On décrémente le solde ET on incrémente spend_money
    if ($spendAmount > 0 && !$isWin) {
        $updateSpend = $pdo->prepare("
            UPDATE users
               SET spend_money = spend_money + :amount
             WHERE id = :id
        ");
        $updateSpend->execute([
            ':amount' => $spendAmount,
            ':id'     => $userId
        ]);
        // rowCount() éventuel si besoin
    }

    // 9) Valider la transaction
    $pdo->commit();

    // 10) Mettre à jour la session
    $_SESSION['user']['balance'] = $newBalance;

    // 11) Répondre au client
    echo json_encode([
        'success' => true,
        'newBalance' => $newBalance
    ]);
    // Supposons que $pdo soit votre instance PDO et que $user contienne les données actuelles de l'utilisateur.
$seuilVIP = 500; // seuil en euros pour débloquer le statut VIP

if ($user['spend_money'] >= $seuilVIP && $user['vip'] == 0) {
    // Mettre à jour le statut VIP dans la base de données
    $stmt = $pdo->prepare("UPDATE users SET vip = 1 WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    // Mettre à jour la session pour refléter le changement
    $_SESSION['user']['vip'] = 1;
    $user['vip'] = 1; // pour l'affichage immédiat
}


} catch (PDOException $e) {
    // En cas d'erreur, on annule la transaction
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        'success' => false,
        'message' => 'Erreur de base de données : ' . $e->getMessage()
    ]);
    exit;
}

