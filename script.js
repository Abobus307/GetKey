class MultiStageAuth {
    constructor() {
        this.app = document.getElementById('app');
        this.configMode = document.getElementById('config-mode');
        this.executionMode = document.getElementById('execution-mode');
        this.openedStages = new Set();
        
        this.initEventListeners();
        this.checkUrlMode();
        
        // Проверяем возврат с этапов каждые 2 секунды
        setInterval(() => this.checkStagesReturn(), 2000);
    }

    initEventListeners() {
        // Конфигурация
        document.getElementById('stage-count').addEventListener('change', (e) => {
            this.renderStageConfigs(parseInt(e.target.value));
        });

        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateLink();
        });

        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyToClipboard('generated-link');
        });

        // Выполнение
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetProgress();
        });

        document.getElementById('copy-key-btn').addEventListener('click', () => {
            this.copyToClipboard('auth-key', true);
        });
    }

    checkUrlMode() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        if (params.has('config')) {
            this.showExecutionMode();
            this.loadExecutionConfig(params);
        } else {
            this.showConfigurationMode();
            this.renderStageConfigs(1);
        }
    }

    showConfigurationMode() {
        this.configMode.classList.remove('hidden');
        this.executionMode.classList.add('hidden');
    }

    showExecutionMode() {
        this.configMode.classList.add('hidden');
        this.executionMode.classList.remove('hidden');
    }

    renderStageConfigs(count) {
        const container = document.getElementById('stages-container');
        container.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const stageHTML = `
                <div class="stage-item">
                    <h3>Этап ${i}</h3>
                    <input type="url" 
                           id="stage-${i}-url" 
                           placeholder="https://example.com/task${i}"
                           required>
                    <textarea 
                        id="stage-${i}-desc" 
                        placeholder="Описание задания (опционально)"></textarea>
                </div>
            `;
            container.innerHTML += stageHTML;
        }
    }

    generateLink() {
        const stageCount = parseInt(document.getElementById('stage-count').value);
        const stages = [];

        for (let i = 1; i <= stageCount; i++) {
            const url = document.getElementById(`stage-${i}-url`).value;
            const description = document.getElementById(`stage-${i}-desc`).value;

            if (!url) {
                this.showNotification('Пожалуйста, заполните все URL', true);
                return;
            }

            if (!this.isValidUrl(url)) {
                this.showNotification(`Некорректный URL для этапа ${i}`, true);
                return;
            }

            stages.push({
                id: i,
                url: url,
                description: description
            });
        }

        const config = {
            version: "1.0",
            stages: stages,
            created: new Date().toISOString(),
            // Уникальный ID для каждой конфигурации
            uniqueId: this.generateUniqueId(),
            // Секретный ключ для верификации
            secret: this.generateSecret()
        };

        // Исправляем кодирование для поддержки Unicode
        const base64Config = this.encodeBase64(JSON.stringify(config));
        const link = `${window.location.origin}${window.location.pathname}#config=${base64Config}`;

        document.getElementById('generated-link').value = link;
        document.getElementById('result-container').classList.remove('hidden');
        
        this.showNotification('Ссылка успешно сгенерирована!');
    }

    // Безопасное кодирование Base64 для Unicode
    encodeBase64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, 
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));
    }

    // Безопасное декодирование Base64 для Unicode
    decodeBase64(str) {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    generateUniqueId() {
        // Генерируем уникальный ID на основе timestamp и случайных символов
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    generateSecret() {
        // Генерируем секретный ключ для верификации
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    loadExecutionConfig(params) {
        try {
            const base64Config = params.get('config');
            const config = JSON.parse(this.decodeBase64(base64Config));
            
            this.config = config;
            
            // Используем uniqueId конфигурации для хранения прогресса
            const storageKey = `auth_progress_${config.uniqueId}`;
            const keyStorageKey = `auth_key_${config.uniqueId}`;
            const timeStorageKey = `key_time_${config.uniqueId}`;
            
            this.progress = JSON.parse(localStorage.getItem(storageKey) || '[]');
            this.completedKey = localStorage.getItem(keyStorageKey);
            this.keyGeneratedAt = localStorage.getItem(timeStorageKey);

            // Проверяем, есть ли параметры завершения этапа в URL
            this.checkCompletionParams(params);

            this.renderExecutionStages();
            this.updateProgress();

            // Если ключ уже сгенерирован, показываем его
            if (this.completedKey) {
                this.showGeneratedKey();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.showNotification('Ошибка загрузки конфигурации', true);
        }
    }

    checkCompletionParams(params) {
        // Проверяем параметры завершения этапа
        if (params.has('complete') && params.has('stage') && params.has('token')) {
            const stageId = parseInt(params.get('stage'));
            const token = params.get('token');
            
            // Проверяем валидность токена
            if (this.verifyToken(stageId, token)) {
                this.markStageCompleted(stageId);
                
                // Очищаем URL от параметров завершения
                const newUrl = window.location.origin + window.location.pathname + 
                              window.location.hash.split('&')[0];
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }

    verifyToken(stageId, token) {
        // Проверяем токен на основе stageId и секрета конфигурации
        const expectedToken = this.generateToken(stageId);
        return token === expectedToken;
    }

    generateToken(stageId) {
        // Генерируем токен для этапа на основе stageId и секрета
        const data = `${stageId}-${this.config.secret}-${this.config.uniqueId}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 8);
    }

    renderExecutionStages() {
        const container = document.getElementById('stages-list');
        container.innerHTML = '';

        this.config.stages.forEach(stage => {
            const isCompleted = this.progress.includes(stage.id);
            const isCurrent = !isCompleted && 
                (this.progress.length === 0 || stage.id === Math.max(...this.progress) + 1);

            // Генерируем URL с токеном для автоматического подтверждения
            const completionUrl = this.generateCompletionUrl(stage.id);

            const stageHTML = `
                <div class="stage-execution ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="stage-header">
                        <div class="stage-title">Этап ${stage.id}</div>
                        <div class="stage-status ${isCompleted ? 'status-completed' : 'status-pending'}">
                            ${isCompleted ? '✅ Выполнено' : '⏳ Ожидание'}
                        </div>
                    </div>
                    ${stage.description ? `<div class="stage-description">${stage.description}</div>` : ''}
                    <div class="stage-info">
                        <strong>URL для подтверждения:</strong>
                        <div class="completion-url">${completionUrl}</div>
                        <small>Используйте этот URL на целевом сайте для автоматического подтверждения</small>
                    </div>
                    <div class="stage-actions">
                        <button class="btn-primary stage-open-btn" data-stage="${stage.id}" 
                                ${isCompleted ? 'disabled' : ''}>
                            📎 Перейти к заданию
                        </button>
                        <button class="btn-secondary stage-manual-btn" data-stage="${stage.id}" 
                                ${isCompleted ? 'disabled' : ''}>
                            ✅ Подтвердить вручную
                        </button>
                    </div>
                    ${!isCompleted ? `<div class="stage-timer" id="timer-${stage.id}"></div>` : ''}
                </div>
            `;
            container.innerHTML += stageHTML;
        });

        // Добавляем обработчики для новых кнопок
        document.querySelectorAll('.stage-open-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stageId = parseInt(e.target.dataset.stage);
                this.openStage(stageId);
            });
        });

        document.querySelectorAll('.stage-manual-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stageId = parseInt(e.target.dataset.stage);
                this.markStageCompleted(stageId);
            });
        });
    }

    generateCompletionUrl(stageId) {
        // Генерируем URL для автоматического подтверждения этапа
        const token = this.generateToken(stageId);
        const currentUrl = new URL(window.location);
        currentUrl.hash = `${window.location.hash.split('&')[0]}&complete=true&stage=${stageId}&token=${token}`;
        return currentUrl.toString();
    }

    openStage(stageId) {
        const stage = this.config.stages.find(s => s.id === stageId);
        if (stage) {
            // Сохраняем время открытия этапа с привязкой к конфигурации
            const stageData = {
                id: stageId,
                openedAt: new Date().toISOString(),
                url: stage.url,
                configId: this.config.uniqueId
            };
            localStorage.setItem(`stage_${this.config.uniqueId}_${stageId}`, JSON.stringify(stageData));
            
            // Добавляем в отслеживаемые этапы
            this.openedStages.add(stageId);
            
            // Запускаем таймер
            this.startStageTimer(stageId);
            
            // Показываем инструкцию
            this.showStageInstructions(stageId);
            
            this.showNotification(`Этап ${stageId} открыт. Используйте URL подтверждения на целевом сайте.`);
        }
    }

    showStageInstructions(stageId) {
        const completionUrl = this.generateCompletionUrl(stageId);
        const instructions = `
            <div class="instructions">
                <h3>Инструкция для этапа ${stageId}</h3>
                <p>Для автоматического подтверждения выполнения:</p>
                <ol>
                    <li>Перейдите на сайт задания</li>
                    <li>После выполнения задания, разместите где-нибудь на сайте ссылку:</li>
                    <div class="completion-url-box">
                        <input type="text" value="${completionUrl}" readonly>
                        <button onclick="navigator.clipboard.writeText('${completionUrl}')">Копировать</button>
                    </div>
                    <li>Или настройте редирект на этот URL после успешного выполнения</li>
                    <li>Или просто перейдите по этой ссылке после выполнения</li>
                </ol>
                <p><em>Если автоматическое подтверждение не работает, используйте кнопку "Подтвердить вручную"</em></p>
            </div>
        `;
        
        // Показываем модальное окно с инструкциями
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Инструкция для этапа ${stageId}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <p>Для автоматического подтверждения выполнения:</p>
                    <ol>
                        <li>Перейдите на сайт задания</li>
                        <li>После выполнения задания, разместите где-нибудь на сайте ссылку:</li>
                        <div class="completion-url-box">
                            <input type="text" value="${completionUrl}" readonly>
                            <button class="btn-secondary" onclick="navigator.clipboard.writeText('${completionUrl}'); auth.showNotification('URL скопирован!')">Копировать</button>
                        </div>
                        <li>Или настройте редирект на этот URL после успешного выполнения</li>
                        <li>Или просто перейдите по этой ссылке после выполнения</li>
                    </ol>
                    <p><em>Если автоматическое подтверждение не работает, используйте кнопку "Подтвердить вручную"</em></p>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Понятно</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчик закрытия модального окна
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // Открываем сайт этапа
        const stage = this.config.stages.find(s => s.id === stageId);
        if (stage) {
            window.open(stage.url, '_blank');
        }
    }

    startStageTimer(stageId) {
        const timerElement = document.getElementById(`timer-${stageId}`);
        if (!timerElement) return;

        const startTime = Date.now();
        
        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            timerElement.textContent = `⏱️ Прошло времени: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerElement.style.color = elapsed > 300 ? '#dc3545' : '#6c757d'; // Красный после 5 минут
            
        }, 1000);

        // Сохраняем ID таймера для очистки
        timerElement.dataset.timerId = timer;
    }

    checkStagesReturn() {
        // Эта функция теперь не нужна для автоматического подтверждения,
        // так как подтверждение происходит через URL параметры
    }

    markStageCompleted(stageId) {
        if (!this.progress.includes(stageId)) {
            this.progress.push(stageId);
            
            // Сохраняем прогресс с привязкой к конфигурации
            const storageKey = `auth_progress_${this.config.uniqueId}`;
            localStorage.setItem(storageKey, JSON.stringify(this.progress));
            
            // Очищаем таймер
            const timerElement = document.getElementById(`timer-${stageId}`);
            if (timerElement && timerElement.dataset.timerId) {
                clearInterval(parseInt(timerElement.dataset.timerId));
            }
            
            // Убираем из отслеживаемых
            this.openedStages.delete(stageId);
            localStorage.removeItem(`stage_${this.config.uniqueId}_${stageId}`);
            
            this.renderExecutionStages();
            this.updateProgress();
            
            this.showNotification(`Этап ${stageId} успешно завершен!`);

            // Проверяем, все ли этапы выполнены
            if (this.progress.length === this.config.stages.length) {
                this.generateAuthKey();
            }
        }
    }

    updateProgress() {
        const totalStages = this.config.stages.length;
        const completedStages = this.progress.length;
        const progressPercent = (completedStages / totalStages) * 100;

        document.getElementById('progress-fill').style.width = `${progressPercent}%`;
        document.getElementById('progress-text').textContent = 
            `${completedStages}/${totalStages} выполнено`;
    }

    generateAuthKey() {
        // Генерация ключа в формате AUTH-XXXX-XXXX-XXXX-XXXX
        const segments = [];
        for (let i = 0; i < 4; i++) {
            segments.push(this.generateRandomSegment());
        }
        
        this.completedKey = `AUTH-${segments.join('-')}`;
        this.keyGeneratedAt = new Date().toISOString();
        
        // Сохраняем ключ с привязкой к конфигурации
        const keyStorageKey = `auth_key_${this.config.uniqueId}`;
        const timeStorageKey = `key_time_${this.config.uniqueId}`;
        
        localStorage.setItem(keyStorageKey, this.completedKey);
        localStorage.setItem(timeStorageKey, this.keyGeneratedAt);
        
        this.showGeneratedKey();
        this.showNotification('Проверка успешно пройдена! Ключ сгенерирован.');
    }

    generateRandomSegment() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let segment = '';
        for (let i = 0; i < 4; i++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return segment;
    }

    showGeneratedKey() {
        const keyContainer = document.getElementById('key-container');
        const keyElement = document.getElementById('auth-key');
        const expiryElement = document.getElementById('key-expiry');

        keyElement.textContent = this.completedKey;
        
        const generatedAt = new Date(this.keyGeneratedAt);
        const expiresAt = new Date(generatedAt.getTime() + 12 * 60 * 60 * 1000);
        const now = new Date();
        
        if (now > expiresAt) {
            expiryElement.textContent = '❌ Ключ просрочен';
            expiryElement.style.color = '#dc3545';
        } else {
            const timeLeft = this.formatTimeLeft(expiresAt - now);
            expiryElement.textContent = `⏰ Истекает через: ${timeLeft}`;
            expiryElement.style.color = '#28a745';
        }

        keyContainer.classList.remove('hidden');
    }

    formatTimeLeft(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}ч ${minutes}м`;
    }

    resetProgress() {
        // Очищаем все таймеры
        this.config.stages.forEach(stage => {
            const timerElement = document.getElementById(`timer-${stage.id}`);
            if (timerElement && timerElement.dataset.timerId) {
                clearInterval(parseInt(timerElement.dataset.timerId));
            }
            localStorage.removeItem(`stage_${this.config.uniqueId}_${stage.id}`);
        });
        
        this.openedStages.clear();
        
        // Очищаем прогресс для этой конфигурации
        const storageKey = `auth_progress_${this.config.uniqueId}`;
        const keyStorageKey = `auth_key_${this.config.uniqueId}`;
        const timeStorageKey = `key_time_${this.config.uniqueId}`;
        
        localStorage.removeItem(storageKey);
        localStorage.removeItem(keyStorageKey);
        localStorage.removeItem(timeStorageKey);
        
        this.progress = [];
        this.completedKey = null;
        this.keyGeneratedAt = null;
        
        this.renderExecutionStages();
        this.updateProgress();
        document.getElementById('key-container').classList.add('hidden');
        
        this.showNotification('Прогресс сброшен');
    }

    copyToClipboard(elementId, isKey = false) {
        let text;
        if (isKey) {
            text = document.getElementById(elementId).textContent;
        } else {
            text = document.getElementById(elementId).value;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification(isKey ? 'Ключ скопирован!' : 'Ссылка скопирована!');
        }).catch(err => {
            console.error('Copy failed:', err);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification(isKey ? 'Ключ скопирован!' : 'Ссылка скопирована!');
        });
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showNotification(message, isError = false) {
        // Удаляем старые уведомления
        const oldNotifications = document.querySelectorAll('.notification');
        oldNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : ''}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Инициализация приложения
const auth = new MultiStageAuth();

// Обработка изменений hash для поддержки браузерной навигации
window.addEventListener('hashchange', () => {
    auth.checkUrlMode();
});

// Восстанавливаем отслеживание этапов при загрузке
window.addEventListener('load', () => {
    // Восстанавливаем открытые этапы из localStorage
    if (auth.config && auth.config.stages) {
        auth.config.stages.forEach(stage => {
            const stageData = localStorage.getItem(`stage_${auth.config.uniqueId}_${stage.id}`);
            if (stageData) {
                auth.openedStages.add(stage.id);
                auth.startStageTimer(stage.id);
            }
        });
    }
});
