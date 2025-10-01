// Конфигурация
const CONFIG = {
    OWNER_KEY: "MASTER_KEY_123",
    LOG_STORAGE_KEY: "script_protector_logs",
    SCRIPT_STORAGE_KEY: "protected_scripts"
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('createBtn').addEventListener('click', createProtectedScript);
    document.getElementById('copyBtn').addEventListener('click', copyLink);
    document.getElementById('loginBtn').addEventListener('click', loginAsOwner);
    document.getElementById('clearLogs').addEventListener('click', clearLogs);
});

// Система логов
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
        const logs = this.getLogs();
        const totalAccess = logs.length;
        const blockedAttempts = logs.filter(log => log.type === 'access_denied').length;
        const successfulAccess = logs.filter(log => log.type === 'success').length;
        
        document.getElementById('totalAccess').textContent = totalAccess;
        document.getElementById('blockedAttempts').textContent = blockedAttempts;
        document.getElementById('successfulAccess').textContent = successfulAccess;
        
        this.displayLogs();
    },
    
    displayLogs: function() {
        const logs = this.getLogs();
        const container = document.getElementById('accessLogs');
        container.innerHTML = '';
        
        logs.reverse().forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = `log-entry ${log.type === 'success' ? 'success' : log.type === 'owner_access' ? 'owner' : ''}`;
            
            const time = new Date(log.timestamp).toLocaleString();
            logElement.innerHTML = `
                <strong>[${time}]</strong> ${log.message}
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
        showOwnerDashboard();
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
        const response = await fetch(scriptUrl);
        if (!response.ok) throw new Error('Failed to fetch script');
        const originalScript = await response.text();
        
        const scriptId = 'script_' + Date.now();
        const protectedScript = applyProtection(originalScript, protectionLevel);
        const protectedUrl = createProtectedUrl(protectedScript, protectionLevel, scriptId);
        
        document.getElementById('protectedLink').value = protectedUrl;
        document.getElementById('result').classList.remove('hidden');
        
        Logger.log('success', `Created protected script: ${scriptUrl}`, scriptId);
        
    } catch (error) {
        alert('Error: ' + error.message);
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
    const htmlContent = createLoaderHtml(script, level, scriptId);
    return 'data:text/html;base64,' + btoa(htmlContent);
}

function createLoaderHtml(protectedScript, level, scriptId) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Protected Content</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            background: #000; 
            color: #ff0000;
            margin: 0;
            padding: 20px;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            border: 2px solid #ff0000;
            padding: 20px;
            background: #111;
        }
        .hidden { display: none; }
        .security-alert {
            border: 1px solid #ff0000;
            padding: 15px;
            margin: 10px 0;
            background: rgba(255, 0, 0, 0.1);
        }
        .system-log {
            background: #111;
            padding: 10px;
            margin: 10px 0;
            border-left: 3px solid #ff0000;
        }
        .owner-access {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid gold;
            padding: 20px;
            margin: 10px 0;
        }
        #ownerKeyInput {
            padding: 10px;
            background: #000;
            border: 1px solid gold;
            color: gold;
            width: 200px;
        }
        #ownerSubmit {
            padding: 10px 20px;
            background: gold;
            color: #000;
            border: none;
            cursor: pointer;
            margin-left: 10px;
        }
        .owner-hint {
            color: #888;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="accessDenied">
            <h1>ACCESS DENIED</h1>
            
            <div class="security-alert">
                Security system activated
            </div>
            
            <div class="system-log">
                [SYSTEM] Security check in progress...<br>
                [STATUS] Access restricted
            </div>

            <!-- Форма для владельца -->
            <div style="margin: 20px 0;">
                <input type="password" id="ownerKeyInput" placeholder="Owner Access Key">
                <button id="ownerSubmit" onclick="checkOwnerAccess()">Access</button>
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
        
        function logAccess(type, message) {
            const logData = {
                scriptId: scriptId,
                type: type,
                message: message,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };
            console.log('ACCESS LOG:', logData);
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
                logAccess('access_denied', 'Script execution failed');
            }
        }
        
        // Автоматически выполняем скрипт если это инжект в игру
        const isGameInjection = window.self !== window.top || 
                               navigator.userAgent.includes('Game') ||
                               window.location !== window.parent.location;
        
        if (isGameInjection) {
            document.getElementById('accessDenied').classList.add('hidden');
            document.getElementById('ownerAccess').classList.remove('hidden');
            executeScript();
        } else {
            logAccess('access_denied', 'Browser access detected');
        }
        
        // Горячие клавиши Shift+Ctrl+Space
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                document.getElementById('ownerKeyInput').focus();
            }
        });
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
    document.execCommand('copy');
    alert('✅ Link copied to clipboard!');
}
