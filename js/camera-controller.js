/**
 * Blackmagic Camera Controller
 * Управління камерою через REST API
 */
class BlackmagicCameraController {
    constructor() {
        this.baseUrl = '';
        this.isConnected = false;
        this.currentSettings = {
            gain: null,
            shutter: null,
            iso: null,
            whiteBalance: null,
            tint: null,
            focus: null,
            iris: null,
            recording: false,
            colorCorrection: null
        };
        
        this.logCallback = null;
        this.statusCallback = null;
    }

    /**
     * Встановлює callback функції для логування та статусу
     */
    setCallbacks(logCallback, statusCallback) {
        this.logCallback = logCallback;
        this.statusCallback = statusCallback;
    }

    /**
     * Логування повідомлень
     */
    log(message, type = 'info') {
        if (this.logCallback) {
            this.logCallback(message, type);
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Оновлення статусу підключення
     */
    updateStatus(isConnected, message = '') {
        this.isConnected = isConnected;
        if (this.statusCallback) {
            this.statusCallback(isConnected, message);
        }
    }

    /**
     * Підключення до камери
     */
    async connect(cameraAddress) {
        if (!cameraAddress) {
            throw new Error('Адреса камери не вказана');
        }

        this.baseUrl = `http://${cameraAddress}/control/api/v1`;
        this.log(`Підключення до камери: ${cameraAddress}`, 'info');

        try {
            const response = await this.makeRequest('/system', 'GET', null, 5000);
            
            if (response.ok || response.status === 204) {
                this.updateStatus(true, 'Підключено');
                this.log('Успішно підключено до камери', 'success');
                
                // Отримуємо початкові налаштування
                await this.refreshAllSettings();
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.updateStatus(false, 'Помилка підключення');
            this.log(`Помилка підключення: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Відключення від камери
     */
    disconnect() {
        this.isConnected = false;
        this.baseUrl = '';
        this.currentSettings = {
            gain: null,
            shutter: null,
            iso: null,
            whiteBalance: null,
            tint: null,
            focus: null,
            iris: null,
            recording: false,
            colorCorrection: null
        };
        this.updateStatus(false, 'Відключено');
        this.log('Відключено від камери', 'info');
    }

    /**
     * Базовий метод для HTTP запитів
     */
    async makeRequest(endpoint, method = 'GET', body = null, timeout = 10000) {
        if (!this.isConnected && endpoint !== '/system') {
            throw new Error('Не підключено до камери');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(timeout)
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        this.log(`${method} ${endpoint}${body ? ` | Body: ${JSON.stringify(body)}` : ''}`, 'info');

        try {
            const response = await fetch(url, options);
            this.log(`Відповідь: HTTP ${response.status} ${response.statusText}`, 'info');
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.log(`Таймаут запиту до ${endpoint} (${timeout}ms)`, 'warning');
            }
            throw error;
        }
    }

    /**
     * Отримання поточного gain
     */
    async getGain() {
        try {
            const response = await this.makeRequest('/video/gain', 'GET');
            if (response.ok) {
                const data = await response.json();
                const gain = data.gain !== undefined ? data.gain : data.value;
                this.currentSettings.gain = gain;
                this.log(`Поточний gain: ${gain} dB`, 'success');
                return gain;
            }
        } catch (error) {
            this.log(`Помилка отримання gain: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення gain
     */
    async setGain(gainValue) {
        try {
            const response = await this.makeRequest('/video/gain', 'PUT', { gain: gainValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.gain = gainValue;
                this.log(`Gain встановлено: ${gainValue} dB`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення gain: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання поточної витримки
     */
    async getShutter() {
        try {
            const response = await this.makeRequest('/video/shutter', 'GET');
            if (response.ok) {
                const data = await response.json();
                const shutter = data.shutterSpeed !== undefined ? data.shutterSpeed : data.shutter;
                this.currentSettings.shutter = shutter;
                this.log(`Поточна витримка: 1/${shutter}`, 'success');
                return shutter;
            }
        } catch (error) {
            this.log(`Помилка отримання витримки: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення витримки
     */
    async setShutter(shutterValue) {
        try {
            const response = await this.makeRequest('/video/shutter', 'PUT', { shutterSpeed: shutterValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.shutter = shutterValue;
                this.log(`Витримка встановлена: 1/${shutterValue}`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення витримки: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання поточного ISO
     */
    async getISO() {
        try {
            const response = await this.makeRequest('/video/iso', 'GET');
            if (response.ok) {
                const data = await response.json();
                const iso = data.iso !== undefined ? data.iso : data.value;
                this.currentSettings.iso = iso;
                this.log(`Поточне ISO: ${iso}`, 'success');
                return iso;
            }
        } catch (error) {
            this.log(`Помилка отримання ISO: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення ISO
     */
    async setISO(isoValue) {
        try {
            const response = await this.makeRequest('/video/iso', 'PUT', { iso: isoValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.iso = isoValue;
                this.log(`ISO встановлено: ${isoValue}`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення ISO: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання білого балансу
     */
    async getWhiteBalance() {
        try {
            const response = await this.makeRequest('/video/whiteBalance', 'GET');
            if (response.ok) {
                const data = await response.json();
                const wb = data.whiteBalance !== undefined ? data.whiteBalance : data.value;
                this.currentSettings.whiteBalance = wb;
                this.log(`Поточний білий баланс: ${wb}K`, 'success');
                return wb;
            }
        } catch (error) {
            this.log(`Помилка отримання білого балансу: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення білого балансу
     */
    async setWhiteBalance(wbValue) {
        try {
            const response = await this.makeRequest('/video/whiteBalance', 'PUT', { whiteBalance: wbValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.whiteBalance = wbValue;
                this.log(`Білий баланс встановлено: ${wbValue}K`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення білого балансу: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання tint
     */
    async getTint() {
        try {
            const response = await this.makeRequest('/video/whiteBalanceTint', 'GET');
            if (response.ok) {
                const data = await response.json();
                const tint = data.whiteBalanceTint !== undefined ? data.whiteBalanceTint : data.value;
                this.currentSettings.tint = tint;
                this.log(`Поточний tint: ${tint}`, 'success');
                return tint;
            }
        } catch (error) {
            this.log(`Помилка отримання tint: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення tint
     */
    async setTint(tintValue) {
        try {
            const response = await this.makeRequest('/video/whiteBalanceTint', 'PUT', { whiteBalanceTint: tintValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.tint = tintValue;
                this.log(`Tint встановлено: ${tintValue}`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення tint: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання фокуса
     */
    async getFocus() {
        try {
            const response = await this.makeRequest('/lens/focus', 'GET');
            if (response.ok) {
                const data = await response.json();
                const focus = data.normalised !== undefined ? data.normalised : (data.focus !== undefined ? data.focus : data.value);
                this.currentSettings.focus = focus;
                this.log(`Поточний фокус: ${focus}`, 'success');
                return focus;
            }
        } catch (error) {
            this.log(`Помилка отримання фокуса: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення фокуса
     */
    async setFocus(focusValue) {
        try {
            const response = await this.makeRequest('/lens/focus', 'PUT', { normalised: focusValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.focus = focusValue;
                this.log(`Фокус встановлено: ${focusValue}`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення фокуса: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Автофокус
     */
    async triggerAutoFocus() {
        try {
            const response = await this.makeRequest('/lens/focus/doAutoFocus', 'PUT', {});
            if (response.ok || response.status === 204) {
                this.log('Автофокус активовано', 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка автофокуса: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання діафрагми
     */
    async getIris() {
        try {
            const response = await this.makeRequest('/lens/iris', 'GET');
            if (response.ok) {
                const data = await response.json();
                const iris = data.apertureStop !== undefined ? data.apertureStop : (data.iris !== undefined ? data.iris : data.value);
                this.currentSettings.iris = iris;
                this.log(`Поточна діафрагма: f/${iris}`, 'success');
                return iris;
            }
        } catch (error) {
            this.log(`Помилка отримання діафрагми: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення діафрагми
     */
    async setIris(irisValue) {
        try {
            const response = await this.makeRequest('/lens/iris', 'PUT', { apertureStop: irisValue });
            if (response.ok || response.status === 204) {
                this.currentSettings.iris = irisValue;
                this.log(`Діафрагма встановлена: f/${irisValue}`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка встановлення діафрагми: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання статусу запису
     */
    async getRecordingStatus() {
        try {
            const response = await this.makeRequest('/transports/0/record', 'GET');
            if (response.ok) {
                const data = await response.json();
                const recording = data.recording !== undefined ? data.recording : false;
                this.currentSettings.recording = recording;
                this.log(`Статус запису: ${recording ? 'Записує' : 'Зупинено'}`, 'success');
                return recording;
            }
        } catch (error) {
            this.log(`Помилка отримання статусу запису: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Початок запису
     */
    async startRecording() {
        try {
            const response = await this.makeRequest('/transports/0/record', 'PUT', { recording: true });
            if (response.ok || response.status === 204) {
                this.currentSettings.recording = true;
                this.log('Запис розпочато', 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка початку запису: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Зупинка запису
     */
    async stopRecording() {
        try {
            const response = await this.makeRequest('/transports/0/record', 'PUT', { recording: false });
            if (response.ok || response.status === 204) {
                this.currentSettings.recording = false;
                this.log('Запис зупинено', 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка зупинки запису: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання інформації про медіа
     */
    async getMediaInfo() {
        try {
            const response = await this.makeRequest('/media/active', 'GET');
            if (response.ok) {
                const data = await response.json();
                this.log('Інформація про медіа отримана', 'success');
                return data;
            }
        } catch (error) {
            this.log(`Помилка отримання інформації про медіа: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання інформації про систему камери
     */
    async getCameraInfo() {
        try {
            const response = await this.makeRequest('/system/format', 'GET');
            if (response.ok) {
                const data = await response.json();
                this.log('Інформація про камеру отримана', 'success');
                return data;
            }
        } catch (error) {
            this.log(`Помилка отримання інформації про камеру: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання ID камери
     */
    async getCameraId() {
        try {
            const response = await this.makeRequest('/camera/id', 'GET');
            if (response.ok) {
                const data = await response.json();
                this.log('ID камери отримано', 'success');
                return data.id;
            }
        } catch (error) {
            this.log(`Помилка отримання ID камери: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Оновлення всіх налаштувань
     */
    async refreshAllSettings() {
        // Спочатку перевіряємо, чи камера доступна
        try {
            await this.makeRequest('/system', 'GET', null, 3000);
        } catch (error) {
            throw new Error(`Камера недоступна: ${error.message}`);
        }

        const promises = [
            this.getGain().catch(() => null),
            this.getShutter().catch(() => null),
            this.getWhiteBalance().catch(() => null),
            this.getTint().catch(() => null),
            this.getFocus().catch(() => null),
            this.getIris().catch(() => null)
        ];

        await Promise.allSettled(promises);
        this.log('Налаштування оновлено', 'info');
        return this.currentSettings;
    }

    /**
     * PRESET METHODS
     */

    /**
     * Отримання списку пресетів
     */
    async getPresets() {
        try {
            const response = await this.makeRequest('/presets', 'GET');
            if (response.ok) {
                const data = await response.json();
                this.log('Список пресетів отримано', 'success');
                return data.presets || [];
            }
        } catch (error) {
            this.log(`Помилка отримання списку пресетів: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання активного пресету
     */
    async getActivePreset() {
        try {
            const response = await this.makeRequest('/presets/active', 'GET');
            if (response.ok) {
                const data = await response.json();
                this.log(`Активний пресет: ${data.preset}`, 'success');
                return data.preset;
            }
        } catch (error) {
            this.log(`Помилка отримання активного пресету: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Встановлення активного пресету
     */
    async setActivePreset(presetName) {
        try {
            const response = await this.makeRequest('/presets/active', 'PUT', { preset: presetName });
            if (response.ok || response.status === 204) {
                this.log(`Пресет "${presetName}" активовано`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка активації пресету "${presetName}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Збереження поточного стану як пресет
     */
    async savePreset(presetName) {
        try {
            const response = await this.makeRequest(`/presets/${encodeURIComponent(presetName)}`, 'PUT');
            if (response.ok || response.status === 204) {
                this.log(`Пресет "${presetName}" збережено`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка збереження пресету "${presetName}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Завантаження пресету (отримання файлу)
     */
    async downloadPreset(presetName) {
        try {
            const response = await this.makeRequest(`/presets/${encodeURIComponent(presetName)}`, 'GET');
            if (response.ok) {
                const blob = await response.blob();
                this.log(`Пресет "${presetName}" завантажено`, 'success');
                return blob;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка завантаження пресету "${presetName}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Видалення пресету
     */
    async deletePreset(presetName) {
        try {
            const response = await this.makeRequest(`/presets/${encodeURIComponent(presetName)}`, 'DELETE');
            if (response.ok || response.status === 204) {
                this.log(`Пресет "${presetName}" видалено`, 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка видалення пресету "${presetName}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Завантаження файлу пресету на камеру
     */
    async uploadPreset(file) {
        try {
            const formData = new FormData();
            formData.append('preset', file);
            
            const response = await fetch(`http://${this.baseUrl}/control/api/v1/presets`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                this.log(`Пресет "${data.presetAdded}" завантажено на камеру`, 'success');
                return data.presetAdded;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.log(`Помилка завантаження файлу пресету: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Отримання поточних налаштувань
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }

    /**
     * Перевірка підключення
     */
    isConnectionActive() {
        return this.isConnected;
    }
}
