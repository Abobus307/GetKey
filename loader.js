// loader.js

// Возвращает JS-код для деобфускации встраиваемый в лоадер
function getDecryptionCode(level) {
    switch(level) {
        case 'basic':
            // protectedScript — это base64 строки (utf8-safe), декодируем и получаем оригинал
            return `originalScript = decodeURIComponent(escape(atob(protectedScript)));`;
        case 'advanced':
            return `
                const parts = protectedScript.split('::');
                let decoded;
                try {
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

// Утилита надёжного base64 для Unicode (используем при формировании data URL)
function base64EncodeUnicode(str) {
    // Современный вариант: encodeURIComponent -> btoa(unescape(...)) работает корректно в большинстве браузеров.
    return btoa(unescape(encodeURIComponent(str)));
}

// createLoaderHtml — теперь безопасно встраивает protectedScript через JSON.stringify
// protectedScript: строка (base64 или base64::meta), level: 'basic'|'advanced'|'military', scriptId: уникальный id, bypassKey: опциональный
function createLoaderHtml(protectedScript, level, scriptId, bypassKey = '') {
    // Преобразуем protectedScript в JSON-литерал — это безопасно для любой содержимой строки (кавычки, переносы, юникод)
    const protectedScriptJsLiteral = JSON.stringify(protectedScript);
    const sanitizedBypassKey = String(bypassKey || '');

    // Логика логгирования и проверки — встраиваем как литералы тоже
    const loggingFunction = `
        const SCRIPT_ID = ${JSON.stringify(String(scriptId || ''))};
        const PROTECTION_LEVEL = ${JSON.stringify(String(level || 'basic'))};
        const MASTER_KEY = ${JSON.stringify('MASTER_KEY_123')};
        const BYPASS_KEY = ${JSON.stringify(sanitizedBypassKey)};

        function sendLog(type, details = {}) {
            try {
                var t = (type && typeof type.toUpperCase === 'function') ? type.toUpperCase() : String(type);
                console.warn('[LOGGING: ' + t + '] SCRIPT_ID: ' + SCRIPT_ID);
            } catch (e) {
                console.warn('[LOGGING: ERROR] SCRIPT_ID: ' + SCRIPT_ID, e);
            }
            console.log("Log Details:", details);
            // Здесь можно сделать fetch к бэкенду, если нужно реальное логгирование
        }

        // Логируем посещение
        sendLog('view', { status: 'Page loaded', level: PROTECTION_LEVEL, userAgent: navigator.userAgent });
        
        // protectedScript определяется ниже как JS-строка
        ` + `
        // функции управления доступом и дешифровкой будут объявлены далее
    `;

    // Получаем код дешифровки для выбранного уровня
    const decryptionCode = getDecryptionCode(level);

    // Собираем полный HTML лоадера — с meta charset и безопасной вставкой переменных
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ACCESS DENIED</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #000; color: #ff0000; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; flex-direction: column; }
        .skull { font-size: 80px; margin-bottom: 10px; color: #ff0000; text-shadow: 0 0 10px #ff0000; }
        .container { max-width: 720px; width: 92%; text-align: center; padding: 20px; box-sizing: border-box; }
        h1 { color: #ff0000; text-shadow: 0 0 5px #ff0000; font-size: 30px; margin-bottom: 10px; }
        .alert-box { background: rgba(255, 0, 0, 0.08); border: 1px solid #ff0000; padding: 12px; margin-bottom: 14px; border-radius: 6px; }
        .feature-box { background: #1a1a1a; border: 1px solid #444; padding: 8px; margin: 6px; display: inline-block; width: 44%; border-radius: 4px; font-size: 12px; color: #bbb; vertical-align: top; }
        .log-console { background: #0a0a0a; border: 1px solid #333; padding: 12px; margin-top: 16px; text-align: left; font-family: 'Courier New', monospace; font-size: 13px; color: #00ff00; max-height: 120px; overflow:auto; }
        .input-group { margin: 18px 0; }
        #ownerKeyInput, #bypassInput { padding: 10px; background: #000; border: 1px solid #ff0000; color: #ff0000; width: 220px; text-align: center; border-radius:4px; }
        #ownerSubmit, #bypassSubmit, #copyLuaBtn { padding: 8px 12px; background: #ff0000; color: #000; border: none; cursor: pointer; margin-left: 8px; font-weight: bold; border-radius: 4px; }
        .hidden { display: none; }
        #luaCodeOutput { width: 100%; box-sizing: border-box; height: 300px; background: #111; color: #00ff00; border: 1px solid #00ff00; margin-top: 10px; resize: vertical; padding:8px; }
        .small { font-size:12px; color:#aaa; margin-top:8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="skull">☠️</div>

        <div id="accessDenied">
            <h1>ACCESS DENIED</h1>

            <div class="alert-box">
                <p><strong>⚠️ SECURITY BREACH DETECTED ⚠️</strong></p>
                <p>Unauthorized browser access attempted</p>
                <p>This incident has been logged with your digital fingerprint</p>
            </div>

            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div class="feature-box">🔒 Military Encryption</div>
                <div class="feature-box">👁️ You Are Being Monitored</div>
                <div class="feature-box">⚡ Auto-Defense</div>
                <div class="feature-box">🍯 Honeypot System</div>
            </div>

            <div class="log-console">
                [SYSTEM] Scanning threat level...<br>
                [ALERT] Browser fingerprint logged<br>
                [ACTION] Deploying countermeasures...<br>
                [STATUS] <span id="errorStatus">Access permanently denied</span>
            </div>

            <div class="input-group">
                <input type="password" id="ownerKeyInput" placeholder="Owner MASTER key">
                <button id="ownerSubmit">Enter</button>
            </div>

            <div id="bypassGroup" class="input-group hidden">
                <input type="password" id="bypassInput" placeholder="Secondary bypass key">
                <button id="bypassSubmit">Submit</button>
                <div class="small">Secondary key — генерируется под ссылку (required for stronger protection).</div>
            </div>

            <div class="small" style="margin-top:14px; color:#666;">Error Code: 403 — You Cannot Access This Page</div>
        </div>

        <div id="ownerAccess" class="hidden">
            <h2>✅ Decrypting Script...</h2>
            <textarea id="luaCodeOutput" readonly></textarea>
            <div style="margin-top:10px; text-align:right;"><button id="copyLuaBtn">Copy Lua Code</button></div>
        </div>
    </div>

    <script>
        ${loggingFunction}

        // безопасно внутри страницы объявляем protectedScript как JS-строку
        const protectedScript = ${protectedScriptJsLiteral};

        // функция показать и заполнить результат
        function showDecryptedCodeImmediate() {
            let originalScript = '';
            try {
                ${decryptionCode}
                const out = document.getElementById('luaCodeOutput');
                if (out) out.value = originalScript;
            } catch (e) {
                const out = document.getElementById('luaCodeOutput');
                if (out) out.value = "Error decrypting script: " + e.message;
                sendLog('breach_failed', { error: e.message });
            }
        }

        // Проверки доступа (двухшаговые)
        function checkOwnerAccessStep1() {
            const inputEl = document.getElementById('ownerKeyInput');
            const input = inputEl ? inputEl.value : '';
            if (input === MASTER_KEY) {
                sendLog('owner_key_ok', { success: true });
                if (BYPASS_KEY && BYPASS_KEY.length > 0) {
                    // показать второй ввод
                    const bg = document.getElementById('bypassGroup');
                    if (bg) bg.classList.remove('hidden');
                    const as = document.getElementById('accessDenied');
                    if (as) as.classList.add('hidden');
                } else {
                    // нет BYPASS_KEY — показываем сразу
                    const denied = document.getElementById('accessDenied');
                    const owner = document.getElementById('ownerAccess');
                    if (denied) denied.classList.add('hidden');
                    if (owner) owner.classList.remove('hidden');
                    showDecryptedCodeImmediate();
                    sendLog('owner_access', { success: true, bypass: false });
                }
            } else {
                sendLog('attempted_breach', { success: false, key_tried: (input || '').substring(0,10) + '...' });
                const err = document.getElementById('errorStatus');
                if (err) err.textContent = 'Access key is invalid! Logging breach attempt...';
            }
        }

        function checkBypassKey() {
            const inEl = document.getElementById('bypassInput');
            const val = inEl ? inEl.value : '';
            if (!BYPASS_KEY || BYPASS_KEY.length === 0) {
                // защита второй ступени не задана — декодируем
                const denied = document.getElementById('accessDenied');
                const owner = document.getElementById('ownerAccess');
                if (denied) denied.classList.add('hidden');
                if (owner) owner.classList.remove('hidden');
                showDecryptedCodeImmediate();
                sendLog('owner_access', { success: true, bypass: false });
                return;
            }
            if (val === BYPASS_KEY) {
                const denied = document.getElementById('accessDenied');
                const owner = document.getElementById('ownerAccess');
                const bg = document.getElementById('bypassGroup');
                if (bg) bg.classList.add('hidden');
                if (denied) denied.classList.add('hidden');
                if (owner) owner.classList.remove('hidden');
                showDecryptedCodeImmediate();
                sendLog('owner_access', { success: true, bypass: true });
            } else {
                sendLog('attempted_breach', { success: false, bypass_key_tried: (val || '').substring(0,10) + '...' });
                const err = document.getElementById('errorStatus');
                if (err) err.textContent = 'Bypass key invalid! Logging attempt...';
            }
        }

        (function(){
            const ownerSubmit = document.getElementById('ownerSubmit');
            if (ownerSubmit) ownerSubmit.addEventListener('click', checkOwnerAccessStep1);
            const ownerInput = document.getElementById('ownerKeyInput');
            if (ownerInput) ownerInput.addEventListener('keyup', function(e){ if (e.key === 'Enter') checkOwnerAccessStep1(); });

            const bypassSubmit = document.getElementById('bypassSubmit');
            if (bypassSubmit) bypassSubmit.addEventListener('click', checkBypassKey);
            const bypassInput = document.getElementById('bypassInput');
            if (bypassInput) bypassInput.addEventListener('keyup', function(e){ if (e.key === 'Enter') checkBypassKey(); });

            const copyBtn = document.getElementById('copyLuaBtn');
            if (copyBtn) copyBtn.addEventListener('click', function(){
                const out = document.getElementById('luaCodeOutput');
                if (!out) return;
                out.select();
                try {
                    navigator.clipboard.writeText(out.value).then(function(){ alert('Lua code copied to clipboard!'); }, function(err){ alert('Не удалось скопировать: ' + err); });
                } catch (e) {
                    try { document.execCommand('copy'); alert('Lua code copied (fallback)'); } catch(e) {}
                }
            });
        })();
    </script>
</body>
</html>
`;

    return html;
}

// Создаём data URL для встроенного лоадера — используем charset=utf-8 и корректную base64-кодировку
function createLoaderDataUrl(protectedScript, level, scriptId, bypassKey = '') {
    const html = createLoaderHtml(protectedScript, level, scriptId, bypassKey);
    return 'data:text/html;charset=utf-8;base64,' + base64EncodeUnicode(html);
}

// Экспортируем функцию для использования внешним script.js (если проект использует прямой вызов)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createLoaderHtml, createLoaderDataUrl, getDecryptionCode };
}
