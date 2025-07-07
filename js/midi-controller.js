/**
 * MIDI Controller для Blackmagic Camera Control
 * Забезпечує підключення до MIDI пристроїв та керування функціями камери
 */

class MIDIController {
    constructor() {
        // Check if MIDI is supported on this platform
        this.isSupported = this.checkMIDISupport();
        
        if (!this.isSupported) {
            console.log('🎹 MIDI not supported on this platform');
            this.showUnsupportedMessage();
            return;
        }
        
        this.midiAccess = null;
        this.currentDevice = null;
        this.isLearning = false;
        this.mappings = new Map(); // MIDI command -> camera function mapping
        this.customButtons = new Map(); // Custom button configurations
        this.lastLearnedControl = null;
        this.currentEditingButton = null;
        this.isAssigningCustom = false;
        this.isSaving = false; // Флаг для запобігання подвійному збереженню
        
        this.initializeElements();
        this.initializeCustomButtons();
        this.loadFromLocalStorage();
        this.requestMIDIAccess();
    }

    // Check if MIDI is supported
    checkMIDISupport() {
        // Check if Web MIDI API is available
        if (!('requestMIDIAccess' in navigator)) {
            return false;
        }
        
        // Check platform support via platform detector
        if (window.platformDetector && !window.platformDetector.hasFeature('midi')) {
            return false;
        }
        
        // Additional mobile detection fallback
        const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        if (isMobile) {
            return false;
        }
        
        return true;
    }
    
    // Show message when MIDI is not supported
    showUnsupportedMessage() {
        const midiContainer = document.querySelector('.midi-container');
        if (midiContainer) {
            midiContainer.innerHTML = `
                <div class="midi-unsupported-message">
                    <div class="unsupported-icon">🎹</div>
                    <h3>MIDI недоступний</h3>
                    <p>MIDI контроль працює тільки на комп'ютерах з підтримкою Web MIDI API.</p>
                    <div class="unsupported-reasons">
                        <div class="reason-item">
                            <span class="reason-icon">📱</span>
                            <span>На мобільних пристроях MIDI не підтримується</span>
                        </div>
                        <div class="reason-item">
                            <span class="reason-icon">🌐</span>
                            <span>Потрібен сучасний браузер з Web MIDI API</span>
                        </div>
                        <div class="reason-item">
                            <span class="reason-icon">🎛️</span>
                            <span>Використовуйте touch керування замість MIDI</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add styles for unsupported message
            const style = document.createElement('style');
            style.textContent = `
                .midi-unsupported-message {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }
                
                .unsupported-icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                    opacity: 0.5;
                }
                
                .midi-unsupported-message h3 {
                    font-size: 24px;
                    margin-bottom: 16px;
                    color: var(--text-primary);
                }
                
                .midi-unsupported-message p {
                    font-size: 16px;
                    margin-bottom: 32px;
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.5;
                }
                
                .unsupported-reasons {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 500px;
                    margin: 0 auto;
                }
                
                .reason-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: var(--surface-color);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    text-align: left;
                }
                
                .reason-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                @media (max-width: 768px) {
                    .midi-unsupported-message {
                        padding: 40px 16px;
                    }
                    
                    .unsupported-icon {
                        font-size: 36px;
                    }
                    
                    .midi-unsupported-message h3 {
                        font-size: 20px;
                    }
                    
                    .midi-unsupported-message p {
                        font-size: 14px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    initializeElements() {
        // MIDI елементи
        this.devicesGrid = document.getElementById('midi-devices-grid');
        this.refreshBtn = document.getElementById('midi-refresh-btn');
        this.disconnectBtn = document.getElementById('midi-disconnect-btn');
        this.statusDot = document.getElementById('midi-status-dot');
        this.statusText = document.getElementById('midi-status-text');
        
        // Елементи налаштувань
        this.learnModeCheckbox = document.getElementById('midi-learn-mode');
        this.clearAllBtn = document.getElementById('midi-clear-all-btn');
        this.saveSettingsBtn = document.getElementById('midi-save-settings-btn');
        this.channelSelect = document.getElementById('midi-channel-select');
        this.sensitivitySelect = document.getElementById('midi-sensitivity-select');
        
        // Лог активності
        this.activityLog = document.getElementById('midi-activity-log');
        
        this.bindEvents();
    }

    bindEvents() {
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshDevices());
        }
        
        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', () => this.disconnectFromDevice());
        }
        
        if (this.learnModeCheckbox) {
            this.learnModeCheckbox.addEventListener('change', () => this.toggleLearningMode());
        }
        
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => this.clearAllMappings());
        }
        
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Експорт/імпорт налаштувань
        const exportBtn = document.getElementById('midi-export-btn');
        const importBtn = document.getElementById('midi-import-btn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSettings());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importSettings());
        }
        
        // Обробка кнопок призначення та MIDI пристроїв
        document.addEventListener('click', (e) => {
            console.log('Click event:', e.target); // Діагностика
            
            if (e.target.matches('.midi-assign-btn')) {
                const functionName = e.target.dataset.function;
                this.startAssignment(functionName, e.target);
            } else if (e.target.matches('.midi-clear-btn')) {
                const functionName = e.target.dataset.function;
                this.clearAssignment(functionName);
            } else {
                // Перевіряємо клік по MIDI пристрою (картка або її дочірні елементи)
                const deviceCard = e.target.closest('.midi-device-card');
                if (deviceCard) {
                    console.log('Device card clicked:', deviceCard); // Діагностика
                    const deviceId = deviceCard.dataset.deviceId;
                    const deviceName = deviceCard.dataset.deviceName;
                    console.log('Device ID:', deviceId, 'Device Name:', deviceName); // Діагностика
                    
                    if (deviceId && !deviceCard.classList.contains('connected')) {
                        console.log('Attempting to connect to device...'); // Діагностика
                        this.connectToDevice(deviceId, deviceName);
                    } else {
                        console.log('Device already connected or missing ID'); // Діагностика
                    }
                }
            }
        });
    }

    async requestMIDIAccess() {
        try {
            if (!navigator.requestMIDIAccess) {
                throw new Error('Web MIDI API не підтримується цим браузером');
            }
            
            this.midiAccess = await navigator.requestMIDIAccess();
            this.updateStatus('available', 'MIDI доступно');
            this.populateDeviceList();
            
            // Слухач для зміни MIDI пристроїв
            this.midiAccess.onstatechange = (event) => {
                this.onMIDIStateChange(event);
            };
            
            this.log('MIDI система ініціалізована');
            
        } catch (error) {
            console.error('Помилка ініціалізації MIDI:', error);
            this.updateStatus('error', 'MIDI недоступно');
            this.log(`Помилка: ${error.message}`, 'error');
        }
    }

    populateDeviceList() {
        if (!this.devicesGrid) return;
        
        // Очищуємо список
        this.devicesGrid.innerHTML = '';
        
        if (!this.midiAccess) {
            this.devicesGrid.innerHTML = `
                <div class="midi-device-placeholder">
                    <div class="placeholder-icon">❌</div>
                    <div class="placeholder-text">MIDI недоступно</div>
                </div>
            `;
            return;
        }
        
        const devices = Array.from(this.midiAccess.inputs.values());
        
        if (devices.length === 0) {
            this.devicesGrid.innerHTML = `
                <div class="midi-device-placeholder">
                    <div class="placeholder-icon">🔍</div>
                    <div class="placeholder-text">MIDI пристрої не знайдено</div>
                </div>
            `;
            return;
        }
        
        // Створюємо картки для кожного пристрою
        devices.forEach(device => {
            console.log('Creating card for device:', device.name, 'ID:', device.id); // Діагностика
            
            const deviceCard = document.createElement('div');
            deviceCard.className = 'midi-device-card';
            deviceCard.dataset.deviceId = device.id;
            deviceCard.dataset.deviceName = device.name;
            
            const isConnected = this.currentDevice && this.currentDevice.id === device.id;
            if (isConnected) {
                deviceCard.classList.add('connected');
            }
            
            deviceCard.innerHTML = `
                <div class="midi-device-header">
                    <div class="midi-device-icon">🎹</div>
                    <h4 class="midi-device-name">${device.name}</h4>
                </div>
                <div class="midi-device-info">
                    <div class="midi-device-manufacturer">${device.manufacturer || 'Невідомий виробник'}</div>
                    <div class="midi-device-type">${device.type || 'input'}</div>
                </div>
                <div class="midi-device-status ${isConnected ? 'connected' : 'available'}">
                    ${isConnected ? 'Підключено' : 'Доступний'}
                </div>
            `;
            
            this.devicesGrid.appendChild(deviceCard);
            console.log('Added device card to grid:', deviceCard); // Діагностика
        });
        
        this.log(`Знайдено ${devices.length} MIDI пристрої`);
    }

    refreshDevices() {
        this.log('Оновлення списку пристроїв...');
        this.populateDeviceList();
    }

    connectToDevice(deviceId, deviceName) {
        if (!deviceId || !this.midiAccess) {
            this.log('Неможливо підключитися - відсутній пристрій або MIDI доступ', 'error');
            return;
        }
        
        const device = this.midiAccess.inputs.get(deviceId);
        if (!device) {
            this.log('Пристрій не знайдено', 'error');
            return;
        }
        
        // Відключаємо попередній пристрій
        if (this.currentDevice) {
            this.disconnectFromDevice();
        }
        
        // Показуємо статус підключення
        const deviceCard = document.querySelector(`[data-device-id="${deviceId}"]`);
        if (deviceCard) {
            deviceCard.classList.add('connecting');
            const statusElement = deviceCard.querySelector('.midi-device-status');
            if (statusElement) {
                statusElement.textContent = 'Підключення...';
                statusElement.className = 'midi-device-status connecting';
            }
        }
        
        try {
            this.currentDevice = device;
            this.currentDevice.onmidimessage = (message) => this.onMIDIMessage(message);
            
            this.updateStatus('connected', `Підключено: ${device.name}`);
            this.updateButtons(true);
            this.log(`Підключено до ${device.name}`, 'success');
            
            // Оновлюємо відображення пристроїв
            this.populateDeviceList();
            
        } catch (error) {
            this.log(`Помилка підключення: ${error.message}`, 'error');
            
            // Скидаємо статус у разі помилки
            if (deviceCard) {
                deviceCard.classList.remove('connecting');
                const statusElement = deviceCard.querySelector('.midi-device-status');
                if (statusElement) {
                    statusElement.textContent = 'Доступний';
                    statusElement.className = 'midi-device-status available';
                }
            }
        }
    }

    disconnectFromDevice() {
        if (this.currentDevice) {
            this.currentDevice.onmidimessage = null;
            this.currentDevice = null;
            this.isLearning = false;
            
            this.updateStatus('available', 'MIDI доступно');
            this.updateButtons(false);
            this.log('Відключено від MIDI пристрою', 'warning');
            
            // Оновлюємо відображення пристроїв
            this.populateDeviceList();
        }
    }

    updateButtons(connected) {
        if (this.disconnectBtn) this.disconnectBtn.disabled = !connected;
    }

    onMIDIStateChange(event) {
        this.log(`MIDI пристрій ${event.port.state}: ${event.port.name}`);
        this.populateDeviceList();
        
        // Якщо поточний пристрій відключено
        if (this.currentDevice && event.port.id === this.currentDevice.id && event.port.state === 'disconnected') {
            this.disconnectFromDevice();
        }
    }

    onMIDIMessage(message) {
        const [command, note, velocity] = message.data;
        const commandKey = `${command}-${note}`;
        
        this.log(`MIDI: ${command.toString(16).padStart(2, '0')} ${note} ${velocity}`, 'midi');
        
        if (this.waitingForAssignment) {
            this.handleAssignment(commandKey, { command, note, velocity });
        } else if (this.isAssigningCustom) {
            this.handleCustomAssignment({ command, note, velocity });
        } else {
            this.handleMappedCommand(commandKey, velocity);
            // Також перевіряємо кастомні кнопки
            if (velocity > 0) {
            this.handleCustomButtonMIDI(note, velocity);
        }
        }
    }

    handleAssignment(commandKey, midiData) {
        const { functionName, button } = this.waitingForAssignment;
        
        // Зберігаємо мапінг
        this.mappings.set(commandKey, functionName);
        this.updateCCDisplay(functionName, `CC${midiData.note}`);
        
        // Відновлюємо кнопку
        button.textContent = 'Призначити';
        button.disabled = false;
        
        this.waitingForAssignment = null;
        this.isLearning = false;
        
        this.log(`Призначено: ${commandKey} → ${functionName}`, 'success');
        this.saveToLocalStorage();
    }

    handleCustomAssignment(midiData) {
        // Перевіряємо валідність MIDI даних
        if (!midiData || midiData.note === undefined || midiData.note === null) {
            console.error('Invalid MIDI data for custom assignment:', midiData);
            return;
        }
        
        this.lastLearnedControl = { cc: midiData.note };
        this.isAssigningCustom = false;
        this.updateLearningIndicator();
        
        if (this.customAssignStatus) {
            this.customAssignStatus.textContent = `Призначено CC ${midiData.note}`;
            this.customAssignStatus.className = 'midi-custom-assign-status success';
        }
        
        if (this.customCcInfo && this.customCcDisplay) {
            this.customCcInfo.style.display = 'block';
            this.customCcDisplay.textContent = `CC ${midiData.note}`;
        }
        
        this.log(`MIDI CC ${midiData.note} призначено для кастомної кнопки`, 'success');
    }

    updateCCDisplay(functionName, value) {
        const display = document.getElementById(`midi-${functionName}-cc`);
        if (display) {
            display.textContent = value;
        }
    }

    updateAllCCDisplays() {
        // Скидаємо всі відображення
        const displays = document.querySelectorAll('.midi-cc-display');
        displays.forEach(display => {
            display.textContent = '—';
        });
        
        // Оновлюємо на основі поточних мапінгів
        for (const [commandKey, functionName] of this.mappings) {
            const [command, note] = commandKey.split('-');
            this.updateCCDisplay(functionName, `CC${note}`);
        }
    }

    toggleLearningMode() {
        this.isLearning = this.learnModeCheckbox ? this.learnModeCheckbox.checked : false;
        
        if (this.isLearning) {
            this.log('Режим навчання увімкнено. Натисніть кнопку "Призначити" і потім натисніть на MIDI контролері...', 'learn');
            this.waitingForAssignment = null;
        } else {
            this.log('Режим навчання вимкнено');
            this.waitingForAssignment = null;
        }
    }

    startAssignment(functionName, button) {
        if (!this.currentDevice) {
            this.log('Спочатку підключіться до MIDI пристрою', 'error');
            return;
        }
        
        this.waitingForAssignment = { functionName, button };
        this.isLearning = true;
        
        // Візуальний індикатор очікування
        button.textContent = 'Натисніть MIDI...';
        button.disabled = true;
        
        this.log(`Очікування MIDI команди для "${functionName}". Натисніть контролер...`, 'learn');
        
        // Автоматично відміняємо через 10 секунд
        setTimeout(() => {
            if (this.waitingForAssignment && this.waitingForAssignment.functionName === functionName) {
                this.cancelAssignment();
            }
        }, 10000);
    }

    cancelAssignment() {
        if (this.waitingForAssignment) {
            this.waitingForAssignment.button.textContent = 'Призначити';
            this.waitingForAssignment.button.disabled = false;
            this.waitingForAssignment = null;
            this.isLearning = false;
            this.log('Призначення скасовано', 'warning');
        }
    }

    clearAssignment(functionName) {
        // Видаляємо мапінг для цієї функції
        for (const [commandKey, mappedFunction] of this.mappings) {
            if (mappedFunction === functionName) {
                this.mappings.delete(commandKey);
                this.updateCCDisplay(functionName, '—');
                this.log(`Видалено призначення для "${functionName}"`, 'warning');
                break;
            }
        }
        this.saveToLocalStorage();
    }

    clearAllMappings() {
        if (confirm('Видалити всі MIDI призначення?')) {
            this.mappings.clear();
            this.updateAllCCDisplays();
            this.log('Всі призначення видалено', 'warning');
            this.saveToLocalStorage();
        }
    }

    handleLearningMode(commandKey, midiData) {
        this.lastLearnedControl = { commandKey, midiData };
        this.log(`Засвоєно: ${commandKey} (CMD: ${midiData.command}, Note: ${midiData.note})`, 'learn');
        
        // Показуємо діалог для вибору функції
        this.showFunctionSelectionDialog(commandKey, midiData);
    }

    showFunctionSelectionDialog(commandKey, midiData) {
        const functions = [
            { id: 'record-start', name: '▶️ Почати запис' },
            { id: 'record-stop', name: '⏹️ Зупинити запис' },
            { id: 'record-toggle', name: '⏯️ Перемкнути запис' },
            { id: 'iso-up', name: '📈 ISO вверх' },
            { id: 'iso-down', name: '📉 ISO вниз' },
            { id: 'shutter-up', name: '🔆 Витримка +' },
            { id: 'shutter-down', name: '🔅 Витримка -' },
            { id: 'focus-near', name: '🔍 Фокус ближче' },
            { id: 'focus-far', name: '🔍 Фокус далі' },
            { id: 'zoom-in', name: '🔍 Збільшити' },
            { id: 'zoom-out', name: '🔍 Зменшити' },
            // Керування світла камери
            { id: 'light0db', name: '💡 Світло 0 dB' },
            { id: 'light2db', name: '💡 Світло 2 dB' },
            { id: 'light4db', name: '💡 Світло 4 dB' },
            { id: 'light6db', name: '💡 Світло 6 dB' },
            { id: 'light8db', name: '💡 Світло 8 dB' },
            { id: 'light10db', name: '💡 Світло 10 dB' },
            { id: 'light12db', name: '💡 Світло 12 dB' },
            { id: 'light14db', name: '💡 Світло 14 dB' },
            { id: 'light16db', name: '💡 Світло 16 dB' },
            { id: 'light18db', name: '💡 Світло 18 dB' },
            { id: 'light20db', name: '💡 Світло 20 dB' },
            { id: 'light22db', name: '💡 Світло 22 dB' },
            { id: 'light24db', name: '💡 Світло 24 дБ' },
            { id: 'light26db', name: '💡 Світло 26 дБ' }
        ];
        
        const dialog = document.createElement('div');
        dialog.className = 'midi-function-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Оберіть функцію для MIDI команди</h3>
                <p><strong>MIDI:</strong> ${commandKey}</p>
                <div class="function-list">
                    ${functions.map(func => `
                        <button class="function-btn" data-function="${func.id}">
                            ${func.name}
                        </button>
                    `).join('')}
                </div>
                <div class="dialog-buttons">
                    <button class="btn secondary" id="cancel-mapping">Скасувати</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Обробка вибору функції
        dialog.addEventListener('click', (e) => {
            if (e.target.matches('.function-btn')) {
                const functionId = e.target.dataset.function;
                this.addMapping(commandKey, functionId);
                document.body.removeChild(dialog);
            } else if (e.target.id === 'cancel-mapping') {
                document.body.removeChild(dialog);
            }
        });
    }

    addMapping(commandKey, functionId) {
        this.mappings.set(commandKey, functionId);
        this.updateMappingsList();
        this.saveToLocalStorage(); // Автоматичне збереження
        this.log(`Додано мапінг: ${commandKey} → ${functionId}`, 'success');
    }

    handleMappedCommand(commandKey, velocity) {
        const functionId = this.mappings.get(commandKey);
        if (!functionId) return;
        
        // Виконуємо функцію камери тільки при натисканні (velocity > 0)
        if (velocity > 0) {
            this.executeCameraFunction(functionId);
            this.log(`Виконано: ${functionId}`, 'execute');
        }
    }

    executeCameraFunction(functionId, velocity = 127) {
        // Для кастомних кнопок з фіксованим значенням використовуємо його як є
        // Для MIDI контролерів нормалізуємо значення (0-127) до відповідного діапазону
        const finalValue = velocity;

        // Інтеграція з основним додатком
        if (window.app && window.app.handleMIDICommand) {
            window.app.handleMIDICommand(functionId, finalValue);
            return;
        }
        
        // Fallback - прямий виклик функцій камери
        if (window.cameraController && window.cameraController.isConnected) {
            this.executeCameraControl(functionId, finalValue);
        } else {
            this.log('Камера не підключена', 'error');
            // Показуємо toast сповіщення
            if (window.showToast) {
                window.showToast('MIDI сигнал отримано, але камера не підключена', 'warning');
            }
        }
    }

    executeCameraControl(functionId, value) {
        const cameraController = window.cameraController;
        
        switch (functionId) {
            case 'record':
                cameraController.toggleRecording();
                break;
            case 'gain':
                // Якщо значення більше 127, вважаємо що це абсолютне значення ISO
                // Інакше нормалізуємо як MIDI значення (0-127) до діапазону ISO
                let isoValue;
                if (value > 127) {
                    isoValue = value; // Пряме значення
                } else {
                    const normalizedValue = value / 127;
                    isoValue = Math.round(100 + (normalizedValue * 25500));
                }
                cameraController.setGain(isoValue);
                break;
            case 'shutter':
                cameraController.setShutter(value);
                break;
            case 'whiteBalance':                                
                console.log('Calling setWhiteBalance with:', wbValue);
                cameraController.setWhiteBalance(wbValue);
                break;
            case 'tint':
                // Якщо значення в діапазоні -50..+50, використовуємо як є
                let tintValue;
                if (value >= -50 && value <= 50) {
                    tintValue = value; // Пряме значення
                } else if (value <= 127) {
                    const normalizedValue = value / 127;
                    tintValue = Math.round((normalizedValue - 0.5) * 100);
                } else {
                    tintValue = value; // Якщо більше 127, все одно використовуємо як є
                }
                cameraController.setTint(tintValue);
                break;
            case 'focus':
                cameraController.setFocus(value);
                break;
            case 'iris':
                cameraController.setIris(value);
                break;
            // Корекція кольору
            case 'liftRed':
            case 'gammaGreen':
            case 'gainBlue':
            case 'contrast':
            case 'saturation':
                cameraController.setColorCorrection(functionId, value);
                break;
            // Керування світла камери (gain values)
            case 'light0db':
                cameraController.setGain(0);
                break;
            case 'light2db':
                cameraController.setGain(2);
                break;
            case 'light4db':
                cameraController.setGain(4);
                break;
            case 'light6db':
                cameraController.setGain(6);
                break;
            case 'light8db':
                cameraController.setGain(8);
                break;
            case 'light10db':
                cameraController.setGain(10);
                break;
            case 'light12db':
                cameraController.setGain(12);
                break;
            case 'light14db':
                cameraController.setGain(14);
                break;
            case 'light16db':
                cameraController.setGain(16);
                break;
            case 'light18db':
                cameraController.setGain(18);
                break;
            case 'light20db':
                cameraController.setGain(20);
                break;
            case 'light22db':
                cameraController.setGain(22);
                break;
            case 'light24db':
                cameraController.setGain(24);
                break;
            case 'light26db':
                cameraController.setGain(26);
                break;
            default:
                this.log(`Невідома функція камери: ${functionId}`, 'warning');
        }
    }

    saveSettings() {
        const settings = {
            mappings: Array.from(this.mappings.entries()),
            channel: this.channelSelect ? this.channelSelect.value : '0',
            sensitivity: this.sensitivitySelect ? this.sensitivitySelect.value : 'medium',
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('midi-settings', JSON.stringify(settings));
        this.log('Налаштування збережено', 'success');
    }

    /**
     * Експорт налаштувань у JSON файл
     */
    exportSettings() {
        const deviceInfo = this.currentDevice ? {
            name: this.currentDevice.name,
            manufacturer: this.currentDevice.manufacturer || 'Unknown',
            id: this.currentDevice.id
        } : null;

        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            device: deviceInfo,
            mappings: Array.from(this.mappings.entries()).map(([command, func]) => ({
                midiCommand: command,
                function: func,
                description: this.getFunctionDescription(func)
            })),
            settings: {
                channel: this.channelSelect ? this.channelSelect.value : '0',
                sensitivity: this.sensitivitySelect ? this.sensitivitySelect.value : 'medium',
                learnMode: this.learnModeCheckbox ? this.learnModeCheckbox.checked : false
            },
            notes: `Експортовано ${new Date().toLocaleString('uk-UA')} з Blackmagic Camera Control`
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `midi-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.log('Налаштування експортовано в файл', 'success');
    }

    /**
     * Імпорт налаштувань з JSON файлу
     */
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.loadSettingsFromData(data);
                } catch (error) {
                    this.log('Помилка читання файлу налаштувань', 'error');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    /**
     * Завантаження налаштувань з об'єкта даних
     */
    loadSettingsFromData(data) {
        try {
            // Перевіряємо версію
            if (data.version !== "1.0") {
                this.log('Непідтримувана версія файлу налаштувань', 'warning');
            }

            // Завантажуємо мапінги
            if (data.mappings && Array.isArray(data.mappings)) {
                this.mappings.clear();
                
                data.mappings.forEach(mapping => {
                    if (mapping.midiCommand && mapping.function) {
                        this.mappings.set(mapping.midiCommand, mapping.function);
                    }
                });
                
                this.updateAllCCDisplays();
                this.log(`Завантажено ${data.mappings.length} MIDI призначень`, 'success');
            }

            // Завантажуємо налаштування
            if (data.settings) {
                if (this.channelSelect && data.settings.channel) {
                    this.channelSelect.value = data.settings.channel;
                }
                if (this.sensitivitySelect && data.settings.sensitivity) {
                    this.sensitivitySelect.value = data.settings.sensitivity;
                }
                if (this.learnModeCheckbox && typeof data.settings.learnMode === 'boolean') {
                    this.learnModeCheckbox.checked = data.settings.learnMode;
                }
            }

            // Зберігаємо в localStorage
            this.saveToLocalStorage();
            this.saveSettings();

            // Показуємо інформацію про пристрій
            if (data.device) {
                this.log(`Налаштування для пристрою: ${data.device.name}`, 'info');
            }

            this.log('Налаштування успішно імпортовано', 'success');

        } catch (error) {
            this.log('Помилка імпорту налаштувань', 'error');
            console.error('Settings import error:', error);
        }
    }

    /**
     * Отримання опису функції
     */
    getFunctionDescription(functionName) {
        const descriptions = {
            'record': 'Запис ON/OFF',
            'gain': 'Плавне керування gain',
            'shutter': 'Плавне керування витримки',
            'whiteBalance': 'Плавне керування балансу білого',
            'tint': 'Плавне керування відтінку',
            'focus': 'Плавне керування фокусу',
            'iris': 'Плавне керування діафрагми',
            'light0db': 'Світло 0 dB',
            'light2db': 'Світло 2 dB',
            'light4db': 'Світло 4 dB',
            'light6db': 'Світло 6 dB',
            'light8db': 'Світло 8 dB',
            'light10db': 'Світло 10 dB',
            'light12db': 'Світло 12 dB',
            'light14db': 'Світло 14 dB',
            'light16db': 'Світло 16 dB',
            'light18db': 'Світло 18 dB',
            'light20db': 'Світло 20 dB',
            'light22db': 'Світло 22 dB',
            'light24db': 'Світло 24 dB',
            'light26db': 'Світло 26 dB',
            'liftRed': 'Lift Red',
            'gammaGreen': 'Gamma Green', 
            'gainBlue': 'Gain Blue',
            'contrast': 'Контраст',
            'saturation': 'Насиченість'
        };
        
        return descriptions[functionName] || functionName;
    }

    saveToLocalStorage() {
        const data = Array.from(this.mappings.entries());
        localStorage.setItem('midi-mappings', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('midi-mappings');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.mappings = new Map(data);
                this.updateAllCCDisplays();
                this.log('Мапінги завантажено з локального сховища');
            } catch (error) {
                console.error('Помилка завантаження мапінгів:', error);
            }
        }
        
        // Завантажуємо налаштування
        const settings = localStorage.getItem('midi-settings');
        if (settings) {
            try {
                const data = JSON.parse(settings);
                if (this.channelSelect) this.channelSelect.value = data.channel || '0';
                if (this.sensitivitySelect) this.sensitivitySelect.value = data.sensitivity || 'medium';
            } catch (error) {
                console.error('Помилка завантаження налаштувань:', error);
            }
        }
        
        // Кастомні кнопки завантажуються в initializeCustomButtons()
    }

    updateMappingsList() {
        if (!this.mappingsList) return;
        
        this.mappingsList.innerHTML = '';
        
        for (const [commandKey, functionId] of this.mappings) {
            const item = document.createElement('div');
            item.className = 'mapping-item';
            item.innerHTML = `
                <span class="midi-command">${commandKey}</span>
                <span class="arrow">→</span>
                <span class="function-name">${functionId}</span>
                <button class="remove-btn" data-command="${commandKey}">✕</button>
            `;
            this.mappingsList.appendChild(item);
        }
        
        // Обробка видалення мапінгів
        this.mappingsList.addEventListener('click', (e) => {
            if (e.target.matches('.remove-btn')) {
                const commandKey = e.target.dataset.command;
                this.mappings.delete(commandKey);
                this.updateMappingsList();
                this.log(`Видалено мапінг: ${commandKey}`, 'warning');
            }
        });
    }

    clearMappings() {
        if (confirm('Видалити всі MIDI мапінги?')) {
            this.mappings.clear();
            this.updateMappingsList();
            this.log('Всі мапінги видалено', 'warning');
        }
    }

    saveMappings() {
        const data = {
            mappings: Array.from(this.mappings.entries()),
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'midi-mappings.json';
        a.click();
        
        URL.revokeObjectURL(url);
        this.log('MIDI мапінги збережено', 'success');
    }

    loadMappingsFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.mappings = new Map(data.mappings);
                    this.updateMappingsList();
                    this.log('MIDI мапінги завантажено', 'success');
                } catch (error) {
                    this.log('Помилка завантаження мапінгів', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    loadMappings() {
        const saved = localStorage.getItem('midi-mappings');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.mappings = new Map(data);
                this.updateMappingsList();
            } catch (error) {
                console.error('Помилка завантаження збережених мапінгів:', error);
            }
        }
    }

    refreshDevices() {
        this.populateDeviceList();
        this.log('Список MIDI пристроїв оновлено');
    }

    // ==================== CUSTOM BUTTONS METHODS ====================

    initializeCustomButtons() {
        // Ініціалізація елементів кастомних кнопок
        this.customGrid = document.getElementById('midi-custom-grid');
        this.customEmpty = document.getElementById('midi-custom-empty');
        this.addCustomBtn = document.getElementById('midi-add-custom-btn');
        this.exportCustomBtn = document.getElementById('midi-export-custom-btn');
        this.importCustomBtn = document.getElementById('midi-import-custom-btn');
        
        // Modal елементи
        this.customModal = document.getElementById('midi-custom-modal');
        this.customModalTitle = document.getElementById('midi-custom-modal-title');
        this.customModalClose = document.getElementById('midi-custom-modal-close');
        this.customForm = document.getElementById('midi-custom-form');
        this.customNameInput = document.getElementById('midi-custom-name');
        this.customFunctionSelect = document.getElementById('midi-custom-function');
        this.customValueInput = document.getElementById('midi-custom-value');
        this.customAssignBtn = document.getElementById('midi-custom-assign-btn');
        this.customAssignStatus = document.getElementById('midi-custom-assign-status');
        this.customCcInfo = document.getElementById('midi-custom-cc-info');
        this.customCcDisplay = document.getElementById('midi-custom-cc-display');
        this.customCancelBtn = document.getElementById('midi-custom-cancel-btn');
        this.customDeleteBtn = document.getElementById('midi-custom-delete-btn');
        this.customSaveBtn = document.getElementById('midi-custom-save-btn');
        
        // Learning indicator
        this.learningIndicator = document.getElementById('midi-learning-indicator');
        
        this.bindCustomButtonEvents();
        this.populateCustomFunctions(); // Заповнюємо опції функцій
        this.loadCustomButtons(); // Завантажуємо кастомні кнопки
        this.cleanupCustomButtons(); // Очищаємо некоректні дані
        this.renderCustomButtons();
    }

    bindCustomButtonEvents() {
        // Додати нову кнопку
        if (this.addCustomBtn) {
            this.addCustomBtn.addEventListener('click', () => this.openCustomButtonModal());
        }
        
        // Експорт/імпорт кастомних кнопок
        if (this.exportCustomBtn) {
            this.exportCustomBtn.addEventListener('click', () => this.exportCustomButtons());
        }
        
        if (this.importCustomBtn) {
            this.importCustomBtn.addEventListener('click', () => this.importCustomButtons());
        }
        
        // Modal events
        if (this.customModalClose) {
            this.customModalClose.addEventListener('click', () => this.closeCustomButtonModal());
        }
        
        if (this.customModal) {
            this.customModal.addEventListener('click', (e) => {
                if (e.target === this.customModal) {
                    this.closeCustomButtonModal();
                }
            });
        }
        
        if (this.customAssignBtn) {
            this.customAssignBtn.addEventListener('click', () => this.startCustomAssignment());
        }
        
        if (this.customCancelBtn) {
            this.customCancelBtn.addEventListener('click', () => this.closeCustomButtonModal());
        }
        
        if (this.customDeleteBtn) {
            this.customDeleteBtn.addEventListener('click', () => this.deleteCustomButton());
        }
        
        if (this.customSaveBtn) {
            this.customSaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveCustomButton();
            });
        }
        
        // Escape для закриття modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.customModal && this.customModal.classList.contains('active')) {
                this.closeCustomButtonModal();
            }
        });
        
        // Custom button card events
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.midi-custom-action-btn:not(.danger)');
            const deleteBtn = e.target.closest('.midi-custom-action-btn.danger');
            
            if (editBtn) {
                const card = editBtn.closest('.midi-custom-button-card');
                const buttonId = card?.dataset.buttonId;
                if (buttonId) {
                    this.editCustomButton(buttonId);
                }
            } else if (deleteBtn) {
                const card = deleteBtn.closest('.midi-custom-button-card');
                const buttonId = card?.dataset.buttonId;
                if (buttonId) {
                    this.confirmDeleteCustomButton(buttonId);
                }
            }
        });
    }

    openCustomButtonModal(buttonId = null) {
        if (!this.customModal) return;
        
        this.currentEditingButton = buttonId;
        this.isAssigningCustom = false;
        
        // Reset form
        if (this.customForm) this.customForm.reset();
        if (this.customCcInfo) this.customCcInfo.style.display = 'none';
        if (this.customAssignStatus) {
            this.customAssignStatus.textContent = 'Натисніть "Призначити MIDI" і рухайте контролером';
            this.customAssignStatus.className = 'midi-custom-assign-status';
        }
        
        if (buttonId) {
            // Edit mode
            const button = this.customButtons.get(buttonId);
            if (button) {
                this.customModalTitle.textContent = 'Редагувати кастомну кнопку';
                this.customNameInput.value = button.name;
                this.customFunctionSelect.value = button.function;
                this.customValueInput.value = button.value || '';
                
                if (button.cc !== undefined) {
                    this.customCcInfo.style.display = 'block';
                    this.customCcDisplay.textContent = `CC ${button.cc}`;
                }
                
                this.customDeleteBtn.style.display = 'inline-block';
            }
        } else {
            // Add mode
            this.customModalTitle.textContent = 'Додати кастомну кнопку';
            this.customDeleteBtn.style.display = 'none';
        }
        
        this.customModal.classList.add('active');
    }

    closeCustomButtonModal() {
        if (!this.customModal) return;
        
        this.customModal.classList.remove('active');
        this.currentEditingButton = null;
        this.isAssigningCustom = false;
        this.lastLearnedControl = null; // Очищаємо lastLearnedControl при закритті
        this.updateLearningIndicator();
    }

    editCustomButton(buttonId) {
        this.openCustomButtonModal(buttonId);
    }

    confirmDeleteCustomButton(buttonId) {
        const button = this.customButtons.get(buttonId);
        if (!button) return;
        
        if (confirm(`Видалити кастомну кнопку "${button.name}"?`)) {
            this.deleteCustomButtonById(buttonId);
        }
    }

    deleteCustomButton() {
        if (!this.currentEditingButton) return;
        
        const button = this.customButtons.get(this.currentEditingButton);
        if (!button) return;
        
        if (confirm(`Видалити кастомну кнопку "${button.name}"?`)) {
            this.deleteCustomButtonById(this.currentEditingButton);
            this.closeCustomButtonModal();
        }
    }

    deleteCustomButtonById(buttonId) {
        if (!buttonId || !this.customButtons.has(buttonId)) {
            console.warn('Trying to delete non-existent button:', buttonId);
            return;
        }
        
        const button = this.customButtons.get(buttonId);
        const buttonName = button && button.name ? button.name : buttonId;
        
        this.customButtons.delete(buttonId);
        this.saveCustomButtons();
        this.renderCustomButtons();
        this.log(`Видалено кастомну кнопку: ${buttonName}`, 'info');
    }

    startCustomAssignment() {
        if (!this.currentDevice) {
            this.showToast('Спочатку підключіться до MIDI пристрою', 'error');
            return;
        }
        
        this.isAssigningCustom = true;
        this.lastLearnedControl = null; // Очищаємо попередні дані
        this.updateLearningIndicator();
        
        if (this.customAssignStatus) {
            this.customAssignStatus.textContent = 'Очікування MIDI сигналу...';
            this.customAssignStatus.className = 'midi-custom-assign-status waiting';
        }
        
        if (this.customCcInfo) {
            this.customCcInfo.style.display = 'none';
        }
    }

    saveCustomButton() {
        // Запобігаємо подвійному виконанню
        if (this.isSaving) {
            return;
        }
        this.isSaving = true;
        
        const name = this.customNameInput?.value?.trim();
        const func = this.customFunctionSelect?.value;
        const value = this.customValueInput?.value;
        
        console.log('Saving custom button with:', { name, func, value, valueType: typeof value });
        
        if (!name || !func) {
            this.showToast('Будь ласка, заповніть всі обов\'язкові поля', 'error');
            this.isSaving = false;
            return;
        }
        
        // Перевіряємо чи не створюємо дублікати
        if (!this.currentEditingButton) {
            // Перевіряємо чи вже існує кнопка з такою назвою
            for (const button of this.customButtons.values()) {
                if (button && button.name === name) {
                    this.showToast('Кнопка з такою назвою вже існує', 'error');
                    this.isSaving = false;
                    return;
                }
            }
        }
        
        const buttonId = this.currentEditingButton || this.generateCustomButtonId();
        
        // Отримуємо існуючі дані кнопки якщо редагуємо
        const existingButton = this.currentEditingButton ? this.customButtons.get(this.currentEditingButton) : null;
        
        const buttonData = {
            id: buttonId,
            name: name,
            function: func,
            value: value && value.toString().trim() !== '' ? parseFloat(value) : null,
            cc: undefined // За замовчуванням
        };
        
        // Зберігаємо існуючий CC якщо редагуємо та не призначали новий
        if (existingButton && existingButton.cc !== undefined && !this.lastLearnedControl) {
            buttonData.cc = existingButton.cc;
        }
        
        // Якщо призначили новий CC під час редагування або створення
        if (this.lastLearnedControl && this.lastLearnedControl.cc !== undefined) {
            buttonData.cc = this.lastLearnedControl.cc;
            // Очищаємо lastLearnedControl після використання
            this.lastLearnedControl = null;
        }
        
        console.log('Button data to save:', buttonData);
        this.customButtons.set(buttonId, buttonData);
        console.log('Custom buttons after save:', this.customButtons.size);
        
        this.saveCustomButtons();
        this.renderCustomButtons();
        
        const action = this.currentEditingButton ? 'оновлено' : 'додано';
        this.log(`Кастомну кнопку "${name}" ${action}`, 'success');
        this.showToast(`Кастомну кнопку "${name}" ${action}`, 'success');
        
        this.closeCustomButtonModal();
        this.isSaving = false;
    }

    generateCustomButtonId() {
        return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    renderCustomButtons() {
        console.log('Rendering custom buttons, total count:', this.customButtons.size);
        
        if (!this.customGrid) {
            console.warn('Custom grid element not found');
            return;
        }
        
        // Очищаємо сітку, залишаючи empty state
        const existingCards = this.customGrid.querySelectorAll('.midi-custom-button-card');
        existingCards.forEach(card => card.remove());
        
        if (this.customButtons.size === 0) {
            console.log('No custom buttons to display, showing empty state');
            if (this.customEmpty) {
                this.customEmpty.style.display = 'block';
            }
            return;
        }
        
        if (this.customEmpty) {
            this.customEmpty.style.display = 'none';
        }
        
        this.customButtons.forEach((button, buttonId) => {
            console.log('Rendering button:', button.name, 'with ID:', buttonId);
            // Перевіряємо валідність даних кнопки
            if (button && typeof button === 'object') {
                const card = this.createCustomButtonCard(button);
                if (card && card.children.length > 0) { // Перевіряємо, що картка створена успішно
                    this.customGrid.appendChild(card);
                }
            } else {
                console.error('Invalid button data for ID:', buttonId, button);
            }
        });
    }

    createCustomButtonCard(button) {
        // Перевіряємо, що button не null і має необхідні властивості
        if (!button || !button.id) {
            console.error('Invalid button data:', button);
            return document.createElement('div'); // Повертаємо порожній div у разі помилки
        }
        
        const card = document.createElement('div');
        card.className = 'midi-custom-button-card';
        card.dataset.buttonId = button.id;
        
        const isActive = button.cc !== undefined && button.cc !== null;
        const ccText = isActive ? `CC ${button.cc}` : 'Не призначено';
        const valueText = (button.value !== null && button.value !== undefined) ? button.value.toString() : 'Змінний';
        
        card.innerHTML = `
            <div class="midi-custom-status ${isActive ? '' : 'inactive'}"></div>
            <div class="midi-custom-button-header">
                <div class="midi-custom-button-name">${button.name || 'Без назви'}</div>
                <div class="midi-custom-button-actions">
                    <button type="button" class="midi-custom-action-btn" title="Редагувати">✏️</button>
                    <button type="button" class="midi-custom-action-btn danger" title="Видалити">🗑️</button>
                </div>
            </div>
            <div class="midi-custom-button-info">
                <div class="midi-custom-info-item">
                    <div class="midi-custom-info-label">Функція</div>
                    <div class="midi-custom-info-value">${this.getFunctionDisplayName(button.function || '')}</div>
                </div>
                <div class="midi-custom-info-item">
                    <div class="midi-custom-info-label">MIDI CC</div>
                    <div class="midi-custom-info-value ${isActive ? '' : 'unassigned'}">${ccText}</div>
                </div>
                <div class="midi-custom-info-item">
                    <div class="midi-custom-info-label">Значення</div>
                    <div class="midi-custom-info-value">${valueText}</div>
                </div>
            </div>
        `;
        
        return card;
    }

    getFunctionDisplayName(functionName) {
        const displayNames = {
            gain: 'Gain (ISO)',
            iris: 'Iris (Діафрагма)',
            shutter: 'Shutter (Витримка)',
            whiteBalance: 'White Balance',
            tint: 'Tint',
            focus: 'Focus',
            record: 'Запис ON/OFF',
            liftRed: 'Lift Red',
            liftGreen: 'Lift Green',
            liftBlue: 'Lift Blue',
            gammaRed: 'Gamma Red',
            gammaGreen: 'Gamma Green',
            gammaBlue: 'Gamma Blue',
            gainRed: 'Gain Red',
            gainGreen: 'Gain Green',
            gainBlue: 'Gain Blue',
            contrast: 'Contrast',
            saturation: 'Saturation'
        };
        
        return displayNames[functionName] || functionName;
    }

    updateLearningIndicator() {
        if (!this.learningIndicator) return;
        
        if (this.isAssigningCustom) {
            this.learningIndicator.classList.add('active');
        } else {
            this.learningIndicator.classList.remove('active');
        }
    }

    handleCustomButtonMIDI(cc, value) {
        // Перевіряємо, що cc не null і value не null
        if (cc === null || cc === undefined || value === null || value === undefined) {
            return;
        }
        
        // Шукаємо кастомні кнопки з цим CC
        for (const button of this.customButtons.values()) {
            if (button && button.cc === cc) {
                // Використовуємо призначене значення кнопки, якщо воно задане
                // Інакше використовуємо значення з MIDI контролера
                const finalValue = (button.value !== null && button.value !== undefined) ? button.value : value;

                // Викликаємо функцію тільки при натисканні (value > 0) для кнопок
                // або завжди для фейдерів/енкодерів
                if (value > 0 || button.function === 'gain' || button.function === 'iris' || 
                    button.function === 'shutter' || button.function === 'whiteBalance' || 
                    button.function === 'tint' || button.function === 'focus') {
                    this.executeCameraFunction(button.function, finalValue);
                    this.log(`Кастомна кнопка "${button.name}": ${button.function} = ${finalValue}`, 'custom');
                }
            }
        }
    }

    exportCustomButtons() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            customButtons: Array.from(this.customButtons.entries())
                .filter(([id, button]) => button && typeof button === 'object' && button.id && button.name && button.function)
                .map(([id, button]) => ({
                    id, ...button
                }))
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `midi-custom-buttons-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Кастомні кнопки експортовано', 'success');
    }

    importCustomButtons() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.customButtons && Array.isArray(data.customButtons)) {
                        // Очищаємо існуючі кнопки
                        this.customButtons.clear();
                        
                        // Імпортуємо нові
                        data.customButtons.forEach(button => {
                            if (button && button.id && button.name && button.function) {
                                this.customButtons.set(button.id, button);
                                console.log('Imported button:', button.name);
                            }
                        });
                        
                        this.saveCustomButtons();
                        this.renderCustomButtons();
                        this.showToast(`Імпортовано ${data.customButtons.length} кастомних кнопок`, 'success');
                    } else {
                        this.showToast('Неправильний формат файлу', 'error');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    this.showToast('Помилка при імпорті файлу', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    saveCustomButtons() {
        try {
            // Фільтруємо тільки валідні кнопки та зберігаємо як масив об'єктів
            const validButtons = Array.from(this.customButtons.values()).filter((button) => {
                return button && typeof button === 'object' && button.id && button.name && button.function;
            });
            
            console.log('Saving custom buttons:', validButtons); // Додаємо логування для діагностики
            localStorage.setItem('midiCustomButtons', JSON.stringify(validButtons));
        } catch (error) {
            console.error('Error saving custom buttons:', error);
        }
    }

    loadCustomButtons() {
        try {
            const saved = localStorage.getItem('midiCustomButtons');
            console.log('Loading custom buttons from localStorage:', saved); // Додаємо логування
            
            if (saved) {
                const data = JSON.parse(saved);
                this.customButtons = new Map();
                
                // Перевіряємо структуру даних і фільтруємо некоректні записи
                if (Array.isArray(data)) {
                    data.forEach((item) => {
                        // Перевіряємо, чи це пара [id, button] або об'єкт button
                        let id, button;
                        
                        if (Array.isArray(item) && item.length === 2) {
                            // Стара структура: [id, button]
                            [id, button] = item;
                        } else if (item && typeof item === 'object' && item.id) {
                            // Нова структура: просто об'єкт з id
                            id = item.id;
                            button = item;
                        } else {
                            console.warn('Skipping invalid button data:', item);
                            return;
                        }
                        
                        if (button && typeof button === 'object' && button.id && button.name && button.function) {
                            this.customButtons.set(id, button);
                            console.log('Loaded button:', button.name, 'with id:', id);
                        } else {
                            console.warn('Skipping invalid button data:', { id, button });
                        }
                    });
                    
                    console.log('Total loaded custom buttons:', this.customButtons.size);
                } else {
                    console.warn('Invalid custom buttons data format, resetting');
                    this.customButtons = new Map();
                }
            } else {
                console.log('No saved custom buttons found');
                this.customButtons = new Map();
            }
            
            // Після завантаження обов'язково рендеримо кнопки
            this.renderCustomButtons();
        } catch (error) {
            console.error('Error loading custom buttons:', error);
            this.customButtons = new Map();
            this.renderCustomButtons();
        }
    }

    // Метод для очищення некоректних даних
    cleanupCustomButtons() {
        const validButtons = new Map();
        
        for (const [id, button] of this.customButtons.entries()) {
            if (button && typeof button === 'object' && button.id && button.name && button.function) {
                validButtons.set(id, button);
            } else {
                console.warn('Removing invalid button data:', { id, button });
            }
        }
        
        this.customButtons = validButtons;
        this.saveCustomButtons();
    }

    showToast(message, type = 'info') {
        // Використовуємо існуючу систему toast з app.js
        if (window.showToast) {
            window.showToast(message, type);
        }
    }

    updateStatus(status, message) {
        if (!this.statusDot || !this.statusText) return;
        
        this.statusDot.className = `midi-indicator ${status}`;
        this.statusText.textContent = message;
    }

    log(message, type = 'info') {
        if (!this.activityLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="message">${message}</span>
        `;
        
        this.activityLog.appendChild(logEntry);
        this.activityLog.scrollTop = this.activityLog.scrollHeight;
        
        // Обмежуємо кількість записів
        while (this.activityLog.children.length > 100) {
            this.activityLog.removeChild(this.activityLog.firstChild);
        }
    }
    
    populateCustomFunctions() {
        if (!this.customFunctionSelect) return;
        
        const functions = [
            { value: 'gain', label: 'Gain (ISO)' },
            { value: 'iris', label: 'Iris (Діафрагма)' },
            { value: 'shutter', label: 'Shutter (Витримка)' },
            { value: 'whiteBalance', label: 'White Balance' },
            { value: 'tint', label: 'Tint' },
            { value: 'focus', label: 'Focus' },
            { value: 'record', label: 'Запис ON/OFF' },
            { value: 'liftRed', label: 'Lift Red' },
            { value: 'liftGreen', label: 'Lift Green' },
            { value: 'liftBlue', label: 'Lift Blue' },
            { value: 'gammaRed', label: 'Gamma Red' },
            { value: 'gammaGreen', label: 'Gamma Green' },
            { value: 'gammaBlue', label: 'Gamma Blue' },
            { value: 'gainRed', label: 'Gain Red' },
            { value: 'gainGreen', label: 'Gain Green' },
            { value: 'gainBlue', label: 'Gain Blue' },
            { value: 'contrast', label: 'Contrast' },
            { value: 'saturation', label: 'Saturation' }
        ];
        
        // Очищаємо поточні опції
        this.customFunctionSelect.innerHTML = '<option value="">Оберіть функцію...</option>';
        
        // Додаємо опції
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func.value;
            option.textContent = func.label;
            this.customFunctionSelect.appendChild(option);
        });
    }
}

// Ініціалізація MIDI контролера при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    window.midiController = new MIDIController();
});
