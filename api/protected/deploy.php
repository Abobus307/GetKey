<?php
// deploy.php - обработчик для сохранения скриптов
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['script_id']) && isset($data['url'])) {
        $script_id = $data['script_id'];
        $script_data = [
            'url' => $data['url'],
            'timestamp' => time(),
            'created' => date('Y-m-d H:i:s')
        ];
        
        // Создаем папку если не существует
        if (!is_dir('scripts')) {
            mkdir('scripts', 0755, true);
        }
        
        // Сохраняем данные скрипта
        file_put_contents("scripts/{$script_id}.json", json_encode($script_data));
        
        echo json_encode(['status' => 'success', 'script_id' => $script_id]);
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing data']);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
?>
