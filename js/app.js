/**
 * Toast Notification Manager
 */
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            console.error('Toast container not found! Creating fallback...');
            this.createFallbackContainer();
        }
        this.toasts = new Map();
        this.lastSuccessTime = 0;
        this.successCooldown = 30000; // 30 секунд між повідомленнями про успіх
    }

    /**
     * Створити fallback контейнер якщо основний не знайдено
     */
    createFallbackContainer() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
        console.log('Created fallback toast container');
    }

    /**
     * Показати toast повідомлення
     */
    show(message, type = 'info', options = {}) {
        console.log('Toast.show called:', { message, type, options });
        
        if (!this.container) {
            console.error('Toast container is null!');
            return null;
        }

        const {
            title = '',
            duration = type === 'error' ? 2000 : 2000,
            persistent = false,
            id = null,
            icon = this.getDefaultIcon(type)
        } = options;

        // Для success повідомлень перевіряємо cooldown
        if (type === 'success' && !persistent) {
            const now = Date.now();
            if (now - this.lastSuccessTime < this.successCooldown) {
                console.log('Success toast skipped due to cooldown');
                return null; // Не показуємо повторні success повідомлення
            }
            this.lastSuccessTime = now;
        }

        // Видаляємо попереднє повідомлення з таким же ID якщо воно існує
        if (id && this.toasts.has(id)) {
            this.remove(id);
        }

        const toastId = id || this.generateId();
        const toast = this.createElement(toastId, message, type, title, icon, duration, persistent);
        
        // console.log('Adding toast to container:', toastId); // Diagnostic removed
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        // Автоматичне видалення
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }

        return toastId;
    }

    /**
     * Показати повідомлення про статус підключення
     */
    showConnectionStatus(isConnected, message) {
        if (isConnected) {
            // Показуємо success toast про підключення
            this.show(message, 'success', {
                title: '✅ Підключено',
                icon: '🔗',
                id: 'connection-status'
            });
            // Видаляємо всі error повідомлення про підключення
            this.removeByPrefix('connection-error');
        }
        // НЕ показуємо error повідомлення тут - це робиться в методі connect()
    }

    /**
     * Показати повідомлення про статус оновлення
     */
    showStatusUpdate(success, message) {
        if (success) {
            // Видаляємо попередні error повідомлення
            this.removeByPrefix('status-error');
            // Не показуємо success для routine оновлень
        } else {
            this.show(message, 'warning', {
                title: '⚠️ Проблема з оновленням',
                icon: '🔄',
                id: 'status-error-' + Date.now(),
                duration: 2000
            });
        }
    }

    /**
     * Видалити toast за ID
     */
    remove(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(id);
            }, 300);
        }
    }

    /**
     * Видалити всі toast з префіксом
     */
    removeByPrefix(prefix) {
        for (const [id, toast] of this.toasts) {
            if (id.startsWith(prefix)) {
                this.remove(id);
            }
        }
    }

    /**
     * Створити DOM елемент toast
     */
    createElement(id, message, type, title, icon, duration, persistent) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.id = id;

        const progressBar = !persistent && duration > 0 ? 
            `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : '';

        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">
                    <span class="toast-icon">${icon}</span>
                    ${title}
                </div>
                <button class="toast-close" type="button">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
            ${progressBar}
        `;

        // Обробник закриття
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(id);
        });

        return toast;
    }

    /**
     * Отримати іконку за замовчуванням
     */
    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Генерувати унікальний ID
     */
    generateId() {
        return 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Основний додаток для управління Blackmagic камерою
 */
class BlackmagicCameraApp {
    constructor() {
        this.camera = new BlackmagicCameraController();
        this.elements = {};
        this.updateInterval = null;
        this.focusThrottle = null; // Для throttling фокуса
        this.tintThrottle = null; // Для throttling tint
        this.toast = new ToastManager(); // Додаємо менеджер toast повідомлень
        this.lastStatusCheckTime = 0; // Для відстеження періодичних перевірок
        this.lastConnectionState = false; // Відстеження попереднього стану підключення
        
        this.init();
    }

    /**
     * Ініціалізація додатка
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.setupCallbacks();
    }

    /**
     * Прив'язка DOM елементів
     */
    bindElements() {
        // Connection elements
        this.elements.cameraIp = document.getElementById('camera-ip');
        this.elements.connectBtn = document.getElementById('connect-btn');
        this.elements.disconnectBtn = document.getElementById('disconnect-btn');
        this.elements.refreshStatusBtn = document.getElementById('refresh-status-btn');
        this.elements.connectionIndicator = document.getElementById('connection-indicator');
        this.elements.connectionText = document.getElementById('connection-text');
        this.elements.statusDot = document.getElementById('status-dot');

        // Video settings elements - тільки існуючі
        this.elements.currentGain = document.getElementById('current-gain');
        this.elements.currentShutter = document.getElementById('current-shutter');
        this.elements.currentWb = document.getElementById('current-wb');
        this.elements.currentTint = document.getElementById('current-tint');
        this.elements.currentFocus = document.getElementById('current-focus');
        this.elements.currentIris = document.getElementById('current-iris');

        // Control buttons - тільки існуючі
        this.elements.gainBtns = document.querySelectorAll('.gain-btn');
        this.elements.shutterBtns = document.querySelectorAll('.shutter-btn');
        this.elements.wbBtns = document.querySelectorAll('.wb-btn');
        this.elements.irisBtns = document.querySelectorAll('.iris-btn');

        // Enhanced WB controls
        this.elements.wbSlider = document.getElementById('wb-slider');
        this.elements.wbSliderValue = document.getElementById('wb-slider-value');
        this.elements.wbPresetBtns = document.querySelectorAll('.wb-preset-btn');
        this.elements.wbAdjustBtns = document.querySelectorAll('.wb-adjust-btn');
        this.elements.sliderMarkers = document.querySelectorAll('.marker');

        // Custom controls - тільки існуючі
        this.elements.customGain = document.getElementById('custom-gain');
        this.elements.setCustomGainBtn = document.getElementById('set-custom-gain-btn');
        this.elements.customShutter = document.getElementById('custom-shutter');
        this.elements.setCustomShutterBtn = document.getElementById('set-custom-shutter-btn');
        this.elements.customWb = document.getElementById('custom-wb');
        this.elements.setCustomWbBtn = document.getElementById('set-custom-wb-btn');
        this.elements.customIris = document.getElementById('custom-iris');
        this.elements.setCustomIrisBtn = document.getElementById('set-custom-iris-btn');

        // Slider controls - тільки існуючі
        this.elements.tintSlider = document.getElementById('tint-slider');
        this.elements.tintValue = document.getElementById('tint-value');
        this.elements.focusSlider = document.getElementById('focus-slider');

        // Focus controls - тільки існуючі
        this.elements.focusNearBtn = document.getElementById('focus-near-btn');
        this.elements.focusAutoBtn = document.getElementById('focus-auto-btn');
        this.elements.focusFarBtn = document.getElementById('focus-far-btn');

        // Preset elements - з перевіркою існування
        this.elements.currentPreset = document.getElementById('current-preset');
        this.elements.currentPresetName = document.getElementById('current-preset-name');
        this.elements.presetsCount = document.getElementById('presets-count');
        this.elements.presetsStatusText = document.getElementById('presets-status-text');
        this.elements.refreshPresetsBtn = document.getElementById('refresh-presets-btn');
        this.elements.presetList = document.getElementById('preset-list');
        this.elements.newPresetName = document.getElementById('new-preset-name');
        this.elements.savePresetBtn = document.getElementById('save-preset-btn');
        this.elements.presetFileInput = document.getElementById('preset-file-input');
        this.elements.uploadPresetBtn = document.getElementById('upload-preset-btn');
        this.elements.refreshDataBtn = document.getElementById('refresh-data-btn');

        // Camera info elements
        this.elements.cameraInfoSection = document.getElementById('camera-info-section');
        this.elements.cameraId = document.getElementById('camera-id');
        this.elements.cameraCodec = document.getElementById('camera-codec');
        this.elements.cameraFramerate = document.getElementById('camera-framerate');
        this.elements.cameraRecordResolution = document.getElementById('camera-record-resolution');
        this.elements.cameraOffSpeed = document.getElementById('camera-off-speed');

        // Navigation elements
        this.elements.tabBtns = document.querySelectorAll('.tab-btn');
        this.elements.tabContents = document.querySelectorAll('.tab-content');
    }

    /**
     * Прив'язка подій
     */
    bindEvents() {
        // Connection events
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.refreshStatusBtn.addEventListener('click', () => this.refreshStatus(true));

        // Gain controls
        this.elements.gainBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const gain = parseInt(btn.dataset.gain);
                this.setGain(gain);
            });
        });
        this.elements.setCustomGainBtn.addEventListener('click', () => {
            const gain = parseInt(this.elements.customGain.value);
            this.setGain(gain);
        });

        // Shutter controls
        this.elements.shutterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const shutter = parseInt(btn.dataset.shutter);
                this.setShutter(shutter);
            });
        });
        this.elements.setCustomShutterBtn.addEventListener('click', () => {
            const shutter = parseInt(this.elements.customShutter.value);
            this.setShutter(shutter);
        });

        // White Balance controls
        this.elements.wbBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const wb = parseInt(btn.dataset.wb);
                this.setWhiteBalance(wb);
            });
        });
        this.elements.setCustomWbBtn.addEventListener('click', () => {
            const wb = parseInt(this.elements.customWb.value);
            this.setWhiteBalance(wb);
        });

        // Enhanced WB controls
        if (this.elements.wbSlider) {
            this.elements.wbSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.updateWbSliderDisplay(value);
            });
            
            this.elements.wbSlider.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                this.setWhiteBalance(value);
            });
        }

        this.elements.wbPresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const wb = parseInt(btn.dataset.wb);
                this.setWhiteBalance(wb);
                this.updateWbSliderDisplay(wb);
            });
        });

        this.elements.wbAdjustBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const adjust = parseInt(btn.dataset.adjust);
                this.adjustWhiteBalance(adjust);
            });
        });

        this.elements.sliderMarkers.forEach(marker => {
            marker.addEventListener('click', () => {
                const temp = parseInt(marker.dataset.temp);
                this.setWhiteBalance(temp);
                this.updateWbSliderDisplay(temp);
            });
        });

        // Iris controls
        this.elements.irisBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const iris = parseFloat(btn.dataset.iris);
                this.setIris(iris);
            });
        });
        this.elements.setCustomIrisBtn.addEventListener('click', () => {
            const iris = parseFloat(this.elements.customIris.value);
            this.setIris(iris);
        });

        // Tint controls - реальний час з throttling
        this.elements.tintSlider.addEventListener('input', (e) => {
            const tint = parseInt(e.target.value);
            this.elements.tintValue.textContent = tint;
            
            // Додаємо візуальний ефект оновлення
            this.elements.tintValue.classList.add('updating');
            setTimeout(() => {
                this.elements.tintValue.classList.remove('updating');
            }, 200);
            
            // Очищаємо попередній таймер
            if (this.tintThrottle) {
                clearTimeout(this.tintThrottle);
            }
            
            // Встановлюємо новий таймер (затримка 150мс для tint)
            this.tintThrottle = setTimeout(() => {
                this.setTint(tint);
            }, 150);
        });

        // Focus controls
        this.elements.focusNearBtn.addEventListener('click', () => this.adjustFocus(-0.1));
        this.elements.focusFarBtn.addEventListener('click', () => this.adjustFocus(0.1));
        this.elements.focusAutoBtn.addEventListener('click', () => this.triggerAutoFocus());
        
        // Focus slider - реальний час з throttling
        this.elements.focusSlider.addEventListener('input', (e) => {
            const focus = parseFloat(e.target.value);
            
            // Очищаємо попередній таймер
            if (this.focusThrottle) {
                clearTimeout(this.focusThrottle);
            }
            
            // Встановлюємо новий таймер (затримка 100мс)
            this.focusThrottle = setTimeout(() => {
                this.setFocus(focus);
            }, 100);
        });

        // Preset controls - з перевіркою існування
        if (this.elements.refreshPresetsBtn) {
            this.elements.refreshPresetsBtn.addEventListener('click', () => this.refreshPresets());
        }
        if (this.elements.savePresetBtn) {
            this.elements.savePresetBtn.addEventListener('click', () => this.saveNewPreset());
        }
        if (this.elements.uploadPresetBtn) {
            this.elements.uploadPresetBtn.addEventListener('click', () => {
                if (this.elements.presetFileInput) {
                    this.elements.presetFileInput.click();
                }
            });
        }
        if (this.elements.presetFileInput) {
            this.elements.presetFileInput.addEventListener('change', (e) => this.uploadPresetFile(e));
        }
        if (this.elements.refreshDataBtn) {
            this.elements.refreshDataBtn.addEventListener('click', () => this.refreshAllData());
        }

        // Tab navigation
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Preset view toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Переключаємо активний стан кнопок
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Переключаємо вигляд списку
                const viewType = btn.dataset.view;
                if (this.elements.presetList) {
                    if (viewType === 'list') {
                        this.elements.presetList.classList.add('list-view');
                    } else {
                        this.elements.presetList.classList.remove('list-view');
                    }
                }
            });
        });

        // Налаштування поведінки при завантаженні файлів
        if (this.elements.presetFileInput) {
            this.elements.presetFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Оновлюємо статус
                    if (this.elements.presetsStatusText) {
                        this.elements.presetsStatusText.textContent = `Завантаження файлу "${file.name}"...`;
                    }
                }
                this.uploadPresetFile(e);
            });
        }

        // Додавання підтримки клавіши Enter для збереження пресету
        if (this.elements.newPresetName) {
            this.elements.newPresetName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.elements.savePresetBtn.disabled) {
                    this.saveNewPreset();
                }
            });
            
            // Додаємо автоматичне очищення від небажаних символів
            this.elements.newPresetName.addEventListener('input', (e) => {
                // Видаляємо небезпечні символи для файлових систем
                const sanitized = e.target.value.replace(/[<>:"/\\|?*]/g, '');
                if (sanitized !== e.target.value) {
                    e.target.value = sanitized;
                }
            });
        }


    }

    /**
     * Налаштування callback функцій
     */
    setupCallbacks() {
        this.camera.setCallbacks(
            null, // Видалено логування
            (isConnected, message) => this.updateConnectionStatus(isConnected, message)
        );
    }

    /**
     * Підключення до камери
     */
    async connect() {
        const cameraIp = this.elements.cameraIp.value.trim();
        if (!cameraIp) {
            this.toast.show('Введіть IP адресу або hostname камери', 'warning', {
                title: '⚠️ Необхідна адреса',
                icon: '📝'
            });
            return;
        }

        this.setLoading(true);
        this.updateConnectionStatus(false, 'Підключення...');
        
        // Показуємо toast про спробу підключення
        const connectingToastId = this.toast.show(`Підключення до ${cameraIp}...`, 'info', {
            title: '🔄 Підключення',
            icon: '🔌',
            id: 'connecting',
            persistent: true
        });

        try {
            await this.camera.connect(cameraIp);
            this.startPeriodicUpdate();
            this.updateUI();
            
            // Видаляємо toast підключення
            this.toast.remove('connecting');
            
            // Завантажуємо пресети та інформацію про камеру після успішного підключення
            setTimeout(() => {
                this.refreshPresets();
                this.updateCameraInfo();
            }, 1000);
        } catch (error) {
            // Видаляємо toast підключення
            this.toast.remove('connecting');
            
            // Показуємо загальне повідомлення про помилку підключення
            this.toast.show('Не вдалося підключитися до камери. Перевірте адресу та мережеве з\'єднання.', 'error', {
                title: '❌ Помилка підключення',
                icon: '🔌',
                duration: 2000
            });
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Відключення від камери
     */
    disconnect() {
        this.camera.disconnect();
        this.stopPeriodicUpdate();
        this.updateUI();
        this.clearCurrentValues();
        this.hideCameraInfo();
        
        // Скидаємо стан підключення
        this.lastConnectionState = false;
        
        // Показуємо toast про відключення
        this.toast.show('Відключено від камери', 'info', {
            title: 'ℹ️ Відключення',
            icon: '🔌',
            duration: 2000
        });
        
        // Очищаємо всі toast повідомлення про помилки підключення
        this.toast.removeByPrefix('connection-error');
        this.toast.removeByPrefix('status-error');
    }

    /**
     * Оновлення статусу
     */
    async refreshStatus(isManual = false) {
        if (this.camera.isConnectionActive()) {
            try {
                await this.camera.refreshAllSettings();
                this.updateCurrentValues();
                console.log('Статус оновлено');
                
                // Оновлюємо статус підключення (це може показати toast про відновлення зв'язку)
                this.updateConnectionStatus(true, 'Підключено');
                
                // Показуємо toast тільки при ручному оновленні
                if (isManual) {
                    this.toast.showStatusUpdate(true, 'Дані камери оновлено');
                }
                
            } catch (error) {
                console.error('Помилка оновлення статусу:', error);
                
                // При помилці оновлюємо статус як відключено
                this.updateConnectionStatus(false, 'Помилка підключення');
                
                // Показуємо toast про помилку завжди, коли є проблеми з підключенням
                this.toast.showStatusUpdate(false, `Помилка оновлення: ${error.message || 'Невідома помилка'}`);
            }
        } else {
            // Оновлюємо статус як відключено
            this.updateConnectionStatus(false, 'Не підключено');
            
            // Показуємо повідомлення про відсутність підключення завжди
            this.toast.showStatusUpdate(false, 'Камера не підключена');
        }
    }

    /**
     * Отримання системної інформації
     */
    /**
     * Встановлення gain
     */
    async setGain(gain) {
        try {
            await this.camera.setGain(gain);
            setTimeout(() => this.updateGain(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Встановлення витримки
     */
    async setShutter(shutter) {
        try {
            await this.camera.setShutter(shutter);
            setTimeout(() => this.updateShutter(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Встановлення білого балансу
     */
    async setWhiteBalance(wb) {
        try {
            await this.camera.setWhiteBalance(wb);
            setTimeout(() => this.updateWhiteBalance(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Встановлення tint
     */
    async setTint(tint) {
        try {
            await this.camera.setTint(tint);
            setTimeout(() => this.updateTint(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Встановлення фокуса
     */
    async setFocus(focus) {
        try {
            await this.camera.setFocus(focus);
            setTimeout(() => this.updateFocus(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Коригування фокуса
     */
    async adjustFocus(delta) {
        const currentFocus = this.camera.getCurrentSettings().focus || 0.5;
        const newFocus = Math.max(0, Math.min(1, currentFocus + delta));
        await this.setFocus(newFocus);
    }

    /**
     * Автофокус
     */
    async triggerAutoFocus() {
        try {
            await this.camera.triggerAutoFocus();
            setTimeout(() => this.updateFocus(), 2000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Встановлення діафрагми
     */
    async setIris(iris) {
        try {
            await this.camera.setIris(iris);
            setTimeout(() => this.updateIris(), 1000);
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Оновлення всіх даних без перезавантаження сторінки
     */
    async refreshAllData() {
        try {
            // Оновлюємо статус
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Оновлення даних...';
            }
            
            // Якщо камера підключена, оновлюємо всі дані
            if (this.camera.isConnected()) {
                await Promise.all([
                    this.refreshPresets(),
                    this.updateVideoSettings(),
                    this.updateStatus(),
                    this.updateCameraInfo()
                ]);
            } else {
                // Якщо не підключена, просто оновлюємо пресети з localStorage
                await this.refreshPresets();
            }
            
            // Показуємо успішне завершення
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Дані оновлено';
                setTimeout(() => {
                    if (this.elements.presetsStatusText) {
                        this.elements.presetsStatusText.textContent = 'Готово';
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Помилка оновлення даних:', error);
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Помилка оновлення даних';
            }
        }
    }

    /**
     * Оновлення інформації про камеру
     */
    async updateCameraInfo() {
        if (!this.elements.cameraInfoSection) return;

        try {
            // Показуємо блок як завантажуючий
            this.showCameraInfoLoading();
            
            const [cameraInfo, cameraId] = await Promise.all([
                this.camera.getCameraInfo(),
                this.camera.getCameraId().catch(() => null)
            ]);
            
            if (cameraInfo) {
                // Оновлюємо ID камери
                if (this.elements.cameraId) {
                    this.elements.cameraId.textContent = cameraId || '—';
                }
                
                // Оновлюємо кодек
                if (this.elements.cameraCodec) {
                    this.elements.cameraCodec.textContent = cameraInfo.codec || '—';
                }
                
                // Оновлюємо FPS
                if (this.elements.cameraFramerate) {
                    this.elements.cameraFramerate.textContent = cameraInfo.frameRate ? `${cameraInfo.frameRate} fps` : '—';
                }
                
                // Оновлюємо роздільність
                if (this.elements.cameraRecordResolution) {
                    const recordRes = cameraInfo.recordResolution;
                    this.elements.cameraRecordResolution.textContent = recordRes ? 
                        `${recordRes.width}×${recordRes.height}` : '—';
                }
                
                // Оновлюємо Off Speed
                if (this.elements.cameraOffSpeed) {
                    const offSpeedText = cameraInfo.offSpeedEnabled ? 
                        `Увімкнено (${cameraInfo.offSpeedFrameRate} fps)` : 
                        `Вимкнено (${cameraInfo.minOffSpeedFrameRate}-${cameraInfo.maxOffSpeedFrameRate} fps)`;
                    this.elements.cameraOffSpeed.textContent = offSpeedText;
                }
                
                // Показуємо блок з анімацією
                this.showCameraInfo();
                this.clearCameraInfoLoading();
            }
        } catch (error) {
            console.error('Помилка оновлення інформації про камеру:', error);
            this.showCameraInfoError();
        }
    }

    /**
     * Показати блок як завантажуючий
     */
    showCameraInfoLoading() {
        const values = [
            this.elements.cameraId,
            this.elements.cameraCodec,
            this.elements.cameraFramerate,
            this.elements.cameraRecordResolution,
            this.elements.cameraOffSpeed
        ];
        
        values.forEach(element => {
            if (element) {
                element.textContent = '...';
                element.className = 'info-value loading';
            }
        });
    }

    /**
     * Очистити стан завантаження
     */
    clearCameraInfoLoading() {
        const values = [
            this.elements.cameraId,
            this.elements.cameraCodec,
            this.elements.cameraFramerate,
            this.elements.cameraRecordResolution,
            this.elements.cameraOffSpeed
        ];
        
        values.forEach(element => {
            if (element) {
                element.className = 'info-value';
            }
        });
    }

    /**
     * Показати помилку в блоці інформації
     */
    showCameraInfoError() {
        const values = [
            this.elements.cameraId,
            this.elements.cameraCodec,
            this.elements.cameraFramerate,
            this.elements.cameraRecordResolution,
            this.elements.cameraOffSpeed
        ];
        
        values.forEach(element => {
            if (element) {
                element.textContent = 'Помилка';
                element.className = 'info-value error';
            }
        });
    }

    /**
     * Приховати блок інформації про камеру
     */
    hideCameraInfo() {
        if (this.elements.cameraInfoSection) {
            this.elements.cameraInfoSection.style.display = 'none';
            this.elements.cameraInfoSection.classList.remove('visible');
        }
    }

    /**
     * Показати блок інформації про камеру
     */
    showCameraInfo() {
        if (this.elements.cameraInfoSection) {
            this.elements.cameraInfoSection.style.display = 'block';
            // Додаємо клас з затримкою для плавної анімації
            setTimeout(() => {
                this.elements.cameraInfoSection.classList.add('visible');
            }, 50);
        }
    }

    /**
     * PRESET METHODS
     */

    /**
     * Оновлення списку пресетів
     */
    async refreshPresets() {
        if (!this.elements.presetList) {
            console.warn('Елемент списку пресетів не знайдено');
            return;
        }

        try {
            // Показуємо анімацію завантаження
            this.elements.presetList.innerHTML = `
                <div class="preset-card loading">
                    <div class="preset-card-content">
                        <div class="preset-loading-animation"></div>
                        <span>Завантаження...</span>
                    </div>
                </div>
            `;
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Завантаження пресетів...';
            }
            
            const [presets, activePreset] = await Promise.all([
                this.camera.getPresets(),
                this.camera.getActivePreset().catch(() => null)
            ]);
            
            this.updatePresetList(presets, activePreset);
            
            if (this.elements.currentPreset) {
                this.elements.currentPreset.textContent = activePreset || 'Невідомо';
            }
            
        } catch (error) {
            this.elements.presetList.innerHTML = `
                <div class="preset-card loading">
                    <div class="preset-card-content">
                        <span style="color: #ff6b6b;">❌ Помилка завантаження</span>
                    </div>
                </div>
            `;
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Помилка завантаження пресетів';
            }
            
            console.error('Помилка оновлення пресетів:', error);
        }
    }

    /**
     * Оновлення відображення списку пресетів
     */
    updatePresetList(presets, activePreset) {
        if (!this.elements.presetList) {
            console.warn('Елемент списку пресетів не знайдено');
            return;
        }

        // Оновлюємо статистику
        if (this.elements.presetsCount) {
            this.elements.presetsCount.textContent = `${presets ? presets.length : 0} пресетів`;
        }
        
        if (this.elements.currentPresetName) {
            this.elements.currentPresetName.textContent = activePreset || 'Немає';
        }

        if (this.elements.presetsStatusText) {
            if (presets && presets.length > 0) {
                this.elements.presetsStatusText.textContent = `Завантажено ${presets.length} пресетів`;
            } else {
                this.elements.presetsStatusText.textContent = 'Пресети не знайдено';
            }
        }

        if (!presets || presets.length === 0) {
            this.elements.presetList.innerHTML = `
                <div class="preset-card loading">
                    <div class="preset-card-content">
                        <div class="preset-loading-animation"></div>
                        <span>Пресети не знайдено</span>
                    </div>
                </div>
            `;
            return;
        }

        this.elements.presetList.innerHTML = '';
        
        presets.forEach(preset => {
            const presetCard = document.createElement('div');
            presetCard.className = `preset-card ${preset === activePreset ? 'active' : ''}`;
            
            presetCard.innerHTML = `
                <div class="preset-card-content">
                    <h4 class="preset-name">${preset}</h4>
                    <div class="preset-actions">
                        <button type="button" class="preset-action-btn load" data-preset="${preset}" title="Активувати пресет">
                            <span>🎯</span>
                            <span>Активувати</span>
                        </button>
                        <button type="button" class="preset-action-btn download" data-preset="${preset}" title="Завантажити пресет">
                            <span>💾</span>
                            <span>Скачати</span>
                        </button>
                        <button type="button" class="preset-action-btn delete" data-preset="${preset}" title="Видалити пресет">
                            <span>🗑️</span>
                            <span>Видалити</span>
                        </button>
                    </div>
                </div>
            `;
            
            this.elements.presetList.appendChild(presetCard);
        });

        // Додаємо обробники подій для кнопок
        this.elements.presetList.querySelectorAll('.preset-action-btn.load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadPreset(e.currentTarget.dataset.preset);
            });
        });
        
        this.elements.presetList.querySelectorAll('.preset-action-btn.download').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadPreset(e.currentTarget.dataset.preset);
            });
        });
        
        this.elements.presetList.querySelectorAll('.preset-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePreset(e.currentTarget.dataset.preset);
            });
        });

        // Додаємо клік на карточку для активації пресету
        this.elements.presetList.querySelectorAll('.preset-card:not(.loading)').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.preset-actions')) {
                    const presetName = card.querySelector('.preset-name').textContent;
                    this.loadPreset(presetName);
                }
            });
        });
    }

    /**
     * Активація пресету
     */
    async loadPreset(presetName) {
        try {
            // Оновлюємо статус
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Активація пресету "${presetName}"...`;
            }

            // Тимчасово відмічаємо пресет як активний для візуального відгуку
            this.elements.presetList.querySelectorAll('.preset-card').forEach(card => {
                card.classList.remove('active');
                if (card.querySelector('.preset-name').textContent === presetName) {
                    card.classList.add('active');
                }
            });

            await this.camera.setActivePreset(presetName);
            
            if (this.elements.currentPreset) {
                this.elements.currentPreset.textContent = presetName;
            }
            
            if (this.elements.currentPresetName) {
                this.elements.currentPresetName.textContent = presetName;
            }
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Пресет "${presetName}" активовано`;
            }
            
            // Показуємо toast про успішну активацію
            this.toast.show(`Пресет "${presetName}" активовано`, 'success', {
                title: '✅ Пресет застосовано',
                icon: '🎯',
                duration: 2000
            });
            
            // Оновлюємо налаштування та список пресетів
            setTimeout(() => {
                this.refreshStatus();
                this.refreshPresets();
            }, 1000);
            
        } catch (error) {
            // Відновлюємо попередній стан при помилці
            this.refreshPresets();
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Помилка активації пресету`;
            }
            
            console.error('Помилка активації пресету:', error);
            
            // Показуємо toast про помилку
            this.toast.show(`Не вдалося активувати пресет "${presetName}": ${error.message}`, 'error', {
                title: '❌ Помилка пресету',
                icon: '⚠️',
                duration: 2000
            });
        }
    }

    /**
     * Збереження нового пресету
     */
    async saveNewPreset() {
        if (!this.elements.newPresetName) {
            console.warn('Елемент введення назви пресету не знайдено');
            return;
        }

        const presetName = this.elements.newPresetName.value.trim();
        if (!presetName) {
            this.toast.show('Введіть назву пресету', 'warning', {
                title: '⚠️ Назва пресету',
                icon: '📝'
            });
            this.elements.newPresetName.focus();
            return;
        }

        // Перевіряємо валідність назви
        if (presetName.length < 3) {
            this.toast.show('Назва пресету повинна містити мінімум 3 символи', 'warning', {
                title: '⚠️ Коротка назва',
                icon: '📏'
            });
            this.elements.newPresetName.focus();
            return;
        }

        try {
            // Блокуємо кнопку та показуємо процес
            if (this.elements.savePresetBtn) {
                this.elements.savePresetBtn.disabled = true;
                this.elements.savePresetBtn.innerHTML = `
                    <span class="btn-icon">⏳</span>
                    <span class="btn-text">Збереження...</span>
                `;
            }
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Збереження пресету "${presetName}"...`;
            }

            await this.camera.savePreset(presetName);
            
            // Очищаємо поле вводу
            this.elements.newPresetName.value = '';
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Пресет "${presetName}" успішно збережено`;
            }
            
            // Показуємо toast про успіх
            this.toast.show(`Пресет "${presetName}" успішно збережено`, 'success', {
                title: '✅ Пресет збережено',
                icon: '💾',
                duration: 2000
            });
            
            // Оновлюємо список пресетів
            setTimeout(() => this.refreshPresets(), 500);
            
        } catch (error) {
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Помилка збереження пресету';
            }
            
            console.error('Помилка збереження пресету:', error);
            
            // Показуємо toast про помилку
            this.toast.show(`Не вдалося зберегти пресет: ${error.message}`, 'error', {
                title: '❌ Помилка збереження',
                icon: '💾',
                duration: 2000
            });
        } finally {
            // Відновлюємо кнопку
            if (this.elements.savePresetBtn) {
                this.elements.savePresetBtn.disabled = false;
                this.elements.savePresetBtn.innerHTML = `
                    <span class="btn-icon">💾</span>
                    <span class="btn-text">Зберегти</span>
                `;
            }
        }
    }

    /**
     * Завантаження пресету як файлу
     */
    async downloadPreset(presetName) {
        try {
            const blob = await this.camera.downloadPreset(presetName);
            
            // Створюємо посилання для завантаження
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${presetName}.preset`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Помилка завантаження пресету:', error);
            alert(`Помилка завантаження пресету: ${error.message}`);
        }
    }

    /**
     * Видалення пресету
     */
    async deletePreset(presetName) {
        // Покращений діалог підтвердження
        const confirmed = confirm(
            `⚠️ УВАГА!\n\nВи дійсно хочете видалити пресет "${presetName}"?\n\nЦю дію неможливо скасувати.`
        );
        
        if (!confirmed) {
            return;
        }

        try {
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Видалення пресету "${presetName}"...`;
            }

            // Тимчасово приховуємо карточку пресету
            const presetCards = this.elements.presetList.querySelectorAll('.preset-card');
            presetCards.forEach(card => {
                if (card.querySelector('.preset-name')?.textContent === presetName) {
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                }
            });

            await this.camera.deletePreset(presetName);
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Пресет "${presetName}" видалено`;
            }
            
            setTimeout(() => this.refreshPresets(), 500);
            
        } catch (error) {
            // Відновлюємо видимість карточки при помилці
            const presetCards = this.elements.presetList.querySelectorAll('.preset-card');
            presetCards.forEach(card => {
                card.style.opacity = '';
                card.style.pointerEvents = '';
            });
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = 'Помилка видалення пресету';
            }
            
            console.error('Помилка видалення пресету:', error);
            alert(`Помилка видалення пресету: ${error.message}`);
        }
    }

    /**
     * Завантаження файлу пресету
     */
    async uploadPresetFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Блокуємо кнопку та показуємо процес
            if (this.elements.uploadPresetBtn) {
                this.elements.uploadPresetBtn.disabled = true;
                this.elements.uploadPresetBtn.innerHTML = `
                    <span class="btn-icon">⏳</span>
                    <span class="btn-text">Завантаження...</span>
                `;
            }

            const presetName = await this.camera.uploadPreset(file);
            
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Файл "${file.name}" успішно завантажено як "${presetName}"`;
            }
            
            // Показуємо повідомлення про успіх
            setTimeout(() => {
                alert(`Пресет "${presetName}" успішно завантажено з файлу`);
            }, 100);
            
            setTimeout(() => this.refreshPresets(), 500);
            
        } catch (error) {
            if (this.elements.presetsStatusText) {
                this.elements.presetsStatusText.textContent = `Помилка завантаження файлу "${file.name}"`;
            }
            
            console.error('Помилка завантаження файлу пресету:', error);
            alert(`Помилка завантаження файлу пресету: ${error.message}`);
        } finally {
            // Відновлюємо кнопку та очищаємо інпут
            if (this.elements.uploadPresetBtn) {
                this.elements.uploadPresetBtn.disabled = false;
                this.elements.uploadPresetBtn.innerHTML = `
                    <span class="btn-icon">📤</span>
                    <span class="btn-text">Завантажити .preset файл</span>
                `;
            }
            
            // Очищаємо інпут
            event.target.value = '';
        }
    }

    /**
     * Початок запису
     */
    async startRecording() {
        try {
            await this.camera.startRecording();
            this.updateRecordingStatus();
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Зупинка запису
     */
    async stopRecording() {
        try {
            await this.camera.stopRecording();
            this.updateRecordingStatus();
        } catch (error) {
            // Помилка вже залогована
        }
    }

    /**
     * Отримання інформації про медіа
     */
    async getMediaInfo() {
        try {
            const info = await this.camera.getMediaInfo();
            if (info) {
                this.elements.storageRemaining.textContent = info.remainingRecordTime || 'Невідомо';
                this.elements.clipCount.textContent = info.clipCount || '0';
            }
        } catch (error) {
            this.elements.storageRemaining.textContent = 'Недоступно';
            this.elements.clipCount.textContent = 'Недоступно';
        }
    }

    /**
     * Оновлення інтерфейсу
     */
    updateUI() {
        this.updateCurrentValues();
    }

    /**
     * Оновлення поточних значень в інтерфейсі
     */
    updateCurrentValues() {
        this.updateGain();
        this.updateShutter();
        // Додати інші оновлення при необхідності
    }

    /**
     * Очищення поточних значень
     */
    clearCurrentValues() {
        this.elements.currentGain.textContent = '❓';
        this.elements.currentShutter.textContent = '❓';
        this.elements.currentWb.textContent = '❓';
        this.elements.currentTint.textContent = '❓';
        this.elements.currentFocus.textContent = '❓';
        this.elements.currentIris.textContent = '❓';
    }

    /**
     * Очищення значень корекції кольору - заглушка
     */
    clearColorCorrectionValues() {
        // Функціонал кольорової корекції буде додано незабаром
        console.log('Кольорова корекція буде додана в майбутніх версіях');
    }

    /**
     * Запуск періодичного оновлення
     */
    startPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            this.refreshStatus();
        }, 10000); // Оновлення кожні 10 секунд
    }

    /**
     * Зупинка періодичного оновлення
     */
    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Встановлення стану завантаження
     */
    setLoading(loading) {
        this.elements.connectBtn.disabled = loading;
        if (loading) {
            this.elements.connectBtn.innerHTML = '<span class="btn-icon">⏳</span> Підключення...';
        } else {
            this.elements.connectBtn.innerHTML = '<span class="btn-icon">🔌</span> Підключити';
        }
    }

    /**
     * Оновлення статусу підключення
     */
    updateConnectionStatus(isConnected, message) {
        const wasConnected = this.lastConnectionState;
        
        if (isConnected) {
            this.elements.statusDot.className = 'status-dot online';
            this.elements.connectionText.textContent = message || 'Підключено';
            this.enableControls(true);
            
            // Показуємо toast тільки при відновленні підключення після розриву
            if (!wasConnected) {
                this.toast.showConnectionStatus(true, message || 'Успішно підключено до камери');
            }
        } else {
            this.elements.statusDot.className = 'status-dot offline';
            this.elements.connectionText.textContent = message || 'Не підключено';
            this.enableControls(false);
            
            // НЕ показуємо toast тут - це робиться в методі connect()
            // Цей метод призначений тільки для оновлення UI статусу
        }
        
        // Оновлюємо збережений стан підключення
        this.lastConnectionState = isConnected;

        // Оновлюємо статус в інтерфейсі пресетів
        if (this.elements.presetsStatusText) {
            if (isConnected) {
                this.elements.presetsStatusText.textContent = 'Підключено. Завантажте пресети...';
            } else {
                this.elements.presetsStatusText.textContent = 'Очікування підключення...';
            }
        }

        // Оновлюємо список пресетів при підключенні
        if (isConnected && this.elements.presetList) {
            this.elements.presetList.innerHTML = `
                <div class="preset-card loading">
                    <div class="preset-card-content">
                        <div class="preset-loading-animation"></div>
                        <span>Готово до завантаження</span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Включення/відключення контролів
     */
    enableControls(enabled) {
        // Основні кнопки підключення
        this.elements.connectBtn.disabled = enabled;
        this.elements.disconnectBtn.disabled = !enabled;
        this.elements.refreshStatusBtn.disabled = !enabled;

        // Gain контроли
        this.elements.gainBtns.forEach(btn => btn.disabled = !enabled);
        this.elements.setCustomGainBtn.disabled = !enabled;
        this.elements.customGain.disabled = !enabled;

        // Shutter контроли
        this.elements.shutterBtns.forEach(btn => btn.disabled = !enabled);
        this.elements.setCustomShutterBtn.disabled = !enabled;
        this.elements.customShutter.disabled = !enabled;

        // White Balance контроли
        this.elements.wbBtns.forEach(btn => btn.disabled = !enabled);
        this.elements.setCustomWbBtn.disabled = !enabled;
        this.elements.customWb.disabled = !enabled;

        // Enhanced WB контроли
        if (this.elements.wbSlider) this.elements.wbSlider.disabled = !enabled;
        this.elements.wbPresetBtns.forEach(btn => btn.disabled = !enabled);
        this.elements.wbAdjustBtns.forEach(btn => btn.disabled = !enabled);

        // Tint контроли
        this.elements.tintSlider.disabled = !enabled;

        // Focus контроли
        this.elements.focusSlider.disabled = !enabled;
        this.elements.focusNearBtn.disabled = !enabled;
        this.elements.focusAutoBtn.disabled = !enabled;
        this.elements.focusFarBtn.disabled = !enabled;

        // Iris контроли
        this.elements.irisBtns.forEach(btn => btn.disabled = !enabled);
        this.elements.setCustomIrisBtn.disabled = !enabled;
        this.elements.customIris.disabled = !enabled;

        // Preset контроли - з перевіркою існування
        if (this.elements.refreshPresetsBtn) {
            this.elements.refreshPresetsBtn.disabled = !enabled;
        }
        if (this.elements.savePresetBtn) {
            this.elements.savePresetBtn.disabled = !enabled;
        }
        if (this.elements.newPresetName) {
            this.elements.newPresetName.disabled = !enabled;
        }
        if (this.elements.uploadPresetBtn) {
            this.elements.uploadPresetBtn.disabled = !enabled;
        }
        if (this.elements.presetFileInput) {
            this.elements.presetFileInput.disabled = !enabled;
        }
    }

    /**
     * Включення/відключення контролів корекції кольору - заглушка
     */
    enableColorCorrectionControls(enabled) {
        // Функціонал кольорової корекції буде додано незабаром
        console.log('Контроли кольорової корекції будуть додані пізніше');
    }

    /**
     * Оновлення значення gain в інтерфейсі
     */
    updateGain() {
        if (this.camera.currentSettings.gain !== null) {
            this.elements.currentGain.textContent = `${this.camera.currentSettings.gain} dB`;
        }
    }

    /**
     * Оновлення значення shutter в інтерфейсі
     */
    updateShutter() {
        if (this.camera.currentSettings.shutter !== null) {
            this.elements.currentShutter.textContent = `1/${this.camera.currentSettings.shutter}`;
        }
    }

    /**
     * Оновлення значення iris в інтерфейсі
     */
    updateIris() {
        if (this.camera.currentSettings.iris !== null) {
            this.elements.currentIris.textContent = `f/${this.camera.currentSettings.iris}`;
        }
    }

    /**
     * Оновлення значення tint в інтерфейсі
     */
    updateTint() {
        if (this.camera.currentSettings.tint !== null) {
            this.elements.currentTint.textContent = `${this.camera.currentSettings.tint}`;
        }
    }

    /**
     * Оновлення значення focus в інтерфейсі
     */
    updateFocus() {
        if (this.camera.currentSettings.focus !== null) {
            this.elements.currentFocus.textContent = `${(this.camera.currentSettings.focus * 100).toFixed(1)}%`;
        }
    }

    /**
     * Оновлення всіх поточних значень в інтерфейсі
     */
    updateCurrentValues() {
        this.updateGain();
        this.updateShutter();
        this.updateIris();
        this.updateTint();
        this.updateFocus();
        
        if (this.camera.currentSettings.whiteBalance !== null) {
            this.elements.currentWb.textContent = `${this.camera.currentSettings.whiteBalance}K`;
            this.updateWbPresetButtons(this.camera.currentSettings.whiteBalance);
        }
    }

    /**
     * Очищення поточних значень в інтерфейсі
     */
    clearCurrentValues() {
        this.elements.currentGain.textContent = '❓';
        this.elements.currentShutter.textContent = '❓';
        this.elements.currentIris.textContent = '❓';
        this.elements.currentTint.textContent = '❓';
        this.elements.currentFocus.textContent = '❓';
        this.elements.currentWb.textContent = '❓';
    }

    /**
     * Оновлення інформації про систему
     */
    updateSystemInfo() {
        // Це можна буде розширити при отриманні даних з системного API
    }

    /**
     * Перемикання між вкладками
     */
    switchTab(tabId) {
        // Видаляємо активний клас з усіх вкладок та кнопок
        this.elements.tabBtns.forEach(btn => btn.classList.remove('active'));
        this.elements.tabContents.forEach(content => content.classList.remove('active'));

        // Додаємо активний клас до обраної вкладки
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(`${tabId}-tab`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Логіка для конкретних вкладок
        if (tabId === 'camera') {
            // Оновити дані камери якщо потрібно
            if (this.camera.isConnectionActive()) {
                this.refreshStatus();
            }
        } else if (tabId === 'color') {
            // Placeholder for color correction functionality
            console.log('Кольорова корекція буде додана незабаром');
        } else if (tabId === 'presets') {
            // Оновити пресети якщо потрібно
            if (this.camera.isConnectionActive()) {
                this.refreshPresets();
            }
        }
    }

    /**
     * Оновлення відображення слайдера WB
     */
    updateWbSliderDisplay(value) {
        if (this.elements.wbSliderValue) {
            this.elements.wbSliderValue.textContent = `${value}K`;
        }
        if (this.elements.wbSlider) {
            this.elements.wbSlider.value = value;
        }
    }

    /**
     * Швидке коригування білого балансу
     */
    async adjustWhiteBalance(adjustment) {
        try {
            const currentWb = await this.camera.getWhiteBalance();
            if (currentWb) {
                const newWb = Math.max(2500, Math.min(10000, currentWb + adjustment));
                await this.setWhiteBalance(newWb);
                this.updateWbSliderDisplay(newWb);
            }
        } catch (error) {
            console.error('Помилка корегування білого балансу:', error);
        }
    }

    /**
     * Оновлення активних пресетів WB
     */
    updateWbPresetButtons(currentWb) {
        // Оновлюємо старі кнопки
        this.elements.wbBtns.forEach(btn => {
            const wb = parseInt(btn.dataset.wb);
            btn.classList.toggle('active', wb === currentWb);
        });

        // Оновлюємо нові именовані пресети
        this.elements.wbPresetBtns.forEach(btn => {
            const wb = parseInt(btn.dataset.wb);
            btn.classList.toggle('active', wb === currentWb);
        });

        // Оновлюємо слайдер
        this.updateWbSliderDisplay(currentWb);
    }

    /**
     * Оновлення значення білого балансу в інтерфейсі
     */
    updateWhiteBalance() {
        if (this.camera.currentSettings.whiteBalance !== null) {
            const wb = this.camera.currentSettings.whiteBalance;
            this.elements.currentWb.textContent = `${wb}K`;
            
            // Оновлюємо слайдер білого балансу
            if (this.elements.wbSlider) {
                this.elements.wbSlider.value = wb;
            }
            
            // Оновлюємо відображення значення слайдера
            if (this.elements.wbSliderValue) {
                this.elements.wbSliderValue.textContent = `${wb}K`;
            }
            
            // Оновлюємо активний стан пресетів
            this.updateWbPresetButtons(wb);
        }
    }

    /**
     * Обробка MIDI команд
     */
    handleMIDICommand(functionId, normalizedValue) {
        if (!this.camera.isConnectionActive()) {
            console.warn('Камера не підключена - MIDI команда ігнорується');
            this.toast.show('MIDI сигнал отримано, але камера не підключена', 'warning');
            return;
        }

        switch (functionId) {
            // Функції запису
            case 'record-start':
                this.startRecording();
                break;
            case 'record-stop':
                this.stopRecording();
                break;
            case 'record-toggle':
                // Реалізуємо перемикання запису
                if (this.camera.currentSettings.recording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
                break;
            
            // Керування світла камери - конкретні значення gain
            case 'light0db':
                this.setGain(0);
                break;
            case 'light2db':
                this.setGain(2);
                break;
            case 'light4db':
                this.setGain(4);
                break;
            case 'light6db':
                this.setGain(6);
                break;
            case 'light8db':
                this.setGain(8);
                break;
            case 'light10db':
                this.setGain(10);
                break;
            case 'light12db':
                this.setGain(12);
                break;
            case 'light14db':
                this.setGain(14);
                break;
            case 'light16db':
                this.setGain(16);
                break;
            case 'light18db':
                this.setGain(18);
                break;
            case 'light20db':
                this.setGain(20);
                break;
            case 'light22db':
                this.setGain(22);
                break;
            case 'light24db':
                this.setGain(24);
                break;
            case 'light26db':
                this.setGain(26);
                break;
            
            // Плавне керування (з normalized value)
            case 'gain':
                // Конвертуємо в діапазон 0-26 dB
                const gainValue = Math.round(normalizedValue * 26);
                this.setGain(gainValue);
                break;
            case 'shutter':
                // Конвертуємо в діапазон витримки
                const shutterValue = Math.round(50 + (normalizedValue * 950)); // 50-1000
                this.setShutter(shutterValue);
                break;
            case 'whiteBalance':
                this.setWhiteBalance(wbValue);
                break;
            case 'tint':
                // Конвертуємо в діапазон відтінку (-50 до +50)
                const tintValue = Math.round((normalizedValue - 0.5) * 100);
                this.setTint(tintValue);
                break;
            case 'focus':
                this.setFocus(normalizedValue);
                break;
            case 'iris':
                this.setIris(normalizedValue);
                break;
            
            // Крокові зміни
            case 'iso-up':
                this.adjustGain(2);
                break;
            case 'iso-down':
                this.adjustGain(-2);
                break;
            case 'shutter-up':
                this.adjustShutter(50);
                break;
            case 'shutter-down':
                this.adjustShutter(-50);
                break;
            case 'focus-near':
                this.adjustFocus(-0.1);
                break;
            case 'focus-far':
                this.adjustFocus(0.1);
                break;
            
            default:
                console.warn(`Невідома MIDI функція: ${functionId}`);
        }
    }

    /**
     * Допоміжна функція для корегування gain
     */
    async adjustGain(adjustment) {
        try {
            const currentGain = await this.camera.getGain() || 0;
            const newGain = Math.max(0, Math.min(26, currentGain + adjustment));
            await this.setGain(newGain);
        } catch (error) {
            console.error('Помилка корегування gain:', error);
        }
    }

    /**
     * Допоміжна функція для корегування витримки
     */
    async adjustShutter(adjustment) {
        try {
            const currentShutter = await this.camera.getShutter() || 50;
            const newShutter = Math.max(50, Math.min(2000, currentShutter + adjustment));
            await this.setShutter(newShutter);
        } catch (error) {
            console.error('Помилка корегування витримки:', error);
        }
    }
}

// Ініціалізація додатка після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BlackmagicCameraApp();
    window.cameraController = window.app.camera; // Додаємо посилання для MIDI контролера
});

// Обробка помилок
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});
