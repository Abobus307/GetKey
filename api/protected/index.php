<?php
header('Content-Type: text/plain');

// Получаем ID из URL
$request_uri = $_SERVER['REQUEST_URI'];
$path_parts = explode('/', $request_uri);
$script_id = end($path_parts);

// Если есть параметр ?t=, берем ID до него
if (strpos($script_id, '?') !== false) {
    $script_id = substr($script_id, 0, strpos($script_id, '?'));
}

// Проверяем, является ли запрос из Roblox
$is_roblox = false;
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Roblox User-Agents
if (strpos($user_agent, 'Roblox') !== false || 
    strpos($user_agent, 'roblox') !== false ||
    isset($_GET['roblox']) || 
    isset($_SERVER['HTTP_ROBLOX'])) {
    $is_roblox = true;
}

if (!$is_roblox) {
    // Показываем страницу Access Denied
    show_access_denied();
    exit;
}

// Загружаем данные скрипта
$script_data = load_script_data($script_id);
if (!$script_data) {
    http_response_code(404);
    echo "Script not found";
    exit;
}

// Возвращаем скрипт
$script_content = fetch_script_content($script_data['url']);
if ($script_content) {
    echo $script_content;
} else {
    http_response_code(500);
    echo "Error loading script";
}

function show_access_denied() {
    $current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Access Denied</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: #1a1a1a; 
                color: #e0e0e0; 
                margin: 0; 
                padding: 40px 20px; 
                text-align: center; 
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
            }
            h1 { 
                color: #ff6b00; 
                margin-bottom: 20px; 
            }
            .info { 
                background: #2d2d2d; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0; 
                text-align: left; 
            }
            .code { 
                background: #1a1a1a; 
                padding: 15px; 
                border-radius: 4px; 
                margin: 15px 0; 
                font-family: monospace; 
                border-left: 3px solid #ff6b00; 
            }
            button { 
                background: #ff6b00; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 4px; 
                cursor: pointer; 
                margin-top: 20px; 
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <h1>Access Denied</h1>
            <p>You do not have access to these files.</p>
            <p>This content is only accessible from Roblox clients. Browser access is blocked for security reasons.</p>
            
            <div class='info'>
                <h3>Why am I seeing this?</h3>
                <ul>
                    <li>This link contains protected Lua script content</li>
                    <li>Only Roblox clients can access protected scripts</li>
                    <li>Browser access is automatically blocked</li>
                    <li>This prevents unauthorized script viewing</li>
                </ul>
                
                <p>If you're a Roblox developer, use this link in your script with:</p>
                <div class='code'>
                    <strong>loadstring(game:HttpGet('$current_url'))()</strong>
                </div>
            </div>
            
            <button onclick='window.history.back()'>Go Back</button>
        </div>
    </body>
    </html>";
}

function load_script_data($script_id) {
    // В реальной реализации здесь должна быть база данных
    // Для демо используем файлы или сессии
    
    $data_file = "scripts/{$script_id}.json";
    if (file_exists($data_file)) {
        $data = file_get_contents($data_file);
        return json_decode($data, true);
    }
    
    return null;
}

function fetch_script_content($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        return $result;
    }
    
    return false;
}
?>
