// server/lib/obfuscator.js
// Лёгкая демонстрационная обфускация — minify + удаление комментариев.
// Не претендует на абсолютную защиту — лишь усложняет чтение wrapper'а.

function stripComments(s) {
  return s.replace(/--\[=*[\s\S]*?\]=*\]|--.*$/gm, '');
}

function minifyWhitespace(s) {
  return s.replace(/[\t\r]+/g, ' ').replace(/ +/g,' ').replace(/\n{2,}/g,'\n').trim();
}

function renameLocals(source) {
  // Примитивный renamer (только для демонстрации, небезопасен для сложных скриптов)
  let idx = 0;
  const map = {};
  return source.replace(/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, (m, name) => {
    if (map[name]) return 'local ' + map[name];
    const newName = 'v' + (idx++);
    map[name] = newName;
    return 'local ' + newName;
  });
}

function obfuscateLua(src) {
  let s = src;
  s = stripComments(s);
  s = minifyWhitespace(s);
  s = renameLocals(s);
  return s;
}

module.exports = { obfuscateLua };
