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

    const savedKey = sessionStorage.getItem('owner_key');
    if (savedKey && Logger.authenticateOwner(savedKey)) {
        showOwnerDashboard();
    }
});

// Система логов
const Logger = {
    log: function(type, message, scriptId = null) {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type,
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
        if (!document.getElementById('totalAccess')) return;
        const logs = this.getLogs();
        document.getElementById('totalAccess').textContent = logs.length;
        document.getElementById('blockedAttempts').textContent = logs.filter(log => log.type === 'creation').length;
        document.getElementById('successfulAccess').textContent = logs.filter(log => log.type === 'owner_login').length;
        this.displayLogs();
    },
    displayLogs: function() {
        if (!document.getElementById('accessLogs')) return;
        const logs = this.getLogs();
        const container = document.getElementById('accessLogs');
        container.innerHTML = '';
        logs.slice().reverse().forEach(log => {
            const logElement = document.createElement('div');
            const typeClass = log.type === 'creation' ? 'success' : 'owner';
            logElement.className = `log-entry ${typeClass}`;
            const time = new Date(log.timestamp).toLocaleString();
            logElement.innerHTML = `<strong>[${time}]</strong> [${log.type.toUpperCase()}] ${log.message}${log.scriptId ? `<br><small>Script ID: ${log.scriptId}</small>` : ''}`;
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
        sessionStorage.setItem('owner_key', key);
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
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(scriptUrl)}`);
        if (!response.ok) throw new Error(`Failed to fetch script. Status: ${response.status}`);
        const originalScript = await response.text();
        const scriptId = 'script_' + Date.now();
        const protectedScript = applyProtection(originalScript, protectionLevel);
        const protectedUrl = createProtectedUrl(protectedScript, protectionLevel, scriptId);
        document.getElementById('protectedLink').value = protectedUrl;
        document.getElementById('result').classList.remove('hidden');
        Logger.log('creation', `Created protected script: ${scriptUrl}`, scriptId);
    } catch (error) {
        alert('Error fetching script: ' + error.message);
    } finally {
        btn.textContent = '🚀 Create Protected Script';
        btn.disabled = false;
    }
}

function applyProtection(script, level) {
    switch (level) {
        case 'basic':
            return btoa(unescape(encodeURIComponent(script)));
        case 'advanced':
            let advancedObfuscated = '';
            for (let i = 0; i < script.length; i++) {
                advancedObfuscated += String.fromCharCode(script.charCodeAt(i) ^ 0x42);
            }
            return btoa(advancedObfuscated);
        case 'military':
            let militaryObfuscated = '';
            const key = 'MILITARY_GRADE_PROTECTION_KEY_2024';
            for (let i = 0; i < script.length; i++) {
                militaryObfuscated += String.fromCharCode(script.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return btoa(militaryObfuscated) + '::' + btoa(Date.now().toString());
        default:
            return script;
    }
}

function createProtectedUrl(script, level, scriptId) {
    const escapedScript = script.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, "\\`");
    // Эта функция вызывается из файла loader.js
    const htmlContent = createLoaderHtml(escapedScript, level, scriptId);
    return 'data:text/html;base64,' + btoa(htmlContent);
}

function copyLink() {
    const linkInput = document.getElementById('protectedLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(() => {
        alert('✅ Link copied to clipboard!');
    }, (err) => {
        alert('Could not copy text: ' + err);
    });
}
