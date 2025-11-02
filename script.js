class MultiStageAuth {
    constructor() {
        this.app = document.getElementById('app');
        this.configMode = document.getElementById('config-mode');
        this.executionMode = document.getElementById('execution-mode');
        
        this.initEventListeners();
        this.checkUrlMode();
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
            created: new Date().toISOString()
        };

        const base64Config = btoa(JSON.stringify(config));
        const link = `${window.location.origin}${window.location.pathname}#config=${base64Config}`;

        document.getElementById('generated-link').value = link;
        document.getElementById('result-container').classList.remove('hidden');

        // Генерация QR-кода
        this.generateQRCode(link);
        
        this.showNotification('Ссылка успешно сгенерирована!');
    }

    generateQRCode(text) {
        const container = document.getElementById('qr-code');
        container.innerHTML = '';
        
        QRCode.toCanvas(container, text, {
            width: 200,
            height: 200,
            margin: 1
        }, function (error) {
            if (error) console.error(error);
        });
    }

    loadExecutionConfig(params) {
        try {
            const base64Config = params.get('config');
            const config = JSON.parse(atob(base64Config));
            
            this.config = config;
            this.progress = JSON.parse(localStorage.getItem('auth_progress') || '[]');
            this.completedKey = localStorage.getItem('auth_key');
            this.keyGeneratedAt = localStorage.getItem('key_generated_at');

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

    renderExecutionStages() {
        const container = document.getElementById('stages-list');
        container.innerHTML = '';

        this.config.stages.forEach(stage => {
            const isCompleted = this.progress.includes(stage.id);
            const isCurrent = !isCompleted && 
                (this.progress.length === 0 || stage.id === Math.max(...this.progress) + 1);

            const stageHTML = `
                <div class="stage-execution ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="stage-header">
                        <div class="stage-title">Этап ${stage.id}</div>
                        <div class="stage-status ${isCompleted ? 'status-completed' : 'status-pending'}">
                            ${isCompleted ? '✅ Выполнено' : '⏳ Ожидание'}
                        </div>
                    </div>
                    ${stage.description ? `<div class="stage-description">${stage.description}</div>` : ''}
                    <div class="stage-actions">
                        <button class="btn-primary" onclick="auth.openStage(${stage.id})" 
                                ${isCompleted ? 'disabled' : ''}>
                            📎 Перейти к заданию
                        </button>
                        <button class="btn-secondary" onclick="auth.markStageCompleted(${stage.id})" 
                                ${isCompleted ? 'disabled' : ''}>
                            ✅ Отметить выполненным
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += stageHTML;
        });
    }

    openStage(stageId) {
        const stage = this.config.stages.find(s => s.id === stageId);
        if (stage) {
            window.open(stage.url, '_blank');
        }
    }

    markStageCompleted(stageId) {
        if (!this.progress.includes(stageId)) {
            this.progress.push(stageId);
            localStorage.setItem('auth_progress', JSON.stringify(this.progress));
            
            this.renderExecutionStages();
            this.updateProgress();
            
            this.showNotification(`Этап ${stageId} отмечен выполненным!`);

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
        
        localStorage.setItem('auth_key', this.completedKey);
        localStorage.setItem('key_generated_at', this.keyGeneratedAt);
        
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
        localStorage.removeItem('auth_progress');
        localStorage.removeItem('auth_key');
        localStorage.removeItem('key_generated_at');
        
        this.progress = [];
        this.completedKey = null;
        this.keyGeneratedAt = null;
        
        this.renderExecutionStages();
        this.updateProgress();
        document.getElementById('key-container').classList.add('hidden');
        
        this.showNotification('Прогресс сброшен');
    }

    copyToClipboard(elementId, isKey = false) {
        const element = document.getElementById(elementId);
        element.select();
        element.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(element.value || element.textContent).then(() => {
            this.showNotification(isKey ? 'Ключ скопирован!' : 'Ссылка скопирована!');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showNotification('Ошибка копирования', true);
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
