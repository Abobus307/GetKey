async function postJSON(url, data){
  const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return res.json();
}

document.getElementById('generateKey').addEventListener('click', async ()=>{
  const btn = document.getElementById('generateKey');
  btn.disabled = true;
  const res = await postJSON('/api/generate-key', {});
  btn.disabled = false;
  if(res.ok){
    document.getElementById('generatedKey').value = res.key;
  } else {
    alert('Ошибка генерации ключа');
  }
});

document.getElementById('checkKeyBtn').addEventListener('click', async ()=>{
  const k = document.getElementById('checkKeyInput').value.trim();
  if(!k) return alert('Введите ключ');
  const res = await postJSON('/api/validate-key', { key: k });
  document.getElementById('checkKeyResult').textContent = res.ok ? '✔ Валиден' : '✖ Неверный';
});

document.getElementById('obfuscateBtn').addEventListener('click', async ()=>{
  const fileInput = document.getElementById('scriptFile');
  const status = document.getElementById('status');
  if(!fileInput.files || fileInput.files.length === 0){ alert('Выберите файл .lua'); return; }
  const file = fileInput.files[0];
  const form = new FormData();
  form.append('script', file, file.name);
  status.textContent = 'Загружаю и обфусцирую...';
  try {
    const res = await fetch('/api/obfuscate', { method: 'POST', body: form });
    if(!res.ok){ status.textContent = 'Ошибка: ' + res.status; return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obf.lua';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    status.textContent = 'Готово — файл скачан.';
  } catch(e){
    status.textContent = 'Ошибка: ' + e.message;
  }
});
