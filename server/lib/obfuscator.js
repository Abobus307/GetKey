// Очень упрощённый "обфускатор" — только для примера.
// * НЕ является надёжной защитой и может ломать сложные скрипты.

function stripComments(s){
  return s.replace(/--\[=*\[[\s\S]*?\]=*\]|--.*$/gm, '');
}

function minifyWhitespace(s){
  return s.replace(/[\t\r]+/g, ' ').replace(/ +/g,' ').replace(/\n{2,}/g,'\n');
}

function renameLocals(source){
  // Примитив: заменяем локальные идентификаторы `local foo =` на short variables v0,v1...
  // ВАЖНО: это очень хрупко — для демонстрации только.
  let idx=0;
  const map = {};
  return source.replace(/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, (m, name)=>{
    if(map[name]) return 'local ' + map[name];
    const newName = 'v' + (idx++);
    map[name]=newName;
    return 'local ' + newName;
  });
}

function wrapBase64(s){
  const b = Buffer.from(s, 'utf8').toString('base64');
  return `local b='${b}'\nlocal decoded = (function(b64)\n  local b='';\n  local chunks = {}\n  -- NOTE: minimal base64 decode for demo only\n  local map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='\n  local function idx_of(c) return string.find(map, c, 1, true) - 1 end\n  b64 = b64:gsub('\n',''):gsub('\r','')\n  local out = {}\n  local i=1\n  while i <= #b64 do\n    local a = idx_of(b64:sub(i,i)) or 0;\n    local b = idx_of(b64:sub(i+1,i+1)) or 0;\n    local c = idx_of(b64:sub(i+2,i+2)) or 0;\n    local d = idx_of(b64:sub(i+3,i+3)) or 0;\n    local n = (a<<18) | (b<<12) | (c<<6) | d\n    local c1 = (n >> 16) & 0xFF\n    local c2 = (n >> 8) & 0xFF\n    local c3 = n & 0xFF\n    if b64:sub(i+2,i+2) == '=' then\n      out[#out+1] = string.char(c1)\n    elseif b64:sub(i+3,i+3) == '=' then\n      out[#out+1] = string.char(c1, c2)\n    else\n      out[#out+1] = string.char(c1, c2, c3)\n    end\n    i = i + 4\n  end\n  return table.concat(out)\nend)(b)\nloadstring(decoded)()`;
}

function obfuscateLua(src){
  let s = src;
  s = stripComments(s);
  s = minifyWhitespace(s);
  s = renameLocals(s);
  return wrapBase64(s);
}

module.exports = { obfuscateLua };
