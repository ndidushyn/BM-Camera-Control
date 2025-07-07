// Platform detection and feature availability
class PlatformDetector {
    constructor() {
        this.userAgent = navigator.userAgent.toLowerCase();
        this.platform = this.detectPlatform();
        this.features = this.detectFeatures();
        
        this.init();
    }
    
    init() {
        console.log('🔍 Platform detected:', this.platform);
        console.log('🎛️ Available features:', this.features);
        
        // Apply platform-specific UI changes
        this.applyPlatformStyles();
        this.hideUnavailableFeatures();
    }
    
    // Detect current platform
    detectPlatform() {
        const ua = this.userAgent;
        
        // Mobile devices
        if (/android/.test(ua)) return 'android';
        if (/iphone|ipad|ipod/.test(ua)) return 'ios';
        
        // Desktop
        if (/mac/.test(ua)) return 'macos';
        if (/win/.test(ua)) return 'windows';
        if (/linux/.test(ua)) return 'linux';
        
        // PWA detection
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return 'pwa';
        }
        
        return 'unknown';
    }
    
    // Detect available features
    detectFeatures() {
        const features = {
            midi: false,
            touchScreen: false,
            desktop: false,
            mobile: false,
            pwa: false,
            webMidi: false
        };
        
        // Touch screen detection
        features.touchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Platform categorization
        features.mobile = this.isMobile();
        features.desktop = !features.mobile;
        features.pwa = this.isPWA();
        
        // MIDI support detection
        features.webMidi = 'requestMIDIAccess' in navigator;
        features.midi = features.webMidi && features.desktop && !features.pwa;
        
        return features;
    }
    
    // Check if running on mobile
    isMobile() {
        const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(this.userAgent) ||
               (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
        
        // Auto-redirect to mobile interface if on mobile device
        if (isMobileDevice && !window.location.pathname.includes('mobile.html') && !window.location.search.includes('desktop=1')) {
            console.log('📱 Mobile device detected, redirecting to mobile interface');
            const currentParams = window.location.search;
            const newParams = currentParams ? currentParams + '&mobile=1' : '?mobile=1';
            window.location.replace('./mobile.html' + newParams);
            return true;
        }
        
        return isMobileDevice;
    }
    
    // Check if running as PWA
    isPWA() {
        const isStandalone = window.matchMedia && 
               (window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true);
        
        // Additional Chrome PWA detection
        const isChromePWA = isStandalone && this.userAgent.includes('chrome');
        
        if (isChromePWA) {
            console.log('🔍 Chrome PWA detected - applying compatibility fixes');
            this.applyChromePWAFixes();
        }
        
        return isStandalone;
    }
    
    // Apply Chrome PWA specific fixes
    applyChromePWAFixes() {
        // Fix for Chrome PWA navigation issues
        if (window.location.pathname === '/' || window.location.pathname.endsWith('/start.html')) {
            const search = window.location.search;
            const hash = window.location.hash;
            
            // Redirect to index.html if not already there
            if (!window.location.pathname.endsWith('/index.html')) {
                console.log('🔧 Chrome PWA: Redirecting to index.html');
                setTimeout(() => {
                    window.location.replace('./index.html' + search + hash);
                }, 100);
            }
        }
        
        // Add Chrome PWA specific styles
        document.body.classList.add('chrome-pwa');
    }
    
    // Check if feature is available
    hasFeature(featureName) {
        return this.features[featureName] || false;
    }
    
    // Apply platform-specific styles
    applyPlatformStyles() {
        const body = document.body;
        
        // Add platform classes
        body.classList.add(`platform-${this.platform}`);
        
        if (this.features.mobile) {
            body.classList.add('mobile-device');
        }
        
        if (this.features.desktop) {
            body.classList.add('desktop-device');
        }
        
        if (this.features.pwa) {
            body.classList.add('pwa-mode');
        }
        
        if (this.features.touchScreen) {
            body.classList.add('touch-device');
        }
        
        // Add feature availability classes
        Object.keys(this.features).forEach(feature => {
            if (this.features[feature]) {
                body.classList.add(`has-${feature}`);
            } else {
                body.classList.add(`no-${feature}`);
            }
        });
    }
    
    // Hide unavailable features
    hideUnavailableFeatures() {
        // Hide MIDI tab if not supported
        if (!this.hasFeature('midi')) {
            this.hideMIDIFeatures();
            this.showMIDINotAvailableMessage();
        }
        
        // Optimize UI for mobile
        if (this.features.mobile) {
            this.optimizeForMobile();
        }
        
        // PWA-specific optimizations
        if (this.features.pwa) {
            this.optimizeForPWA();
        }
    }
    
    // Hide MIDI features
    hideMIDIFeatures() {
        // Hide MIDI tab button
        const midiTab = document.querySelector('[data-tab="midi"]');
        if (midiTab) {
            midiTab.style.display = 'none';
        }
        
        // Hide MIDI tab content
        const midiTabContent = document.getElementById('midi-tab');
        if (midiTabContent) {
            midiTabContent.style.display = 'none';
        }
        
        console.log('🎹 MIDI features hidden (not supported on this platform)');
    }
    
    // Show MIDI not available message
    showMIDINotAvailableMessage() {
        // Відключено - не показуємо повідомлення про мобільну версію
        // Користувачі можуть самі зрозуміти, що MIDI недоступний через відсутність вкладки
        return;
    }
    
    // Optimize UI for mobile
    optimizeForMobile() {
        // Make buttons larger for touch
        const style = document.createElement('style');
        style.textContent = `
            .mobile-device .btn {
                min-height: 44px;
                padding: 12px 20px;
                font-size: 16px;
            }
            
            .mobile-device .control-section h3 {
                font-size: 18px;
                margin-bottom: 16px;
            }
            
            .mobile-device .current-value {
                font-size: 16px;
                margin-bottom: 12px;
            }
            
            .mobile-device .gain-presets,
            .mobile-device .shutter-presets,
            .mobile-device .iris-presets {
                gap: 12px;
            }
            
            .mobile-device .gain-btn,
            .mobile-device .shutter-btn,
            .mobile-device .iris-btn {
                min-height: 48px;
                font-size: 14px;
            }
            
            .mobile-device .wb-preset-btn {
                min-height: 56px;
                padding: 12px;
            }
            
            .mobile-device input[type="range"] {
                height: 8px;
                -webkit-appearance: none;
            }
            
            .mobile-device input[type="range"]::-webkit-slider-thumb {
                width: 24px;
                height: 24px;
                -webkit-appearance: none;
                background: var(--primary-color);
                border-radius: 50%;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        
        console.log('📱 Mobile optimizations applied');
    }
    
    // Optimize for PWA
    optimizeForPWA() {
        // Add PWA-specific styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-mode {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
            }
            
            .pwa-mode .app-header {
                padding-top: env(safe-area-inset-top);
            }
        `;
        document.head.appendChild(style);
        
        console.log('📲 PWA optimizations applied');
    }
    
    // Get platform info for debugging
    getPlatformInfo() {
        return {
            platform: this.platform,
            features: this.features,
            userAgent: this.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height
            }
        };
    }
}

// Add platform-specific CSS
const platformStyles = document.createElement('style');
platformStyles.textContent = `
    /* Platform info panel */
    .platform-info-panel {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 16px;
        margin: 0;
    }
    
    .platform-info-content {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .platform-info-icon {
        font-size: 24px;
        flex-shrink: 0;
    }
    
    .platform-info-text {
        flex: 1;
    }
    
    .platform-info-title {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
    }
    
    .platform-info-subtitle {
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.4;
    }
    
    /* Hide MIDI features when not supported */
    .no-midi .midi-tab,
    .no-midi .midi-container,
    .no-midi [data-tab="midi"] {
        display: none !important;
    }
    
    /* Mobile-specific adjustments */
    .mobile-device .navigation-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    
    .mobile-device .tab-btn {
        white-space: nowrap;
        min-width: max-content;
    }
    
    /* Touch device improvements */
    .touch-device button {
        touch-action: manipulation;
    }
    
    .touch-device input[type="range"] {
        touch-action: pan-x;
    }
    
    /* PWA mode adjustments */
    .pwa-mode .app-container {
        min-height: 100vh;
        min-height: 100dvh;
    }
    
    /* Chrome PWA specific fixes */
    .chrome-pwa {
        /* Fix for Chrome PWA navigation bar */
        padding-top: env(safe-area-inset-top, 0);
    }
    
    .chrome-pwa .app-header {
        /* Ensure header is properly positioned in Chrome PWA */
        position: relative;
        z-index: 1000;
    }
    
    /* PWA loading state */
    .pwa-loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--background-color);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .pwa-loading.hidden {
        display: none;
    }
`;
document.head.appendChild(platformStyles);

// Initialize platform detector when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.platformDetector = new PlatformDetector();
    });
} else {
    window.platformDetector = new PlatformDetector();
}
