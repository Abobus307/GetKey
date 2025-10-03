# Luarmor-like starter (GitHub-ready)

This repository is an educational starter for a Lua obfuscation + key validation service.
**Not production-ready. Use responsibly and legally.**

## Quick start (local)
1. Open terminal.
2. `cd server && npm install`
3. `node index.js`
4. Server runs on http://localhost:3000

## API
- `POST /api/generate-key` -> create a test key
- `POST /api/validate-key` (JSON `{ "key": "..." }`) -> validate key
- `POST /api/obfuscate` (multipart form: field `script`) -> returns obfuscated lua file

## Deploy
- Use GitHub Actions workflow in `.github/workflows/deploy.yml` (example for Heroku).
- Add secrets: `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL`.

## Warnings
- This obfuscator is demonstrational only.
- I will not help create malware, exploits or tools to bypass protections.

