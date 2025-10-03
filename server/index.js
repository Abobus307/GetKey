// server/index.js (updated) — включает автоматический static-serve для public/
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { obfuscateLua } = require('./lib/obfuscator');

const app = express();
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

const DATA_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');
const OBF_DIR = path.join(DATA_DIR, 'obf');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: [] }, null, 2));
if (!fs.existsSync(OBF_DIR)) fs.mkdirSync(OBF_DIR, { recursive: true });

function readKeys() { return JSON.parse(fs.readFileSync(KEYS_FILE)); }
function writeKeys(obj) { fs.writeFileSync(KEYS_FILE, JSON.stringify(obj, null, 2)); }

function genId(len = 12) {
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0, len);
}

/* ------------------ Static files (auto-detect public dir) ------------------ */
// Try server/public then ../public (repo root)
let publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  const up = path.join(__dirname, '..', 'public');
  if (fs.existsSync(up)) publicDir = up;
}
// If found, serve it
if (fs.existsSync(publicDir)) {
  console.log('[static] Serving public files from:', publicDir);
  app.use(express.static(publicDir));
  // Fallback: serve index.html on unknown GET (helpful for SPA)
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  app.get('*', (req, res, next) => {
    // If request accepts html, serve index.html (SPA fallback)
    if (req.accepts('html')) {
      const i = path.join(publicDir, 'index.html');
      if (fs.existsSync(i)) return res.sendFile(i);
    }
    next();
  });
} else {
  console.log('[static] public dir not found. No static files served.');
}

/* ------------------ API: keys / obfuscation / retrieval ------------------ */

/**
 * 1) Генерация ключа
 */
app.post('/api/generate-key', (req, res) => {
  const keys = readKeys();
  const key = 'K-' + Math.random().toString(36).slice(2, 12).toUpperCase();
  keys.keys.push({ key, created: Date.now(), active: true, usesLeft: null });
  writeKeys(keys);
  res.json({ ok: true, key });
});

/**
 * 2) Валидация ключа
 */
app.post('/api/validate-key', (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'no key' });
  const keys = readKeys();
  const found = keys.keys.find(k => k.key === key && k.active);
  res.json({ ok: !!found });
});

/**
 * 3) Обфускация + сохранение оригинала => отдаём wrapper
 */
app.post('/api/obfuscate', upload.single('script'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file' });
  const src = fs.readFileSync(req.file.path, 'utf8');
  fs.unlinkSync(req.file.path);

  const watermark = `-- watermark:${genId(8)}\n`;
  const srcWithWatermark = watermark + src;

  const id = genId(14);
  const outPath = path.join(OBF_DIR, id + '.lua');
  fs.writeFileSync(outPath, srcWithWatermark, 'utf8');

  const serverBase = (process.env.SERVER_BASE_URL || '').replace(/\/$/, '');
  const wrapper = `
-- AUTO-GENERATED WRAPPER (demo protection)
local HttpService = game:GetService('HttpService')
local id = "${id}"
local server = "${serverBase}" or ("http://YOUR_SERVER")
local function fetch_and_run(key)
  local ok, res = pcall(function()
    return HttpService:PostAsync(server..'/api/retrieve-script', HttpService:JSONEncode({ id = id, key = key }), Enum.HttpContentType.ApplicationJson)
  end)
  if not ok then
    error('failed to contact server: '..tostring(res))
  end
  local data = HttpService:JSONDecode(res)
  if not data.ok or not data.script then
    error('invalid response from server')
  end
  local b64 = data.script
  local function b64dec(s)
    local chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    local t = {}
    for i=1,#s,4 do
      local a = (string.find(chars, s:sub(i,i), 1, true) or 0)
      local b = (string.find(chars, s:sub(i+1,i+1), 1, true) or 0)
      local c = (string.find(chars, s:sub(i+2,i+2), 1, true) or 0)
      local d = (string.find(chars, s:sub(i+3,i+3), 1, true) or 0)
      local num = (a-1)<<18 | (b-1)<<12 | (c-1)<<6 | (d-1)
      local c1 = (num >> 16) & 0xFF
      local c2 = (num >> 8) & 0xFF
      local c3 = num & 0xFF
      t[#t+1] = string.char(c1)
      if s:sub(i+2,i+2) ~= '=' then t[#t+1] = string.char(c2) end
      if s:sub(i+3,i+3) ~= '=' then t[#t+1] = string.char(c3) end
    end
    return table.concat(t)
  end
  local decoded = b64dec(b64)
  local f, e = loadstring(decoded)
  if not f then error('load error: '..tostring(e)) end
  return f()
end
return { fetch_and_run = fetch_and_run, __id = id }
`;

  const obfWrapper = obfuscateLua(wrapper);
  res.setHeader('Content-Disposition', `attachment; filename=wrapper_${id}.lua`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(obfWrapper);
});

/**
 * 4) retrieve-script
 */
app.post('/api/retrieve-script', (req, res) => {
  const { id, key } = req.body || {};
  if (!id || !key) return res.status(400).json({ ok: false, error: 'id/key required' });

  const keys = readKeys();
  const found = keys.keys.find(k => k.key === key && k.active);
  if (!found) return res.json({ ok: false, error: 'invalid key' });

  if (found.usesLeft !== null) {
    if (found.usesLeft <= 0) return res.json({ ok: false, error: 'key exhausted' });
    found.usesLeft = found.usesLeft - 1;
    writeKeys(keys);
  }

  const filePath = path.join(OBF_DIR, id + '.lua');
  if (!fs.existsSync(filePath)) return res.json({ ok: false, error: 'not found' });
  const script = fs.readFileSync(filePath, 'utf8');
  const b64 = Buffer.from(script, 'utf8').toString('base64');

  console.log(`[serve] id=${id} key=${key} ip=${req.ip} time=${new Date().toISOString()}`);
  res.json({ ok: true, script: b64 });
});

/* demo admin (protect in prod) */
app.get('/api/_list-keys-demo-only', (req, res) => {
  res.json(readKeys());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
