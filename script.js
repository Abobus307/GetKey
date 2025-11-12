// script.js
(() => {
  const params = new URLSearchParams(window.location.search);
  const stagesParam = params.get('stages');

  const actionBtn = document.getElementById('actionBtn');
  const instructions = document.getElementById('instructions');
  const warning = document.getElementById('warning');
  const reloadBtn = document.getElementById('reloadBtn');
  const success = document.getElementById('success');

  if (!stagesParam) {
    instructions.textContent = 'Ошибка: не переданы этапы в параметре stages.';
    actionBtn.style.display = 'none';
    return;
  }

  // Парсим ссылки этапов (разделены запятыми)
  const stages = stagesParam.split(',').map(s => decodeURIComponent(s.trim()));

  let currentStage = -1;
  let passedStages = [];

  function showWarning() {
    warning.classList.remove('hidden');
    actionBtn.disabled = true;
    instructions.textContent = '';
  }

  function reset() {
    currentStage = -1;
    passedStages = [];
    warning.classList.add('hidden');
    success.classList.add('hidden');
    instructions.textContent = 'Нажмите кнопку "Start", чтобы пройти все этапы проверки.';
    actionBtn.textContent = 'Start';
    actionBtn.disabled = false;
  }

  function showSuccess() {
    success.classList.remove('hidden');
    instructions.textContent = '';
    actionBtn.style.display = 'none';
  }

  actionBtn.onclick = () => {
    if (currentStage === -1 && actionBtn.textContent === 'Start') {
      // Стартуем с первого этапа
      currentStage = 0;
      window.open(stages[currentStage], '_blank');
      instructions.textContent = `Пройдите этап ${currentStage + 1} и вернитесь сюда.`;
      actionBtn.textContent = 'Далее';
      return;
    }

    // Проверяем, что этап не был пропущен
    if (passedStages.includes(currentStage)) {
      showWarning();
      return;
    }

    // Помечаем текущий этап как пройденный
    passedStages.push(currentStage);

    currentStage++;

    if (currentStage >= stages.length) {
      // Все этапы пройдены
      showSuccess();
      return;
    }

    // Открываем следующую ссылку
    window.open(stages[currentStage], '_blank');
    instructions.textContent = `Пройдите этап ${currentStage + 1} и вернитесь сюда.`;
  };

  reloadBtn.onclick = () => {
    reset();
  };

  // Инициализация
  reset();

})();
