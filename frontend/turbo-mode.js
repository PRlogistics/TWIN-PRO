// TURBO SPEED - Premium Fast Translation
class TurboMode {
    constructor() {
        this.isTurbo = false;
        this.cache = new Map();
    }

    enable() {
        this.isTurbo = true;
        // Pre-connect to API
        fetch(API_URL + '/health', { method: 'HEAD' }).catch(() => {});
        this.showNotification('🚀 Turbo Mode Enabled - Premium Speed Active');
    }

    async translateWithCache(text, targetLang) {
        const cacheKey = `${text}_${targetLang}`;
        
        // Check cache first (instant response)
        if (this.cache.has(cacheKey)) {
            return { text: this.cache.get(cacheKey), cached: true, speed: 'instant' };
        }

        // Fast translation with priority
        const startTime = performance.now();
        
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('target_language', targetLang);
            formData.append('source_language', 'auto');
            formData.append('priority', 'high'); // Signal for fast processing

            const res = await fetch(API_URL + '/translate-and-speak', {
                method: 'POST',
                body: formData,
                headers: { 'X-Turbo-Mode': 'enabled' }
            });

            const translated = res.headers.get('X-Translated-Text') || text;
            const time = performance.now() - startTime;

            // Cache result
            this.cache.set(cacheKey, translated);
            if (this.cache.size > 100) this.cache.delete(this.cache.keys().next().value);

            return { text: translated, cached: false, speed: `${time.toFixed(0)}ms` };
            
        } catch (e) {
            return { text: text, error: true, speed: 'fallback' };
        }
    }

    showNotification(message) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: linear-gradient(135deg, #6366f1, #ec4899);
            color: white; padding: 15px 25px; border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 99999;
            font-weight: 600; animation: slideIn 0.3s ease;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
}

const turboMode = new TurboMode();
