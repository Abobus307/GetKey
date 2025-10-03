// Простая серверная часть на Node.js + Express
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { obfuscateLua } = require('./lib/obfuscator');

const app = express();
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

const KEYS_FILE = path.join(__dirname, 'data', 'keys.json');
if(!fs.existsSync(path.dirname(KEYS_FILE))) fs.mkdirSync(path.dirname(KEYS_FILE), { recursive: true });
if(!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: [] }, null, 2));

function readKeys(){ return JSON.parse(fs.readFileSync(KEYS_FILE)); }
function writeKeys(obj){ fs.writeFileSync(KEYS_FILE, JSON.stringify(obj, null, 2)); }

// Генерация ключа (простая)
app.post('/api/generate-key', (req, res) => {
  const keys = readKeys();
  const key = 'K-' + Math.random().toString(36).slice(2, 12).toUpperCase();
  keys.keys.push({ key, created: Date.now(), active: true });
  writeKeys(keys);
  res.json({ ok: true, key });
});

// Проверка ключа
app.post('/api/validate-key', (req, res) => {
  const { key } = req.body || {};
  if(!key) return res.status(400).json({ ok:false, error: 'no key' });
  const keys = readKeys();
  const found = keys.keys.find(k => k.key === key && k.active);
  res.json({ ok: !!found });
});

// Загружает lua-файл, вшивает whitelist / обфусцирует
app.post('/api/obfuscate', upload.single('script'), (req, res) => {
  if(!req.file) return res.status(400).json({ ok:false, error: 'no file' });
  const src = fs.readFileSync(req.file.path, 'utf8');
  // тут можно вставить whitelist/кейсы. Для примера — просто обфусцируем
  const obf = obfuscateLua(src);
  fs.unlinkSync(req.file.path);
  res.setHeader('Content-Disposition', 'attachment; filename=obf.lua');
  res.send(obf);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server started on ${PORT}`));
