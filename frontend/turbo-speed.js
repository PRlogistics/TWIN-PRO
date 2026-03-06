// TURBO SPEED MODE - Real Performance Feature
class TurboSpeed {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 100;
        this.isEnabled = false;
        this.stats = { hits: 0, misses: 0, saved: 0 };
    }

    enable() {
        this.isEnabled = true;
        this.preconnect();
        this.showNotification('🚀 Turbo Speed Enabled', 'Instant translations with smart caching');
        this.updateOriginalTranslate();
    }

    disable() {
        this.isEnabled = false;
        this.restoreOriginalTranslate();
        this.showNotification('Turbo Speed Disabled', 'Normal speed restored');
    }

    preconnect() {
        // Pre-connect to API for faster requests
        fetch(API_URL + '/health', { method: 'HEAD' }).catch(() => {});
        
        // Preload voices
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
    }

    getCacheKey(text, targetLang) {
        return `${text.toLowerCase().trim()}_${targetLang}`;
    }

    getFromCache(text, targetLang) {
        const key = this.getCacheKey(text, targetLang);
        const cached = this.cache.get(key);
        
        if (cached && (Date.now() - cached.time) < 300000) { // 5 min expiry
            this.stats.hits++;
            return cached.data;
        }
        return null;
    }

    setCache(text, targetLang, data) {
        const key = this.getCacheKey(text, targetLang);
        
        // Manage cache size
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            time: Date.now()
        });
        
        this.stats.misses++;
    }

    async translateWithCache(text, targetLang, sourceLang = 'auto') {
        const startTime = performance.now();
        
        // Check cache first
        const cached = this.getFromCache(text, targetLang);
        if (cached) {
            const time = performance.now() - startTime;
            this.showSpeedNotification(`⚡ Instant (${time.toFixed(0)}ms) - Cached`);
            return cached;
        }

        // Fetch from API
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('target_language', targetLang);
            formData.append('source_language', sourceLang);

            const res = await fetch(API_URL + '/translate-and-speak', {
                method: 'POST',
                body: formData,
                headers: { 'X-Turbo': 'enabled' }
            });

            const translated = res.headers.get('X-Translated-Text') || text;
            const audioBlob = await res.blob();
            
            const result = {
                text: translated,
                audio: URL.createObjectURL(audioBlob),
                cached: false
            };

            // Cache the result
            this.setCache(text, targetLang, result);
            
            const time = performance.now() - startTime;
            this.showSpeedNotification(`🚀 Fast (${time.toFixed(0)}ms)`);
            
            return result;
            
        } catch (e) {
            console.error('Turbo translation error:', e);
            return { text: text, audio: null, error: true };
        }
    }

    updateOriginalTranslate() {
        // Override the global doTranslate function
        window.originalDoTranslate = window.doTranslate;
        
        window.doTranslate = async () => {
            const btn = document.getElementById('translateBtn');
            const results = document.getElementById('results');
            const text = document.getElementById('inputText').value.trim();
            const targetLang = document.getElementById('targetLang').value;
            
            if (!text) {
                alert('Enter some text');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-bolt"></i> Turbo Translating...';
            results.classList.remove('active');

            try {
                const result = await this.translateWithCache(text, targetLang);
                
                document.getElementById('translatedText').textContent = result.text;
                
                if (result.audio && !result.cached) {
                    document.getElementById('audioPlayer').src = result.audio;
                    document.getElementById('downloadBtn').href = result.audio;
                }
                
                results.classList.add('active');
                
                if (!result.cached) {
                    document.getElementById('audioPlayer').play().catch(() => {});
                }
                
                // Save to history
                if (typeof saveToHistory === 'function') {
                    saveToHistory(text, result.text, targetLang);
                }
                
            } catch (e) {
                alert('Error: ' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-magic"></i> Translate & Speak';
            }
        };
    }

    restoreOriginalTranslate() {
        if (window.originalDoTranslate) {
            window.doTranslate = window.originalDoTranslate;
        }
    }

    showNotification(title, subtitle) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #6366f1, #ec4899);
            color: white;
            padding: 20px 25px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 99999;
            max-width: 300px;
            animation: slideInRight 0.4s ease;
        `;
        notif.innerHTML = `
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 13px; opacity: 0.9;">${subtitle}</div>
        `;
        
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    showSpeedNotification(text) {
        const existing = document.getElementById('turbo-status');
        if (existing) existing.remove();

        const status = document.createElement('div');
        status.id = 'turbo-status';
        status.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            z-index: 99998;
            animation: fadeInUp 0.3s ease;
        `;
        status.textContent = text;
        
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 3000);
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : 0;
        return {
            ...this.stats,
            hitRate: hitRate + '%',
            cacheSize: this.cache.size
        };
    }
}

// Global instance
const turboSpeed = new TurboSpeed();

// Add animations
const animStyle = document.createElement('style');
animStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes fadeInUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(animStyle);
