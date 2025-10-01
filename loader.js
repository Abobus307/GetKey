function getDecryptionCode(level) {
    // Эта функция остается без изменений
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

function createLoaderHtml(protectedScript, level, scriptId) {
    // Вся логика меняется здесь
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
        const MASTER_KEY = 'MASTER_KEY_123';
        
        function showDecryptedCode() {
            let originalScript = '';
            try {
                // Код деобфускации остается тем же
                ${getDecryptionCode(level)}
                
                // ИЗМЕНЕНО: Помещаем результат в textarea
                document.getElementById('luaCodeOutput').value = originalScript;
                
            } catch (error) {
                document.getElementById('luaCodeOutput').value = "Error decrypting script: " + error.message;
            }
        }

        function checkOwnerAccess() {
            const inputKey = document.getElementById('ownerKeyInput').value;
            if (inputKey === MASTER_KEY) {
                document.getElementById('accessDenied').classList.add('hidden');
                document.getElementById('ownerAccess').classList.remove('hidden');
                showDecryptedCode();
            } else {
                alert('Invalid access key!');
            }
        }
        
        // ИЗМЕНЕНО: Кнопка для копирования LUA кода
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
    <\/script>
</body>
</html>`;
}
