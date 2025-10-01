// script.js
// Конфигурация
const CONFIG = {
    OWNER_KEY: "MASTER_KEY_123",
    LOG_STORAGE_KEY: "script_protector_logs"
};

// Генератор уникального Script ID
function generateScriptId() {
    return 'SCR-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('createBtn').addEventListener('click', createProtectedScript);
    document.getElementById('copyBtn').addEventListener('click', copyLink);
    document.getElementById('loginBtn').addEventListener('click', loginAsOwner);
    document.getElementById('clearLogs').addEventListener('click', clearLogs);

    const savedKey = sessionStorage.getItem('owner_key');
    if (savedKey && Logger.authenticateOwner(savedKey)) {
        showOwnerDashboard();
    }
});

// Система логов
const Logger = {
    log: function(type, message, scriptId = null) {
        // Убедимся, что 'type' и 'message' являются строками.
        if (typeof type !== 'string' || typeof message !== 'string') {
             console.error("Logger Error: 'type' or 'message' is not defined or not a string.");
             return; // Предотвращаем падение, если тип не задан
        }
        
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type, // 'creation', 'owner_login', 'view', 'attempted_breach', 'owner_access', 'fetch_error'
            message,
            scriptId,
            userAgent: navigator.userAgent
        };
        const logs = this.getLogs();
        logs.push(logEntry);
        localStorage.setItem(CONFIG.LOG_STORAGE_KEY, JSON.stringify(logs));
        this.updateDashboard();
    },
    getLogs: function() {
        return JSON.parse(localStorage.getItem(CONFIG.LOG_STORAGE_KEY) || '[]');
    },
    clearLogs: function() {
        localStorage.removeItem(CONFIG.LOG_STORAGE_KEY);
        this.updateDashboard();
    },
    updateDashboard: function() {
        const totalAccessEl = document.getElementById('totalAccess');
        if (!totalAccessEl) return; 

        const logs = this.getLogs();
        
        totalAccessEl.textContent = logs.length;
        
        const createdScriptsEl = document.getElementById('createdScripts');
        if (createdScriptsEl) createdScriptsEl.textContent = logs.filter(log => log.type === 'creation').length;
        
        const ownerLoginsEl = document.getElementById('ownerLogins');
        if (ownerLoginsEl) ownerLoginsEl.textContent = logs.filter(log => log.type === 'owner_login' || log.type === 'owner_access').length;
        
        const breachAttemptsEl = document.getElementById('breachAttempts');
        if (breachAttemptsEl) breachAttemptsEl.textContent = logs.filter(log => log.type === 'attempted_breach' || log.type === 'fetch_error').length;
        
        this.displayLogs();
    },
    displayLogs: function() {
        if (!document.getElementById('accessLogs')) return;
        const logs = this.getLogs();
        const container = document.getElementById('accessLogs');
        container.innerHTML = '';
        logs.slice().reverse().forEach(log => {
            const logElement = document.createElement('div');
            let typeClass;
            if (log.type === 'creation') typeClass = 'success';
            else if (log.type === 'owner_login' || log.type === 'owner_access') typeClass = 'owner';
            else if (log.type === 'attempted_breach' || log.type === 'fetch_error') typeClass = 'breach';
            else typeClass = ''; 

            logElement.className = `log-entry ${typeClass}`;
            const time = new Date(log.timestamp).toLocaleString();
            // Убеждаемся, что log.type существует, прежде чем вызывать toUpperCase()
            const logType = log.type ? log.type.toUpperCase() : 'UNKNOWN'; 
            logElement.innerHTML = `<strong>[${time}]</strong> [${logType}] ${log.message}${log.scriptId ? `<br><small>Script ID: ${log.scriptId}</small>` : ''}`;
            container.appendChild(logElement);
        });
    },
    authenticateOwner: function(key) {
        return key === CONFIG.OWNER_KEY;
    }
};

// Функции владельца (без изменений)
function loginAsOwner() {
    const key = document.getElementById('ownerKey').value;
    if (Logger.authenticateOwner(key)) {
        sessionStorage.setItem('owner_key', key);
        showOwnerDashboard();
        Logger.log('owner_login', 'Доступ владельца к панели управления предоставлен.');
        alert('✅ Доступ владельца предоставлен!');
    } else {
        alert('❌ Неверный ключ владельца!');
    }
}

function showOwnerDashboard() {
    document.getElementById('ownerDashboard').classList.remove('hidden');
    Logger.updateDashboard();
}

function clearLogs() {
    if (confirm('Вы уверены, что хотите очистить все логи?')) {
        Logger.clearLogs();
        alert('Логи очищены!');
    }
}

// Основные функции (ФИКС: Гарантируем, что type и message переданы в Logger.log)
async function createProtectedScript() {
    const scriptUrl = document.getElementById('scriptUrl').value;
    const protectionLevel = document.getElementById('protectionLevel').value;
    if (!scriptUrl) {
        alert('Пожалуйста, введите URL скрипта');
        return;
    }
    const btn = document.getElementById('createBtn');
    if (btn) {
        btn.textContent = '🛡️ Защита...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(scriptUrl)}`);
        if (!response.ok) throw new Error(`Failed to fetch script. Status: ${response.status}`);
        const originalScript = await response.text();
        
        const scriptId = generateScriptId(); 
        
        const protectedScript = applyProtection(originalScript, protectionLevel, scriptId); 
        const protectedUrl = createProtectedUrl(protectedScript, protectionLevel, scriptId);
        
        document.getElementById('protectedLink').value = protectedUrl;
        document.getElementById('result').classList.remove('hidden');
        Logger.log('creation', `Создан защищенный скрипт: ${scriptUrl}`, scriptId);
    } catch (error) {
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Явно задаём оба аргумента
        const errorMessage = error && error.message ? error.message : 'Unknown network error.';
        Logger.log('fetch_error', `Ошибка загрузки скрипта: ${errorMessage}`, 'N/A'); 
        alert('Ошибка при получении скрипта: ' + errorMessage);
    } finally {
        if (btn) {
            btn.textContent = '🚀 Создать защищенный скрипт';
            btn.disabled = false;
        }
    }
}

// applyProtection (без изменений)
function applyProtection(script, level, scriptId) {
    switch (level) {
        case 'basic':
            return btoa(unescape(encodeURIComponent(script)));
        case 'advanced':
            let advancedObfuscated = '';
            for (let i = 0; i < script.length; i++) {
                advancedObfuscated += String.fromCharCode(script.charCodeAt(i) ^ 0x42);
            }
            return btoa(unescape(encodeURIComponent(advancedObfuscated))) + '::' + btoa(scriptId);
        case 'military':
            let militaryObfuscated = '';
            const key = 'MILITARY_GRADE_PROTECTION_KEY_2024';
            for (let i = 0; i < script.length; i++) {
                militaryObfuscated += String.fromCharCode(script.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return btoa(unescape(encodeURIComponent(militaryObfuscated))) + '::' + btoa(scriptId) + '::' + btoa(Date.now().toString());
        default:
            return script;
    }
}

// createProtectedUrl (без изменений)
function createProtectedUrl(script, level, scriptId) {
    const escapedScript = script.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, "\\`");
    const htmlContent = createLoaderHtml(escapedScript, level, scriptId); 
    return 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(htmlContent)));
}

function copyLink() {
    const linkInput = document.getElementById('protectedLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(() => {
        alert('✅ Ссылка скопирована!');
    }, (err) => {
        alert('Не удалось скопировать текст: ' + err);
    });
}
