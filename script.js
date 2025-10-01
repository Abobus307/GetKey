// Конфигурация
const CONFIG = {
    OWNER_KEY: "MASTER_KEY_123",
    LOG_STORAGE_KEY: "script_protector_logs"
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('createBtn').addEventListener('click', createProtectedScript);
    document.getElementById('copyBtn').addEventListener('click', copyLink);
    document.getElementById('loginBtn').addEventListener('click', loginAsOwner);
    document.getElementById('clearLogs').addEventListener('click', clearLogs);

    // Попытка автоматически показать дашборд при загрузке, если ключ уже сохранен
    const savedKey = sessionStorage.getItem('owner_key');
    if (savedKey && Logger.authenticateOwner(savedKey)) {
        showOwnerDashboard();
    }
});

// Система логов (работает только на главной странице)
const Logger = {
    log: function(type, message, scriptId = null) {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            scriptId: scriptId,
            userAgent: navigator.userAgent
        };
        
        const logs = this.getLogs();
        logs.push(logEntry);
        localStorage.setItem(CONFIG.LOG_STORAGE_KEY, JSON.stringify(logs));
        
        this.updateDashboard();
        return logEntry;
    },
    
    getLogs: function() {
        return JSON.parse(localStorage.getItem(CONFIG.LOG_STORAGE_KEY) || '[]');
    },
    
    clearLogs: function() {
        localStorage.removeItem(CONFIG.LOG_STORAGE_KEY);
        this.updateDashboard();
    },
    
    updateDashboard: function() {
        // Проверяем, существует ли элемент, прежде чем обновлять
        if (!document.getElementById('totalAccess')) return;

        const logs = this.getLogs();
        // На главной панели мы можем отслеживать только создание и вход владельца
        const totalLogs = logs.length;
        const creationEvents = logs.filter(log => log.type === 'creation').length;
        const ownerLogins = logs.filter(log => log.type === 'owner_login').length;
        
        document.getElementById('totalAccess').textContent = totalLogs;
        document.getElementById('blockedAttempts').textContent = creationEvents; // Переименовал для ясности
        document.getElementById('successfulAccess').textContent = ownerLogins; // Переименовал для ясности
        
        this.displayLogs();
    },
    
    displayLogs: function() {
        if (!document.getElementById('accessLogs')) return;
        const logs = this.getLogs();
        const container = document.getElementById('accessLogs');
        container.innerHTML = '';
        
        logs.reverse().forEach(log => {
            const logElement = document.createElement('div');
            const typeClass = log.type === 'creation' ? 'success' : 'owner';
            logElement.className = `log-entry ${typeClass}`;
            
            const time = new Date(log.timestamp).toLocaleString();
            logElement.innerHTML = `
                <strong>[${time}]</strong> [${log.type.toUpperCase()}] ${log.message}
                ${log.scriptId ? `<br><small>Script ID: ${log.scriptId}</small>` : ''}
            `;
            
            container.appendChild(logElement);
        });
    },
    
    authenticateOwner: function(key) {
        return key === CONFIG.OWNER_KEY;
    }
};

// Функции владельца
function loginAsOwner() {
    const key = document.getElementById('ownerKey').value;
    if (Logger.authenticateOwner(key)) {
        sessionStorage.setItem('owner_key', key); // Сохраняем ключ в сессии для удобства
        showOwnerDashboard();
        Logger.log('owner_login', 'Owner access granted to dashboard.');
        alert('✅ Owner access granted!');
    } else {
        alert('❌ Invalid owner key!');
    }
}

function showOwnerDashboard() {
    document.getElementById('ownerDashboard').classList.remove('hidden');
    Logger.updateDashboard();
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        Logger.clearLogs();
        alert('Logs cleared!');
    }
}

// Основные функции
async function createProtectedScript() {
    const scriptUrl = document.getElementById('scriptUrl').value;
    const protectionLevel = document.getElementById('protectionLevel').value;
    
    if (!scriptUrl) {
        alert('Please enter a script URL');
        return;
    }
    
    const btn = document.getElementById('createBtn');
    btn.textContent = '🛡️ Protecting...';
    btn.disabled = true;
    
    try {
        // Добавляем прокси для обхода CORS
        const response = await fetch(`https://cors-anywhere.herokuapp.com/${scriptUrl}`);
        if (!response.ok) throw new Error(`Failed to fetch script. Status: ${response.status}`);
        const originalScript = await response.text();
        
        const scriptId = 'script_' + Date.now();
        const protectedScript = applyProtection(originalScript, protectionLevel);
        const protectedUrl = createProtectedUrl(protectedScript, protectionLevel, scriptId);
        
        document.getElementById('protectedLink').value = protectedUrl;
        document.getElementById('result').classList.remove('hidden');
        
        Logger.log('creation', `Created protected script: ${scriptUrl}`, scriptId);
        
    } catch (error) {
        alert('Error: ' + error.message + '\n\nTry enabling the CORS demo at https://cors-anywhere.herokuapp.com/corsdemo');
    } finally {
        btn.textContent = '🚀 Create Protected Script';
        btn.disabled = false;
    }
}

function applyProtection(script, level) {
    let protectedScript = script;
    
    switch(level) {
        case 'basic':
            protectedScript = basicObfuscation(script);
            break;
        case 'advanced':
            protectedScript = advancedObfuscation(script);
            break;
        case 'military':
            protectedScript = militaryObfuscation(script);
            break;
    }
    
    return protectedScript;
}

function basicObfuscation(script) {
    return btoa(unescape(encodeURIComponent(script)));
}

function advancedObfuscation(script) {
    let obfuscated = '';
    for (let i = 0; i < script.length; i++) {
        obfuscated += String.fromCharCode(script.charCodeAt(i) ^ 0x42);
    }
    return btoa(obfuscated);
}

function militaryObfuscation(script) {
    let obfuscated = '';
    const key = 'MILITARY_GRADE_PROTECTION_KEY_2024';
    for (let i = 0; i < script.length; i++) {
        obfuscated += String.fromCharCode(
            script.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return btoa(obfuscated) + '::' + btoa(Date.now().toString());
}

function createProtectedUrl(script, level, scriptId) {
    // ИЗМЕНЕНО: Экранируем строку со скриптом, чтобы она не сломала JS
    const escapedScript = script.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, "\\`");
    const htmlContent = createLoaderHtml(escapedScript, level, scriptId);
    return 'data:text/html;base64,' + btoa(htmlContent);
}


function createLoaderHtml(protectedScript, level, scriptId) {
    // Вся остальная часть HTML остается без изменений...
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Protected Content</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #000; color: #ff0000; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; border: 2px solid #ff0000; padding: 20px; background: #111; }
        .hidden { display: none; }
        .security-alert { border: 1px solid #ff0000; padding: 15px; margin: 10px 0; background: rgba(255, 0, 0, 0.1); }
        .system-log { background: #111; padding: 10px; margin: 10px 0; border-left: 3px solid #ff0000; }
        .owner-access { background: rgba(255, 215, 0, 0.1); border: 1px solid gold; padding: 20px; margin: 10px 0; }
        #ownerKeyInput { padding: 10px; background: #000; border: 1px solid gold; color: gold; width: 200px; }
        #ownerSubmit { padding: 10px 20px; background: gold; color: #000; border: none; cursor: pointer; margin-left: 10px; }
        .owner-hint { color: #888; font-size: 12px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="accessDenied">
            <h1>ACCESS DENIED</h1>
            <div class="security-alert">Security system activated</div>
            <div class="system-log">
                [SYSTEM] Security check in progress...<br>
                [STATUS] Access restricted
            </div>
            <div style="margin: 20px 0;">
                <input type="password" id="ownerKeyInput" placeholder="Owner Access Key">
                <button id="ownerSubmit">Access</button>
                <div class="owner-hint">Press Shift+Ctrl+Space for quick access</div>
            </div>
        </div>
        <div id="ownerAccess" class="owner-access hidden">
            <h2>Owner Access Granted</h2>
            <p>Script execution enabled.</p>
            <div id="scriptContainer"></div>
        </div>
    </div>

    <script>
        const scriptId = '${scriptId}';
        const protectionLevel = '${level}';
        const protectedScript = '${protectedScript}';
        const MASTER_KEY = 'MASTER_KEY_123';
        
        // ИЗМЕНЕНО: Убрана привязка к localStorage, т.к. она бесполезна в этом контексте
        function logAccess(type, message) {
            console.log('ACCESS LOG:', {
                scriptId: scriptId,
                type: type,
                message: message,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        }

        function checkOwnerAccess() {
            const inputKey = document.getElementById('ownerKeyInput').value;
            if (inputKey === MASTER_KEY) {
                document.getElementById('accessDenied').classList.add('hidden');
                document.getElementById('ownerAccess').classList.remove('hidden');
                executeScript();
                logAccess('owner_access', 'Owner accessed protected content');
            } else {
                alert('Invalid access key!');
                logAccess('access_denied', 'Failed authentication attempt');
            }
        }
        
        function executeScript() {
            let originalScript = '';
            try {
                ${getDecryptionCode(level)}
                
                const scriptElement = document.createElement('script');
                scriptElement.textContent = originalScript;
                document.getElementById('scriptContainer').appendChild(scriptElement);
                
                logAccess('success', 'Script executed successfully');
                
            } catch (error) {
                console.error('Script execution failed:', error);
                logAccess('access_denied', 'Script execution failed: ' + error.message);
            }
        }
        
        // --- Инициализация ---
        document.getElementById('ownerSubmit').addEventListener('click', checkOwnerAccess);
        document.getElementById('ownerKeyInput').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                checkOwnerAccess();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                document.getElementById('ownerKeyInput').focus();
            }
        });
        
        logAccess('access_denied', 'Protected content loaded, waiting for key.');

    </script>
</body>
</html>`;
}

function getDecryptionCode(level) {
    switch(level) {
        case 'basic':
            return `originalScript = decodeURIComponent(escape(atob(protectedScript)));`;
        case 'advanced':
            return `
                let decoded = atob(protectedScript);
                originalScript = '';
                for (let i = 0; i < decoded.length; i++) {
                    originalScript += String.fromCharCode(decoded.charCodeAt(i) ^ 0x42);
                }
            `;
        case 'military':
            return `
                const parts = protectedScript.split('::');
                let decoded = atob(parts[0]);
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

function copyLink() {
    const linkInput = document.getElementById('protectedLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Для мобильных устройств
    
    // ИЗМЕНЕНО: Использование нового Clipboard API, так как execCommand устарел
    navigator.clipboard.writeText(linkInput.value).then(function() {
        alert('✅ Link copied to clipboard!');
    }, function(err) {
        alert('Could not copy text: ', err);
    });
}
