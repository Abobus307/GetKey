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

function createLoaderHtml(protectedScript, level, scriptId) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Protected Content</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #000; color: #ff0000; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
        .container { max-width: 800px; width: 100%; border: 2px solid #ff0000; padding: 20px; background: #111; }
        .hidden { display: none; }
        .security-alert { border: 1px solid #ff0000; padding: 15px; margin: 10px 0; background: rgba(255, 0, 0, 0.1); }
        .system-log { background: #111; padding: 10px; margin: 10px 0; border-left: 3px solid #ff0000; }
        #ownerKeyInput { padding: 10px; background: #000; border: 1px solid gold; color: gold; width: 250px; }
        #ownerSubmit { padding: 10px 20px; background: gold; color: #000; border: none; cursor: pointer; margin-left: 10px; }
        .owner-hint { color: #888; font-size: 12px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="accessDenied">
            <h1>ACCESS DENIED</h1>
            <div class="security-alert">Security system activated</div>
            <div class="system-log">[SYSTEM] Access restricted. Waiting for key.</div>
            <div style="margin: 20px 0;">
                <input type="password" id="ownerKeyInput" placeholder="Owner Access Key">
                <button id="ownerSubmit">Access</button>
                <div class="owner-hint">Press Shift+Ctrl+Space for quick access</div>
            </div>
        </div>
        <div id="ownerAccess" class="hidden">
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
        
        function logAccess(type, message) {
            console.log('ACCESS LOG:', { scriptId, type, message, timestamp: new Date().toISOString() });
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
        
        document.getElementById('ownerSubmit').addEventListener('click', checkOwnerAccess);
        document.getElementById('ownerKeyInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') checkOwnerAccess();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                document.getElementById('ownerKeyInput').focus();
            }
        });
        
        logAccess('access_denied', 'Protected content loaded, waiting for key.');
    <\/script>
</body>
</html>`;
}
