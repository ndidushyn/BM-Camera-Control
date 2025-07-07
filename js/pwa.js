// PWA functionality
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.swRegistration = null;
        
        this.init();
    }
    
    async init() {
        this.checkInstallation();
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupUpdatePrompt();
        this.handleAppInstalled();
        this.setupOfflineIndicator();
    }
    
    // Check if app is already installed
    checkInstallation() {
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');
        
        if (this.isInstalled) {
            console.log('✅ PWA is installed');
            this.hideInstallPromotion();
        }
    }
    
    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', this.swRegistration);
                
                // Handle updates
                this.swRegistration.addEventListener('updatefound', () => {
                    const newWorker = this.swRegistration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdatePrompt();
                        }
                    });
                });
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }
    
    // Setup install prompt
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('💡 Install prompt available');
            event.preventDefault();
            this.deferredPrompt = event;
            this.showInstallButton();
        });
    }
    
    // Show install button
    showInstallButton() {
        if (this.isInstalled) return;
        
        // Create install banner if it doesn't exist
        if (!document.getElementById('pwa-install-banner')) {
            this.createInstallBanner();
        }
    }
    
    // Create install banner
    createInstallBanner() {
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-install-content">
                <div class="pwa-install-icon">📱</div>
                <div class="pwa-install-text">
                    <div class="pwa-install-title">Встановити додаток</div>
                    <div class="pwa-install-subtitle">Швидкий доступ з головного екрану</div>
                </div>
                <div class="pwa-install-actions">
                    <button class="pwa-install-btn" id="pwa-install-btn">Встановити</button>
                    <button class="pwa-dismiss-btn" id="pwa-dismiss-btn">×</button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-banner {
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: var(--surface-color, #fff);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 1000;
                animation: slideUp 0.3s ease-out;
            }
            
            .pwa-install-content {
                display: flex;
                align-items: center;
                padding: 16px;
                gap: 12px;
            }
            
            .pwa-install-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .pwa-install-text {
                flex: 1;
            }
            
            .pwa-install-title {
                font-weight: 600;
                font-size: 14px;
                color: var(--text-primary, #000);
                margin-bottom: 2px;
            }
            
            .pwa-install-subtitle {
                font-size: 12px;
                color: var(--text-secondary, #666);
            }
            
            .pwa-install-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .pwa-install-btn {
                background: var(--primary-color, #2563eb);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .pwa-install-btn:hover {
                background: var(--primary-hover, #1d4ed8);
            }
            
            .pwa-dismiss-btn {
                background: none;
                border: none;
                font-size: 18px;
                color: var(--text-secondary, #666);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .pwa-dismiss-btn:hover {
                background: var(--hover-color, #f3f4f6);
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .pwa-install-banner {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(banner);
        
        // Add event listeners
        document.getElementById('pwa-install-btn').addEventListener('click', () => {
            this.installApp();
        });
        
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            this.dismissInstallPrompt();
        });
    }
    
    // Install app
    async installApp() {
        if (!this.deferredPrompt) return;
        
        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ App installed');
                this.hideInstallPromotion();
            } else {
                console.log('❌ Install declined');
            }
            
            this.deferredPrompt = null;
        } catch (error) {
            console.error('❌ Install error:', error);
        }
    }
    
    // Dismiss install prompt
    dismissInstallPrompt() {
        this.hideInstallPromotion();
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
    
    // Hide install promotion
    hideInstallPromotion() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-in forwards';
            setTimeout(() => banner.remove(), 300);
        }
    }
    
    // Handle app installed
    handleAppInstalled() {
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed successfully');
            this.isInstalled = true;
            this.hideInstallPromotion();
            this.showToast('Додаток встановлено успішно!', 'success');
        });
    }
    
    // Show update prompt
    showUpdatePrompt() {
        this.showToast(
            'Доступне оновлення додатку',
            'info',
            [
                {
                    text: 'Оновити',
                    action: () => this.updateApp()
                },
                {
                    text: 'Пізніше',
                    action: () => {}
                }
            ]
        );
    }
    
    // Update app
    updateApp() {
        if (!this.swRegistration || !this.swRegistration.waiting) return;
        
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
    }
    
    // Setup offline indicator
    setupOfflineIndicator() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            const indicator = document.getElementById('connection-indicator');
            
            if (!isOnline) {
                this.showOfflineIndicator();
            } else {
                this.hideOfflineIndicator();
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }
    
    // Show offline indicator
    showOfflineIndicator() {
        if (document.getElementById('pwa-offline-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'pwa-offline-indicator';
        indicator.className = 'pwa-offline-indicator';
        indicator.innerHTML = `
            <div class="pwa-offline-content">
                <span class="pwa-offline-icon">📶</span>
                <span class="pwa-offline-text">Офлайн режим</span>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-offline-indicator {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #f59e0b;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                z-index: 1001;
                animation: slideDown 0.3s ease-out;
            }
            
            .pwa-offline-content {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .pwa-offline-icon {
                font-size: 14px;
            }
            
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        if (!document.querySelector('style[data-pwa-offline]')) {
            style.setAttribute('data-pwa-offline', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
    }
    
    // Hide offline indicator
    hideOfflineIndicator() {
        const indicator = document.getElementById('pwa-offline-indicator');
        if (indicator) {
            indicator.style.animation = 'slideUp 0.3s ease-in forwards';
            setTimeout(() => indicator.remove(), 300);
        }
    }
    
    // Show toast notification
    showToast(message, type = 'info', actions = []) {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
        
        // Fallback simple toast
        console.log(`[PWA Toast] ${type.toUpperCase()}: ${message}`);
    }
}

// Initialize PWA when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaManager = new PWAManager();
    });
} else {
    window.pwaManager = new PWAManager();
}

// Add CSS for slideDown animation
const additionalStyle = document.createElement('style');
additionalStyle.textContent = `
    @keyframes slideDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(additionalStyle);
