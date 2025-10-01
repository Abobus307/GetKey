// script.js
// Конфигурация
const CONFIG = {
    OWNER_KEY: "MASTER_KEY_123",
    LOG_STORAGE_KEY: "script_protector_logs"
};

// Генератор уникального Script ID (использует crypto.randomUUID если доступно)
function generateScriptId() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return 'SCR-' + crypto.randomUUID();
        }
    } catch (e) { /* fallback ниже */ }

    // fallback
    return 'SCR-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Генератор per-link bypass key (длина зависит от уровня защиты)
function generateBypassKey(level) {
    const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let len = 6;
    if (level === 'advanced') len = 8;
    if (level === 'military') len = 14;
    let out = '';
    for (let i = 0; i < len; i++) out += pool.charAt(Math.floor(Math.random() * pool.length));
    return out;
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const createBtnEl = document.getElementById('createBtn');
    if (createBtnEl) createBtnEl.addEventListener('click', createProtectedScript);
    const copyBtnEl = document.getElementById('copyBtn');
    if (copyBtnEl) copyBtnEl.addEventListener('click', copyLink);
    const loginBtnEl = document.getElementById('loginBtn');
    if (loginBtnEl) loginBtnEl.addEventListener('click', loginAsOwner);
    const clearLogsEl = document.getElementById('clearLogs');
    if (clearLogsEl) clearLogsEl.addEventListener('click', clearLogs);

    const savedKey = sessionStorage.getItem('owner_key');
    if (savedKey && Logger && typeof Logger.authenticateOwner === 'function' && Logger.authenticateOwner(savedKey)) {
        showOwnerDashboard();
    }
});

// Система логов
const Logger = {
    log: function(type, message, scriptId = null) {
        if (typeof type !== 'string' || typeof message !== 'string') {
             console.error("Logger Error: 'type' or 'message' is not defined or not a string.");
             return;
        }

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
        try {
            return JSON.parse(localStorage.getItem(CONFIG.LOG_STORAGE_KEY) || '[]');
        } catch (e) { return []; }
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
            const logType = log.type ? log.type.toUpperCase() : 'UNKNOWN';
            logElement.innerHTML = `<strong>[${time}]</strong> [${logType}] ${log.message}${log.scriptId ? `<br><small>Script ID: ${log.scriptId}</small>` : ''}`;
            container.appendChild(logElement);
        });
    },
    authenticateOwner: function(key) {
        return key === CONFIG.OWNER_KEY;
    }
};

// Функции владельца
function loginAsOwner() {
    const keyEl = document.getElementById('ownerKey');
    const key = keyEl ? keyEl.value : '';
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
    const dash = document.getElementById('ownerDashboard');
    if (dash) dash.classList.remove('hidden');
    Logger.updateDashboard();
}

function clearLogs() {
    if (confirm('Вы уверены, что хотите очистить все логи?')) {
        Logger.clearLogs();
        alert('Логи очищены!');
    }
}

// Основные функции
async function createProtectedScript() {
    const scriptUrlEl = document.getElementById('scriptUrl');
    const protectionLevelEl = document.getElementById('protectionLevel');
    const scriptUrl = scriptUrlEl ? scriptUrlEl.value : '';
    const protectionLevel = protectionLevelEl ? protectionLevelEl.value : 'basic';

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

        // Генерируем уникальный id и bypassKey для этой ссылки
        const scriptId = generateScriptId();
        const bypassKey = generateBypassKey(protectionLevel);

        // Обфускация/защита
        const protectedScript = applyProtection(originalScript, protectionLevel, scriptId);
        const protectedUrl = createProtectedUrl(protectedScript, protectionLevel, scriptId, bypassKey);

        // Выводим ссылку и Bypass Key в textarea (сразу виден создателю)
        const out = document.getElementById('protectedLink');
        if (out) out.value = protectedUrl + '\n\nBypass Key: ' + bypassKey;
        const resEl = document.getElementById('result');
        if (resEl) resEl.classList.remove('hidden');

        Logger.log('creation', `Создан защищенный скрипт: ${scriptUrl}`, scriptId);
        // НЕ логируем bypassKey в localStorage по соображениям приватности.
    } catch (error) {
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

// applyProtection (без включения scriptId в protectedScript — scriptId передаётся отдельно в лоадер)
function applyProtection(script, level, scriptId) {
    switch (level) {
        case 'basic':
            return btoa(unescape(encodeURIComponent(script)));
        case 'advanced':
            let advancedObfuscated = '';
            for (let i = 0; i < script.length; i++) {
                advancedObfuscated += String.fromCharCode(script.charCodeAt(i) ^ 0x42);
            }
            // advanced оставляем в формате base64(obf) :: (опционально можно добавить метаданные)
            return btoa(unescape(encodeURIComponent(advancedObfuscated)));
        case 'military':
            let militaryObfuscated = '';
            const key = 'MILITARY_GRADE_PROTECTION_KEY_2024';
            for (let i = 0; i < script.length; i++) {
                militaryObfuscated += String.fromCharCode(script.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            // military остаётся base64(obf) (timestamp и scriptId передаются в лоадер отдельно)
            return btoa(unescape(encodeURIComponent(militaryObfuscated)));
        default:
            return btoa(unescape(encodeURIComponent(script)));
    }
}

// createProtectedUrl: теперь принимает bypassKey и передаёт в createLoaderHtml
function createProtectedUrl(script, level, scriptId, bypassKey = '') {
    // Экранируем проблемные символы, чтобы корректно вставлять в шаблон HTML
    const escapedScript = script.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, "\\`");
    // createLoaderHtml находится в loader.js и ожидает (protectedScript, level, scriptId, bypassKey)
    const htmlContent = createLoaderHtml(escapedScript, level, scriptId, bypassKey);
    return 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(htmlContent)));
}

function copyLink() {
    const linkInput = document.getElementById('protectedLink');
    if (!linkInput) return;
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(() => {
        alert('✅ Ссылка скопирована!');
    }, (err) => {
        alert('Не удалось скопировать текст: ' + err);
    });
}
