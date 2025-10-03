# Luarmor protection - runtime delivery

This package implements runtime-delivery protection: originals are stored server-side
and wrapper modules fetch the script at runtime only with a valid key.

Replace server/index.js and server/lib/obfuscator.js with these files, commit and deploy.
Set SERVER_BASE_URL env var to your public URL (eg. https://my-app.onrender.com) so wrapper uses it.
