// loader.js
function getDecryptionCode(level) {
    switch(level) {
        case 'basic':
            return `originalScript = decodeURIComponent(escape(atob(protectedScript)));`;
        case 'advanced':
            return `
                const parts = protectedScript.split('::');
                let decoded;
                try {
                    // Обратная операция для Base64/UTF-8
                    decoded = decodeURIComponent(escape(atob(parts[0]))); 
                } catch (e) {
                    throw new Error("Base64/UTF-8 decode failed: " + e.message);
                }
                
                originalScript = '';
                for (let i = 0; i < decoded.length; i++) {
                    originalScript += String.fromCharCode(decoded.charCodeAt(i) ^ 0x42);
                }
            `;
        case 'military':
            return `
                const parts = protectedScript.split('::');
                let decoded;
                try {
                    // Обратная операция для Base64/UTF-8
                    decoded = decodeURIComponent(escape(atob(parts[0]))); 
                } catch (e) {
                    throw new Error("Base64/UTF-8 decode failed: " + e.message);
                }

                const key = 'MILITARY_GRADE_PROTECTION_KEY_2024';
                originalScript = '';
                for (let i = 0; i < decoded.length; i++) {
                    originalScript += String.fromCharCode(
                        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                    );
                }
            `;
        default:
            return 'originalScript = atob(protectedScript);';
    }
}

// ИСПРАВЛЕНО: Добавлены scriptId и логика логирования в HTML
function createLoaderHtml(protectedScript, level, scriptId) {
    // ВНИМАНИЕ: Эта функция ИМИТИРУЕТ логирование, сохраняя логи в localStorage 
    // родительской страницы. В реальном приложении здесь нужен реальный бэкенд.
    const loggingFunction = `
        const SCRIPT_ID = '${scriptId}';
        const MASTER_KEY = 'MASTER_KEY_123';
        
        // Функция для отправки логов на родительскую страницу (имитация бэкенда)
        function sendFrontendLog(type, message) {
            try {
                if (window.opener && window.opener.Logger) {
                    window.opener.Logger.log(type, message, SCRIPT_ID);
                }
                // Для логов, которые должны быть в реальном времени (попытка взлома)
                if (type === 'attempted_breach') {
                    console.error(\`!!! АЛЕРТ ВЗЛОМА !!! Скрипт: \${SCRIPT_ID}\`);
                    // Здесь в реальном проекте отправлялось бы уведомление (Telegram/Email)
                }
            } catch (e) {
                console.error("Failed to send log to parent window:", e);
            }
        }
        
        // Логируем посещение страницы (кто сейчас смотрит)
        sendFrontendLog('view', 'Скрипт загружен. Ожидание доступа.');

        function showDecryptedCode() {
            let originalScript = '';
            try {
                // Код деобфускации
                ${getDecryptionCode(level)}
                
                document.getElementById('luaCodeOutput').value = originalScript;
                
            } catch (error) {
                document.getElementById('luaCodeOutput').value = "Error decrypting script: " + error.message;
                // Отправка лога о неудачной дешифровке
                sendFrontendLog('breach_failed', 'Неудачная попытка дешифровки скрипта.');
            }
        }

        function checkOwnerAccess() {
            const inputKey = document.getElementById('ownerKeyInput').value;
            
            if (inputKey === MASTER_KEY) {
                document.getElementById('accessDenied').classList.add('hidden');
                document.getElementById('ownerAccess').classList.remove('hidden');
                showDecryptedCode();
                sendFrontendLog('owner_access', 'Владелец получил доступ.');
            } else {
                // Логируем попытку взлома (если неверный ключ)
                sendFrontendLog('attempted_breach', 'Неудачная попытка доступа с ключом: ' + inputKey.substring(0, 10) + '...');
                alert('Invalid access key!');
            }
        }
    `;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Protected Content</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #000; color: #00ff00; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
        .container { max-width: 800px; width: 100%; border: 2px solid #00ff00; padding: 20px; background: #111; }
        .hidden { display: none; }
        h1, h2 { color: #fff; }
        #ownerKeyInput { padding: 10px; background: #000; border: 1px solid #00ff00; color: #00ff00; width: 250px; }
        #ownerSubmit, #copyLuaBtn { padding: 10px 20px; background: #00ff00; color: #000; border: none; cursor: pointer; margin-left: 10px; font-weight: bold; }
        #luaCodeOutput { width: 100%; box-sizing: border-box; height: 300px; background: #000; color: #00ff00; border: 1px solid #00ff00; margin-top: 10px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="accessDenied">
            <h1>LUA SCRIPT LOCKED</h1>
            <div style="margin: 20px 0;">
                <input type="password" id="ownerKeyInput" placeholder="Owner Access Key">
                <button id="ownerSubmit">Unlock</button>
            </div>
        </div>

        <div id="ownerAccess" class="hidden">
            <h2>✅ Script Unlocked</h2>
            <textarea id="luaCodeOutput" readonly></textarea>
            <button id="copyLuaBtn">Copy Lua Code</button>
        </div>
    </div>
    <script>
        const protectedScript = '${protectedScript}';
        
        // ВСТАВЛЯЕМ ЛОГИКУ ЛОГИРОВАНИЯ И КОНТРОЛЯ ДОСТУПА
        ${loggingFunction}
        
        // Копирование LUA кода (без изменений)
        document.getElementById('copyLuaBtn').addEventListener('click', () => {
            const luaCodeArea = document.getElementById('luaCodeOutput');
            luaCodeArea.select();
            navigator.clipboard.writeText(luaCodeArea.value).then(() => {
                alert('Lua code copied to clipboard!');
            });
        });

        document.getElementById('ownerSubmit').addEventListener('click', checkOwnerAccess);
        document.getElementById('ownerKeyInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') checkOwnerAccess();
        });
    </script>
</body>
</html>`;
}
