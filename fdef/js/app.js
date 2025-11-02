
/* Multi-stage Link Authenticator (split JS) */
/* Utilities */
function base64EncodeUnicode(str){ return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,function(m,p){return String.fromCharCode('0x'+p);})); }
function base64DecodeUnicode(str){ try{ return decodeURIComponent(Array.prototype.map.call(atob(str),function(c){ return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }catch(e){return null;} }
function parseHash(){ const hash = location.hash.replace(/^#/,''); if(!hash) return {}; return hash.split('&').reduce((acc,part)=>{ const [k,v]=part.split('='); acc[k]=v===undefined?null:decodeURIComponent(v); return acc; },{}); }
function buildHash(obj){ const parts=[]; for(const k in obj){ if(obj[k]!==undefined && obj[k]!==null && obj[k] !== '') parts.push(k+'='+encodeURIComponent(obj[k])); } return parts.join('&'); }
function encodeConfig(cfg){ return base64EncodeUnicode(JSON.stringify(cfg)); }
function decodeConfig(b64){ try{ const j=base64DecodeUnicode(b64); return JSON.parse(j);}catch(e){return null;} }
function isValidHttpUrl(s){ try{ const u=new URL(s); return u.protocol==='http:'||u.protocol==='https:' }catch(e){return false;} }
function copyToClipboard(text){ navigator.clipboard?.writeText(text).catch(()=>{ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }); }

/* DOM refs */
const numStages = document.getElementById('numStages');
const stagesContainer = document.getElementById('stagesContainer');
const generateBtn = document.getElementById('generateBtn');
const linkArea = document.getElementById('linkArea');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const openLinkBtn = document.getElementById('openLinkBtn');
const previewBtn = document.getElementById('previewBtn');
const clearBtn = document.getElementById('clearBtn');
const previewArea = document.getElementById('previewArea');
const projectName = document.getElementById('projectName');

const adminView = document.getElementById('adminView');
const execView = document.getElementById('execView');

const cfgInfo = document.getElementById('cfgInfo');
const execStages = document.getElementById('execStages');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const keyArea = document.getElementById('keyArea');
const keyStatus = document.getElementById('keyStatus');
const copyKeyBtn = document.getElementById('copyKeyBtn');
const execLink = document.getElementById('execLink');

/* Render stage inputs */
function renderStageInputs(){ stagesContainer.innerHTML=''; const n=parseInt(numStages.value,10); for(let i=1;i<=n;i++){ const div=document.createElement('div'); div.className='stage-row'; div.innerHTML = `
  <div class="stage-meta">
    <label>URL этапа ${i}</label>
    <input type="url" id="stageUrl_${i}" placeholder="https://example.com/task${i}">
    <div style="height:6px"></div>
    <label>Описание (опционально)</label>
    <input type="text" id="stageDesc_${i}" placeholder="Короткое описание">
  </div>
  <div style="width:120px;display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;color:var(--muted);text-align:center">ID: ${i}</div>
    <button class="btn ghost small" data-test="${i}">Проверить</button>
  </div>
`; stagesContainer.appendChild(div); div.querySelector('button[data-test]').addEventListener('click', ()=>{ const u=document.getElementById('stageUrl_'+i).value.trim(); if(isValidHttpUrl(u)) alert('URL валиден: '+u); else alert('URL неверный: '+(u||'(пустой)')); }); } }
numStages.addEventListener('change', renderStageInputs);
renderStageInputs();

/* Read config from inputs */
function readConfigFromInputs(){ const n=parseInt(numStages.value,10); const stages=[]; for(let i=1;i<=n;i++){ const url = document.getElementById('stageUrl_'+i).value.trim(); const desc = document.getElementById('stageDesc_'+i).value.trim(); stages.push({id:i, url, description: desc || undefined}); } return { version: "1.0", project: projectName.value.trim() || undefined, stages, created: new Date().toISOString() }; }

/* Generate link */
generateBtn.addEventListener('click', ()=>{ const cfg = readConfigFromInputs(); for(const s of cfg.stages){ if(!isValidHttpUrl(s.url)){ alert('Ошибка: некорректный URL: '+(s.url||'(пустой)')); return; } } const b64=encodeConfig(cfg); const base=location.origin+location.pathname; const link = `${base}#config=${b64}`; linkArea.textContent = link; previewArea.textContent = JSON.stringify(cfg, null, 2); copyToClipboard(link); alert('Ссылка с конфигурацией сгенерирована и скопирована в буфер обмена.'); });

copyLinkBtn.addEventListener('click', ()=>{ const txt=linkArea.textContent.trim(); if(txt && txt!=='—'){ copyToClipboard(txt); alert('Ссылка скопирована'); }});
openLinkBtn.addEventListener('click', ()=>{ const txt=linkArea.textContent.trim(); if(txt && txt!=='—') window.open(txt,'_blank'); });
clearBtn.addEventListener('click', ()=>{ if(!confirm('Удалить все значения полей?')) return; projectName.value=''; for(let i=1;i<=3;i++){ const a=document.getElementById('stageUrl_'+i), b=document.getElementById('stageDesc_'+i); if(a) a.value=''; if(b) b.value=''; } linkArea.textContent='—'; previewArea.textContent='—'; });

previewBtn.addEventListener('click', ()=>{ const cfg = readConfigFromInputs(); for(const s of cfg.stages){ if(!isValidHttpUrl(s.url)){ alert('Некорректный URL: '+(s.url||'(пустой)')); return; } } const b64=encodeConfig(cfg); location.hash = 'config=' + b64; checkUrlMode(); });

/* Execution mode */
function showExecutionMode(cfg, urlState){ adminView.classList.add('hidden'); execView.classList.remove('hidden'); execLink.textContent = location.origin + location.pathname + '#config=' + encodeConfig(cfg); cfgInfo.textContent = `Конфигурация: ${cfg.project||'(без имени)'} · создана: ${cfg.created} · этапов: ${cfg.stages.length}`; let progress = []; if(urlState && urlState.progress) progress = urlState.progress.split(',').filter(Boolean).map(x=>parseInt(x,10)); else { const ls = localStorage.getItem('auth_progress_' + encodeConfig(cfg)); if(ls) progress = ls.split(',').filter(Boolean).map(x=>parseInt(x,10)); } renderExecStages(cfg.stages, progress); if(urlState && urlState.key){ keyArea.textContent = urlState.key; copyKeyBtn.classList.remove('hidden'); copyKeyBtn.onclick = ()=>{ copyToClipboard(urlState.key); alert('Ключ скопирован'); }; if(urlState.keyCreated){ const created = new Date(decodeURIComponent(urlState.keyCreated)); checkKeyValidity(urlState.key, created); } } else { keyArea.textContent='—'; copyKeyBtn.classList.add('hidden'); keyStatus.textContent='—'; } resetProgressBtn.onclick = ()=>{ if(!confirm('Сбросить прогресс?')) return; const h = parseHash(); delete h.progress; delete h.key; delete h.keyCreated; location.hash = buildHash(h); localStorage.removeItem('auth_progress_' + encodeConfig(cfg)); checkUrlMode(); }; }

/* Render exec stages */
function renderExecStages(stages, progress){ execStages.innerHTML=''; for(const s of stages){ const done = progress.includes(s.id); const div = document.createElement('div'); div.className='stage-row'; div.innerHTML = `
  <div class="stage-meta">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div>
        <strong>Этап ${s.id}</strong>
        <div class="muted small">${s.description||''}</div>
      </div>
      <div class="muted small">Ссылка: <span style="font-family:monospace;font-size:12px">${s.url}</span></div>
    </div>
  </div>
  <div style="width:160px;display:flex;flex-direction:column;gap:8px" class="stage-actions">
    <button class="btn small ghost" data-open="${s.id}">Перейти</button>
    <button class="btn small ${done?''+' ghost':''}" data-toggle="${s.id}">${done? 'Выполнено' : 'Отметить'}</button>
  </div>
`; execStages.appendChild(div); div.querySelector('[data-open]').addEventListener('click', ()=> window.open(s.url,'_blank')); div.querySelector('[data-toggle]').addEventListener('click', async ()=>{ const h = parseHash(); let prog = []; if(h.progress) prog = h.progress.split(',').filter(Boolean).map(x=>parseInt(x,10)); else { const ls = localStorage.getItem('auth_progress_' + encodeConfig({version:"1.0",stages:stages,created:document.querySelector('#cfgInfo')?.textContent||new Date().toISOString()})); if(ls) prog = ls.split(',').filter(Boolean).map(x=>parseInt(x,10)); } if(prog.includes(s.id)) prog = prog.filter(x=>x!==s.id); else prog.push(s.id); const cfgB64 = encodeConfig({version:"1.0",stages:stages,created:document.querySelector('#cfgInfo')?.textContent||new Date().toISOString()}); localStorage.setItem('auth_progress_' + cfgB64, prog.join(',')); const newHash = Object.assign({}, h, {config: cfgB64, progress: prog.join(',')}); location.hash = buildHash(newHash); renderExecStages(stages, prog); if(prog.length === stages.length){ const keyObj = await generateKeyForCompletion(stages, prog); const keyStr = keyObj.key; const created = keyObj.created.toISOString(); const h2 = parseHash(); h2.config = encodeConfig({version:"1.0",stages:stages,created:document.querySelector('#cfgInfo')?.textContent||new Date().toISOString()}); h2.progress = prog.join(','); h2.key = keyStr; h2.keyCreated = encodeURIComponent(created); location.hash = buildHash(h2); keyArea.textContent = keyStr; copyKeyBtn.classList.remove('hidden'); copyKeyBtn.onclick = ()=>{ copyToClipboard(keyStr); alert('Ключ скопирован'); }; checkKeyValidity(keyStr, new Date(created)); } }); } }

/* Key generation */
async function generateKeyForCompletion(stages, progress){ const cfg = {version:"1.0",stages:stages,created:new Date().toISOString()}; const payload = JSON.stringify(cfg) + '|' + progress.join(',') + '|' + new Date().toISOString(); const enc = new TextEncoder().encode(payload); const hashBuf = await crypto.subtle.digest('SHA-256', enc); const hashArray = Array.from(new Uint8Array(hashBuf)); const hex = hashArray.map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(); const short = hex.slice(0,16); const formatted = 'AUTH-' + short.match(/.{1,4}/g).join('-'); return { key: formatted, created: new Date() }; }

/* Key validity */
function checkKeyValidity(key, createdDate){ if(!key || !createdDate){ keyStatus.textContent='—'; return; } const now = new Date(); const hours = (now - createdDate)/(1000*60*60); if(hours >= 12){ keyStatus.innerHTML = '<span style="color:var(--danger)">Ключ просрочен</span>'; copyKeyBtn.classList.add('hidden'); } else { const remain = 12 - hours; keyStatus.innerHTML = '<span style="color:var(--success)">Ключ валиден — осталось ' + remain.toFixed(2) + ' ч</span>'; copyKeyBtn.classList.remove('hidden'); } }

/* Mode detection */
function hasConfigInUrl(){ const h=parseHash(); return !!h.config; }
function checkUrlMode(){ const h = parseHash(); if(h.config){ const cfg = decodeConfig(h.config); if(!cfg){ alert('Ошибка декодирования конфига в URL'); adminView.classList.remove('hidden'); execView.classList.add('hidden'); return; } execView.dataset.created = cfg.created; showExecutionMode(cfg, h); } else { adminView.classList.remove('hidden'); execView.classList.add('hidden'); } }

/* Init */
window.addEventListener('load', ()=>{ checkUrlMode(); });
window.addEventListener('hashchange', checkUrlMode);

/* Preview update */
function updatePreview(){ try{ const cfg = readConfigFromInputs(); previewArea.textContent = JSON.stringify(cfg, null, 2); }catch(e){ previewArea.textContent='—'; } }
projectName.addEventListener('input', updatePreview);
stagesContainer.addEventListener('input', updatePreview);
numStages.addEventListener('change', updatePreview);
document.addEventListener('input', updatePreview);
