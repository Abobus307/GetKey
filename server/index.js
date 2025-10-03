// server/index.js
// Express server — obfuscation -> сохраняем оригинал в data/obf/<id>.lua
// и возвращаем "wrapper" lua, который при выполнении запрашивает у сервера реальный скрипт

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

/**
 * 1) Генерация ключа — вернёт key и id (можно добавить owner, uses, expiry)
 */
app.post('/api/generate-key', (req, res) => {
  const keys = readKeys();
  const key = 'K-' + Math.random().toString(36).slice(2, 12).toUpperCase();
  // добавим поле usesLeft для контроля раздачи / ограничения
  keys.keys.push({ key, created: Date.now(), active: true, usesLeft: null /* null = неограниченно */ });
  writeKeys(keys);
  res.json({ ok: true, key });
});

/**
 * 2) Валидация ключа (простая)
 */
app.post('/api/validate-key', (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'no key' });
  const keys = readKeys();
  const found = keys.keys.find(k => k.key === key && k.active);
  res.json({ ok: !!found });
});

/**
 * 3) Обфускация + сохранение оригинала:
 *    - сохраняем оригинал в server/data/obf/<id>.lua
 *    - возвращаем клиенту wrapper.lua, который при выполнении сделает POST /api/retrieve-script
 *      с { id, key } и получит обратно base64(script) — после чего выполнит его.
 *
 * Это значит: чтобы скрипт выполнился на клиенте, требуется валидный ключ и доступ к серверу.
 */
app.post('/api/obfuscate', upload.single('script'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file' });
  const src = fs.readFileSync(req.file.path, 'utf8');
  fs.unlinkSync(req.file.path);

  // OPTIONAL: вшиваем водяную метку/идентификатор в исходник (чтобы можно было отследить утечь)
  const watermark = `-- watermark:${genId(8)}\n`;
  const srcWithWatermark = watermark + src;

  // Сохраняем оригинал (можно применять шифрование на диске, но для демо оставим plain)
  const id = genId(14);
  const outPath = path.join(OBF_DIR, id + '.lua');
  fs.writeFileSync(outPath, srcWithWatermark, 'utf8');

  // Дополнительно: сделаем лёгкую локальную обфускацию для самой обёртки (wrapper даст минимум инфы)
  // Но не обфусцируем оригинал — он будет доставляться по запросу при исполнении.
  const serverBase = (process.env.SERVER_BASE_URL || '').replace(/\/$/, ''); // например https://example.com
  // wrapper: минимальный lua код, который POST'ит { id, key } и получает base64(script), выполняет
  const wrapper = `
-- AUTO-GENERATED WRAPPER (demo protection)
local HttpService = game:GetService('HttpService')
local id = "${id}"
local server = "${serverBase}" or ("http://YOUR_SERVER") -- замените на ваш URL (или задайте env SERVER_BASE_URL)
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
  -- script is base64 encoded
  local b64 = data.script
  local function b64dec(s)
    local chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    local t = {}
    local n=0
    for i=1,#s,4 do
      local a = string.find(chars, s:sub(i,i), 1, true) or 0
      local b = string.find(chars, s:sub(i+1,i+1), 1, true) or 0
      local c = string.find(chars, s:sub(i+2,i+2), 1, true) or 0
      local d = string.find(chars, s:sub(i+3,i+3), 1, true) or 0
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

-- Example usage:
-- local key = 'ВАШ_КЛЮЧ'
-- fetch_and_run(key)

return {
  fetch_and_run = fetch_and_run,
  __id = id
}
`;

  // небольшая локальная "обфускация" обертки (minify)
  const obfWrapper = obfuscateLua(wrapper);

  // Отдаём wrapper.lua клиенту в ответе (content-disposition attachment)
  res.setHeader('Content-Disposition', `attachment; filename=wrapper_${id}.lua`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(obfWrapper);
});

/**
 * 4) Endpoint: retrieve-script
 *    Приходит: { id, key }
 *    Сервер проверяет ключ и возвращает base64(original_script) если валиден.
 *    Можно добавить: usesLeft--, IP/HWID привязку, TTL, logging и т.д.
 */
app.post('/api/retrieve-script', (req, res) => {
  const { id, key } = req.body || {};
  if (!id || !key) return res.status(400).json({ ok: false, error: 'id/key required' });

  // validate key
  const keys = readKeys();
  const found = keys.keys.find(k => k.key === key && k.active);
  if (!found) return res.json({ ok: false, error: 'invalid key' });

  // Optional: enforce usesLeft
  if (found.usesLeft !== null) {
    if (found.usesLeft <= 0) return res.json({ ok: false, error: 'key exhausted' });
    found.usesLeft = found.usesLeft - 1;
    writeKeys(keys);
  }

  const filePath = path.join(OBF_DIR, id + '.lua');
  if (!fs.existsSync(filePath)) return res.json({ ok: false, error: 'not found' });
  const script = fs.readFileSync(filePath, 'utf8');
  const b64 = Buffer.from(script, 'utf8').toString('base64');

  // Logging: можно логировать время, IP, user-agent
  console.log(`[serve] id=${id} key=${key} ip=${req.ip} time=${new Date().toISOString()}`);

  res.json({ ok: true, script: b64 });
});

/**
 * 5) Admin: list keys (demo) — в продакшене защитить доступ
 */
app.get('/api/_list-keys-demo-only', (req, res) => {
  res.json(readKeys());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
