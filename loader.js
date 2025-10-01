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

// createLoaderHtml теперь принимает optional bypassKey (если пустой — второй шаг не нужен)
function createLoaderHtml(protectedScript, level, scriptId, bypassKey = '') {
    // Вставляем BYPASS_KEY и уровень защиты в лоадер. Не используем вложенные `${...}` в неожиданных местах.
    const loggingFunction = `
        const SCRIPT_ID = '${scriptId}';
        const PROTECTION_LEVEL = '${level}';
        const MASTER_KEY = 'MASTER_KEY_123';
        const BYPASS_KEY = '${bypassKey}'; // если пустая строка — второй шаг не обязателен
        
        function sendLog(type, details = {}) {
            try {
                var t = (type && typeof type.toUpperCase === 'function') ? type.toUpperCase() : String(type);
                console.warn('[LOGGING: ' + t + '] SCRIPT_ID: ' + SCRIPT_ID);
            } catch (e) {
                console.warn('[LOGGING: ERROR] SCRIPT_ID: ' + SCRIPT_ID, e);
            }
            console.log("Log Details:", details);
        }
        
        // Логируем посещение страницы
        sendLog('view', { status: 'Page loaded', level: PROTECTION_LEVEL, userAgent: navigator.userAgent });

        // Управление показом и контроль доступа
        function showDecryptedCode() {
            let originalScript = '';
            try {
                ${getDecryptionCode(level)}
                var out = document.getElementById('luaCodeOutput');
                if (out) out.value = originalScript;
            } catch (error) {
                var outErr = document.getElementById('luaCodeOutput');
                if (outErr) outErr.value = "Error decrypting script: " + error.message;
                sendLog('breach_failed', { error: error.message });
            }
        }

        function revealBypassInput() {
            var group = document.getElementById('bypassGroup');
            if (group) group.classList.remove('hidden');
            var ok = document.getElementById('ownerAccess');
            if (ok) ok.classList.add('hidden');
        }

        function checkOwnerAccessStep1() {
            var inputEl = document.getElementById('ownerKeyInput');
            var inputKey = inputEl ? inputEl.value : '';
            if (inputKey === MASTER_KEY) {
                sendLog('owner_key_ok', { success: true });
                if (BYPASS_KEY && BYPASS_KEY.length > 0) {
                    // Показываем второй шаг (bypass)
                    revealBypassInput();
                } else {
                    // Нет второго шага — показываем доступ и декодируем
                    var denied = document.getElementById('accessDenied');
                    var owner = document.getElementById('ownerAccess');
                    if (denied) denied.classList.add('hidden');
                    if (owner) owner.classList.remove('hidden');
                    showDecryptedCode();
                    sendLog('owner_access', { success: true, bypass: false });
                }
            } else {
                sendLog('attempted_breach', { success: false, key_tried: (inputKey || '').substring(0,10) + '...' });
                var errorStatusEl = document.getElementById('errorStatus');
                if (errorStatusEl) errorStatusEl.textContent = 'Access key is invalid! Logging breach attempt...';
            }
        }

        function checkBypassKey() {
            var bypassInput = document.getElementById('bypassInput');
            var b = bypassInput ? bypassInput.value : '';
            if (!BYPASS_KEY) {
                // Если ключа нет — просто декодируем (защита не задана)
                var denied = document.getElementById('accessDenied');
                var owner = document.getElementById('ownerAccess');
                if (denied) denied.classList.add('hidden');
                if (owner) owner.classList.remove('hidden');
                showDecryptedCode();
                sendLog('owner_access', { success: true, bypass: false });
                return;
            }
            if (b === BYPASS_KEY) {
                var denied = document.getElementById('accessDenied');
                var owner = document.getElementById('ownerAccess');
                var bypassGroup = document.getElementById('bypassGroup');
                if (bypassGroup) bypassGroup.classList.add('hidden');
                if (denied) denied.classList.add('hidden');
                if (owner) owner.classList.remove('hidden');
                showDecryptedCode();
                sendLog('owner_access', { success: true, bypass: true });
            } else {
                sendLog('attempted_breach', { success: false, bypass_key_tried: (b || '').substring(0,10) + '...' });
                var errorStatusEl = document.getElementById('errorStatus');
                if (errorStatusEl) errorStatusEl.textContent = 'Bypass key invalid! Logging attempt...';
            }
        }
    `;

    // HTML с meta charset и UI для второго шага (bypass)
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ACCESS DENIED</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #000; color: #ff0000; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; flex-direction: column; }
        .skull { font-size: 80px; margin-bottom: 10px; color: #ff0000; text-shadow: 0 0 10px #ff0000; }
        .container { max-width: 500px; width: 90%; text-align: center; }
        h1 { color: #ff0000; text-shadow: 0 0 5px #ff0000; font-size: 30px; margin-bottom: 20px; }
        .alert-box { background: rgba(255, 0, 0, 0.1); border: 1px solid #ff0000; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .alert-box p { margin: 5px 0; color: #fff; }
        .feature-box { background: #1a1a1a; border: 1px solid #444; padding: 10px; margin: 5px; display: inline-block; width: 45%; border-radius: 4px; font-size: 12px; color: #bbb; }
        .log-console { background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-top: 30px; text-align: left; font-family: 'Courier New', monospace; font-size: 14px; color: #00ff00; }
        .input-group { margin: 20px 0; }
        #ownerKeyInput, #bypassInput { padding: 10px; background: #000; border: 1px solid #ff0000; color: #ff0000; width: 200px; text-align: center; }
        #ownerSubmit, #bypassSubmit { padding: 10px 15px; background: #ff0000; color: #000; border: none; cursor: pointer; margin-left: 10px; font-weight: bold; border-radius: 4px; }
        .hidden { display: none; }
        #luaCodeOutput { width: 100%; box-sizing: border-box; height: 300px; background: #111; color: #00ff00; border: 1px solid #00ff00; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="skull">☠️</div>
        <div id="accessDenied">
            <h1>ACCESS DENIED</h1>
            <div class="alert-box">
                <p>⚠️ <strong>SECURITY BREACH DETECTED</strong> ⚠️</p>
                <p>Unauthorized browser access attempted</p>
                <p>This incident has been logged with your digital fingerprint</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
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
                <input type="password" id="ownerKeyInput" placeholder="Owner Bypass Key">
                <button id="ownerSubmit">Enter</button>
            </div>

            <div id="bypassGroup" class="input-group hidden">
                <input type="password" id="bypassInput" placeholder="Secondary Key">
                <button id="bypassSubmit">Submit</button>
                <div style="font-size:12px; color:#888; margin-top:8px;">This second key is generated per-link and is required for decryption.</div>
            </div>

            <div style="color: #444; margin-top: 20px;">Error Code: 403<br>You Cannot Access This Page</div>
        </div>

        <div id="ownerAccess" class="hidden">
            <h2>✅ Decrypting Script...</h2>
            <textarea id="luaCodeOutput" readonly></textarea>
            <button id="copyLuaBtn">Copy Lua Code</button>
        </div>
    </div>
    <script>
        const protectedScript = '${protectedScript}';
        
        ${loggingFunction}
        
        (function(){
            var copyBtn = document.getElementById('copyLuaBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', function(){
                    var luaCodeArea = document.getElementById('luaCodeOutput');
                    if (!luaCodeArea) return;
                    luaCodeArea.select();
                    try {
                        navigator.clipboard.writeText(luaCodeArea.value).then(function(){
                            alert('Lua code copied to clipboard!');
                        }, function(err){
                            alert('Не удалось скопировать: ' + err);
                        });
                    } catch (e) {
                        try { document.execCommand('copy'); alert('Lua code copied (fallback)'); } catch(e) {}
                    }
                });
            }

            var ownerSubmit = document.getElementById('ownerSubmit');
            if (ownerSubmit) ownerSubmit.addEventListener('click', checkOwnerAccessStep1);
            var ownerInput = document.getElementById('ownerKeyInput');
            if (ownerInput) ownerInput.addEventListener('keyup', function(e){ if (e.key === 'Enter') checkOwnerAccessStep1(); });

            var bypassSubmit = document.getElementById('bypassSubmit');
            if (bypassSubmit) bypassSubmit.addEventListener('click', checkBypassKey);
            var bypassInput = document.getElementById('bypassInput');
            if (bypassInput) bypassInput.addEventListener('keyup', function(e){ if (e.key === 'Enter') checkBypassKey(
