// Mobile Interface Controller
class MobileInterface {
    constructor() {
        this.currentTab = 'light';
        this.isConnected = false;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingInterval = null;
        this.cameraController = null;
        
        this.init();
    }
    
    init() {
        console.log('🔧 Initializing Mobile Interface');
        
        // Initialize camera controller
        this.initCameraController();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup connection controls
        this.setupConnectionControls();
        
        // Setup camera controls
        this.setupCameraControls();
        
        // Setup recording controls
        this.setupRecordingControls();
        
        // Setup haptic feedback
        this.setupHapticFeedback();
        
        // Setup desktop mode button
        this.setupDesktopModeButton();
        
        // Apply initial states
        this.updateConnectionStatus();
        
        console.log('✅ Mobile Interface initialized');
    }
    
    // Initialize camera controller
    initCameraController() {
        if (window.CameraController) {
            this.cameraController = new CameraController();
            
            // Listen to connection events
            document.addEventListener('cameraConnected', () => {
                this.isConnected = true;
                this.updateConnectionStatus();
                this.showToast('Камера підключена', 'success');
            });
            
            document.addEventListener('cameraDisconnected', () => {
                this.isConnected = false;
                this.updateConnectionStatus();
                this.showToast('Камера відключена', 'info');
            });
            
            document.addEventListener('cameraError', (event) => {
                this.showToast(`Помилка: ${event.detail.message}`, 'error');
            });
        }
    }
    
    // Setup bottom navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tabName = item.dataset.tab;
                this.switchTab(tabName);
                this.hapticFeedback();
            });
        });
    }
    
    // Switch between tabs
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.mobile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active from nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected tab
        const targetTab = document.getElementById(`${tabName}-tab`);
        const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetTab && targetNav) {
            targetTab.classList.add('active');
            targetNav.classList.add('active');
            this.currentTab = tabName;
            
            console.log(`📱 Switched to ${tabName} tab`);
        }
    }
    
    // Setup connection controls
    setupConnectionControls() {
        const connectionBtn = document.getElementById('connection-toggle');
        const disconnectBtn = document.getElementById('disconnect-btn');
        
        connectionBtn?.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
            this.hapticFeedback();
        });
        
        disconnectBtn?.addEventListener('click', () => {
            this.disconnect();
            this.hapticFeedback();
        });
    }
    
    // Connect to camera
    async connect() {
        const connectionBtn = document.getElementById('connection-toggle');
        
        try {
            connectionBtn.classList.add('connecting');
            connectionBtn.querySelector('.connection-text').textContent = 'Підключення...';
            
            if (this.cameraController) {
                await this.cameraController.connect();
            } else {
                // Simulate connection for demo
                await this.simulateConnection();
            }
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.showToast('Не вдалося підключитися до камери', 'error');
            connectionBtn.classList.remove('connecting');
            connectionBtn.querySelector('.connection-text').textContent = 'Підключити';
        }
    }
    
    // Disconnect from camera
    async disconnect() {
        try {
            if (this.cameraController) {
                await this.cameraController.disconnect();
            } else {
                this.isConnected = false;
                this.updateConnectionStatus();
            }
        } catch (error) {
            console.error('Disconnect failed:', error);
            this.showToast('Помилка при відключенні', 'error');
        }
    }
    
    // Simulate connection for demo
    async simulateConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                this.updateConnectionStatus();
                resolve();
            }, 2000);
        });
    }
    
    // Update connection status UI
    updateConnectionStatus() {
        const connectionBtn = document.getElementById('connection-toggle');
        const connectionStatus = document.getElementById('connection-status');
        const statusIndicator = connectionStatus?.querySelector('.status-indicator');
        const statusText = connectionStatus?.querySelector('.status-text');
        const disconnectBtn = document.getElementById('disconnect-btn');
        
        if (this.isConnected) {
            connectionBtn.classList.remove('connecting');
            connectionBtn.classList.add('connected');
            connectionBtn.querySelector('.connection-text').textContent = 'Підключено';
            connectionBtn.querySelector('.connection-icon').textContent = '📹';
            
            connectionStatus?.classList.remove('hidden');
            statusIndicator?.classList.add('connected');
            if (statusText) statusText.textContent = 'Камера підключена';
            disconnectBtn?.classList.remove('hidden');
            
        } else {
            connectionBtn.classList.remove('connecting', 'connected');
            connectionBtn.querySelector('.connection-text').textContent = 'Підключити';
            connectionBtn.querySelector('.connection-icon').textContent = '📷';
            
            connectionStatus?.classList.add('hidden');
            statusIndicator?.classList.remove('connected');
            if (statusText) statusText.textContent = 'Камера відключена';
            disconnectBtn?.classList.add('hidden');
        }
    }
    
    // Setup camera controls
    setupCameraControls() {
        // Gain control
        this.setupSliderControl('gain', -12, 36, 'dB', (value) => {
            this.sendCameraCommand('gain', value);
        });
        
        // Iris control
        this.setupSliderControl('iris', 140, 2048, '', (value) => {
            const fStop = this.irisToFStop(value);
            document.getElementById('iris-value').textContent = `f/${fStop}`;
            this.sendCameraCommand('iris', value);
        });
        
        // WB Temperature control
        this.setupSliderControl('wb-temp', 2500, 10000, 'K', (value) => {
            this.sendCameraCommand('whiteBalance', value);
        });
        
        // Tint control
        this.setupSliderControl('tint', -50, 50, '', (value) => {
            this.sendCameraCommand('tint', value);
        });
        
        // Focus control
        this.setupSliderControl('focus', 0, 100, '%', (value) => {
            this.sendCameraCommand('focus', value / 100);
        });
        
        // Zoom control
        this.setupSliderControl('zoom', 100, 1600, 'x', (value) => {
            document.getElementById('zoom-value').textContent = `${(value / 100).toFixed(1)}x`;
            this.sendCameraCommand('zoom', value / 100);
        });
        
        // Shutter control
        this.setupSliderControl('shutter', 24, 2000, '', (value) => {
            document.getElementById('shutter-value').textContent = `1/${value}`;
            this.sendCameraCommand('shutter', 1 / value);
        });
        
        // Shutter angle control
        this.setupSliderControl('shutter-angle', 45, 360, '°', (value) => {
            this.sendCameraCommand('shutterAngle', value);
        });
        
        // Setup preset buttons
        this.setupPresetButtons();
        
        // Setup focus buttons
        this.setupFocusButtons();
        
        // Setup format buttons
        this.setupFormatButtons();
    }
    
    // Setup slider control
    setupSliderControl(name, min, max, unit, callback) {
        const slider = document.getElementById(`${name}-slider`);
        const valueDisplay = document.getElementById(`${name}-value`);
        
        if (!slider || !valueDisplay) return;
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            valueDisplay.textContent = `${value}${unit}`;
            valueDisplay.classList.add('updated');
            
            // Update CSS custom property for progress indicator
            document.documentElement.style.setProperty(`--${name}-value`, value);
            
            setTimeout(() => {
                valueDisplay.classList.remove('updated');
            }, 600);
            
            callback(value);
        });
    }
    
    // Convert iris value to f-stop
    irisToFStop(value) {
        const fStop = Math.pow(2, (value - 140) / 140);
        return fStop.toFixed(1);
    }
    
    // Setup preset buttons
    setupPresetButtons() {
        // Gain presets
        document.querySelectorAll('[data-gain]').forEach(btn => {
            btn.addEventListener('click', () => {
                const gain = parseInt(btn.dataset.gain);
                document.getElementById('gain-slider').value = gain;
                document.getElementById('gain-value').textContent = `${gain} dB`;
                this.sendCameraCommand('gain', gain);
                this.hapticFeedback();
            });
        });
        
        // Iris presets
        document.querySelectorAll('[data-iris]').forEach(btn => {
            btn.addEventListener('click', () => {
                const iris = parseInt(btn.dataset.iris);
                document.getElementById('iris-slider').value = iris;
                const fStop = this.irisToFStop(iris);
                document.getElementById('iris-value').textContent = `f/${fStop}`;
                this.sendCameraCommand('iris', iris);
                this.hapticFeedback();
            });
        });
        
        // WB Temperature presets
        document.querySelectorAll('[data-temp]').forEach(btn => {
            btn.addEventListener('click', () => {
                const temp = parseInt(btn.dataset.temp);
                document.getElementById('wb-temp-slider').value = temp;
                document.getElementById('wb-temp-value').textContent = `${temp}K`;
                this.sendCameraCommand('whiteBalance', temp);
                this.updateActivePreset(btn, '.wb-preset');
                this.hapticFeedback();
            });
        });
        
        // Shutter presets
        document.querySelectorAll('[data-shutter]').forEach(btn => {
            btn.addEventListener('click', () => {
                const shutter = parseInt(btn.dataset.shutter);
                document.getElementById('shutter-slider').value = shutter;
                document.getElementById('shutter-value').textContent = `1/${shutter}`;
                this.sendCameraCommand('shutter', 1 / shutter);
                this.hapticFeedback();
            });
        });
    }
    
    // Setup focus buttons
    setupFocusButtons() {
        document.getElementById('focus-near')?.addEventListener('click', () => {
            this.sendCameraCommand('focusNear');
            this.hapticFeedback();
        });
        
        document.getElementById('autofocus')?.addEventListener('click', () => {
            this.sendCameraCommand('autofocus');
            this.hapticFeedback();
        });
        
        document.getElementById('focus-far')?.addEventListener('click', () => {
            this.sendCameraCommand('focusFar');
            this.hapticFeedback();
        });
    }
    
    // Setup format buttons
    setupFormatButtons() {
        document.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.sendCameraCommand('format', format);
                this.updateActivePreset(btn, '.format-btn');
                this.hapticFeedback();
            });
        });
        
        document.querySelectorAll('[data-fps]').forEach(btn => {
            btn.addEventListener('click', () => {
                const fps = parseInt(btn.dataset.fps);
                this.sendCameraCommand('frameRate', fps);
                this.updateActivePreset(btn, '.framerate-btn');
                this.hapticFeedback();
            });
        });
    }
    
    // Setup recording controls
    setupRecordingControls() {
        const recordBtn = document.getElementById('record-btn');
        
        recordBtn?.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
            this.hapticFeedback('heavy');
        });
    }
    
    // Start recording
    startRecording() {
        if (!this.isConnected) {
            this.showToast('Підключіть камеру для запису', 'warning');
            return;
        }
        
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        const recordBtn = document.getElementById('record-btn');
        const recordingIndicator = document.querySelector('.recording-indicator');
        
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.record-text').textContent = 'Стоп';
        recordBtn.querySelector('.record-icon').textContent = '⏹';
        
        recordingIndicator?.classList.add('active');
        
        // Start recording timer
        this.recordingInterval = setInterval(() => {
            this.updateRecordingTime();
        }, 1000);
        
        this.sendCameraCommand('startRecording');
        this.showToast('Запис розпочато', 'success');
        
        console.log('🔴 Recording started');
    }
    
    // Stop recording
    stopRecording() {
        this.isRecording = false;
        this.recordingStartTime = null;
        
        const recordBtn = document.getElementById('record-btn');
        const recordingIndicator = document.querySelector('.recording-indicator');
        
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('.record-text').textContent = 'Старт';
        recordBtn.querySelector('.record-icon').textContent = '⏺';
        
        recordingIndicator?.classList.remove('active');
        
        // Stop recording timer
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
        
        // Reset timer display
        document.querySelector('.recording-time').textContent = '00:00:00';
        
        this.sendCameraCommand('stopRecording');
        this.showToast('Запис зупинено', 'info');
        
        console.log('⏹ Recording stopped');
    }
    
    // Update recording time display
    updateRecordingTime() {
        if (!this.recordingStartTime) return;
        
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000) % 60;
        const minutes = Math.floor(elapsed / 60000) % 60;
        const hours = Math.floor(elapsed / 3600000);
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.querySelector('.recording-time').textContent = timeString;
    }
    
    // Update active preset button
    updateActivePreset(activeBtn, selector) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }
    
    // Send camera command
    sendCameraCommand(command, value = null) {
        if (!this.isConnected) {
            this.showToast('Камера не підключена', 'warning');
            return;
        }
        
        if (this.cameraController) {
            this.cameraController.sendCommand(command, value);
        } else {
            console.log(`📷 Camera command: ${command}${value !== null ? ` = ${value}` : ''}`);
        }
    }
    
    // Setup haptic feedback
    setupHapticFeedback() {
        // Check if haptic feedback is supported
        this.hapticSupported = 'vibrate' in navigator;
        
        if (this.hapticSupported) {
            console.log('📳 Haptic feedback supported');
        }
    }
    
    // Trigger haptic feedback
    hapticFeedback(type = 'light') {
        if (!this.hapticSupported) return;
        
        const patterns = {
            light: [10],
            medium: [15],
            heavy: [25],
            success: [10, 50, 10],
            error: [50, 50, 50]
        };
        
        navigator.vibrate(patterns[type] || patterns.light);
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Haptic feedback for notifications
        if (type === 'error') {
            this.hapticFeedback('error');
        } else if (type === 'success') {
            this.hapticFeedback('success');
        }
        
        console.log(`🍞 Toast: ${message} (${type})`);
    }
    
    // Setup desktop mode button
    setupDesktopModeButton() {
        const desktopBtn = document.getElementById('desktop-mode');
        
        desktopBtn?.addEventListener('click', () => {
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.set('desktop', '1');
            window.location.href = `./index.html?${currentParams.toString()}`;
            this.hapticFeedback();
        });
    }
}

// Initialize mobile interface when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileInterface = new MobileInterface();
    });
} else {
    window.mobileInterface = new MobileInterface();
}
