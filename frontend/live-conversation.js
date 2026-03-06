// LIVE CONVERSATION MODE - Real Working Feature
class LiveConversation {
    constructor() {
        this.isActive = false;
        this.recognitionA = null;
        this.recognitionB = null;
        this.synth = window.speechSynthesis;
        this.personA = { lang: 'en-US', speaking: false };
        this.personB = { lang: 'es-ES', speaking: false };
    }

    start() {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
            return;
        }

        this.isActive = true;
        this.createUI();
        this.setupSpeechRecognition();
    }

    createUI() {
        // Remove existing if any
        const existing = document.getElementById('live-conversation-ui');
        if (existing) existing.remove();

        const ui = document.createElement('div');
        ui.id = 'live-conversation-ui';
        ui.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
                        z-index: 10000; display: flex; flex-direction: column; 
                        font-family: system-ui, sans-serif;">
                
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; 
                            padding: 20px; border-bottom: 1px solid #334155;">
                    <h2 style="color: white; margin: 0; font-size: 24px;">
                        <span style="color: #6366f1;">🎙️</span> Live Conversation
                    </h2>
                    <button onclick="liveConversation.stop()" 
                            style="background: #ef4444; color: white; border: none; 
                                   padding: 10px 20px; border-radius: 8px; cursor: pointer;
                                   font-weight: 600;">✕ End</button>
                </div>

                <!-- Main Area -->
                <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px;">
                    
                    <!-- Person A -->
                    <div style="background: rgba(99, 102, 241, 0.1); border: 2px solid #6366f1; 
                                border-radius: 20px; padding: 20px; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="color: #6366f1; margin: 0;">Person A</h3>
                            <span id="status-a" style="font-size: 12px; color: #94a3b8;">Ready</span>
                        </div>
                        
                        <select id="lang-a" onchange="liveConversation.setLang('A', this.value)"
                                style="padding: 12px; border-radius: 10px; border: 1px solid #334155; 
                                       background: #0f172a; color: white; margin-bottom: 15px;">
                            <option value="en-US">🇺🇸 English</option>
                            <option value="es-ES">🇪🇸 Spanish</option>
                            <option value="de-DE">🇩🇪 German</option>
                            <option value="fr-FR">🇫🇷 French</option>
                            <option value="it-IT">🇮🇹 Italian</option>
                            <option value="pt-PT">🇵🇹 Portuguese</option>
                            <option value="nl-NL">🇳🇱 Dutch</option>
                        </select>

                        <button id="btn-a" onmousedown="liveConversation.startListening('A')" 
                                onmouseup="liveConversation.stopListening('A')"
                                onmouseleave="liveConversation.stopListening('A')"
                                ontouchstart="liveConversation.startListening('A')"
                                ontouchend="liveConversation.stopListening('A')"
                                style="padding: 30px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                       color: white; border: none; border-radius: 15px; font-size: 18px;
                                       font-weight: 600; cursor: pointer; transition: all 0.2s;
                                       box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                            🎤 HOLD TO SPEAK
                        </button>

                        <div id="transcript-a" style="margin-top: 15px; padding: 15px; 
                                                      background: rgba(0,0,0,0.3); border-radius: 10px; 
                                                      min-height: 100px; color: white; font-size: 14px;
                                                      overflow-y: auto; max-height: 200px;">
                            <span style="color: #64748b;">Transcript will appear here...</span>
                        </div>
                    </div>

                    <!-- Person B -->
                    <div style="background: rgba(236, 72, 153, 0.1); border: 2px solid #ec4899; 
                                border-radius: 20px; padding: 20px; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="color: #ec4899; margin: 0;">Person B</h3>
                            <span id="status-b" style="font-size: 12px; color: #94a3b8;">Ready</span>
                        </div>
                        
                        <select id="lang-b" onchange="liveConversation.setLang('B', this.value)"
                                style="padding: 12px; border-radius: 10px; border: 1px solid #334155; 
                                       background: #0f172a; color: white; margin-bottom: 15px;">
                            <option value="es-ES">🇪🇸 Spanish</option>
                            <option value="en-US">🇺🇸 English</option>
                            <option value="de-DE">🇩🇪 German</option>
                            <option value="fr-FR">🇫🇷 French</option>
                            <option value="it-IT">🇮🇹 Italian</option>
                            <option value="pt-PT">🇵🇹 Portuguese</option>
                            <option value="nl-NL">🇳🇱 Dutch</option>
                        </select>

                        <button id="btn-b" onmousedown="liveConversation.startListening('B')" 
                                onmouseup="liveConversation.stopListening('B')"
                                onmouseleave="liveConversation.stopListening('B')"
                                ontouchstart="liveConversation.startListening('B')"
                                ontouchend="liveConversation.stopListening('B')"
                                style="padding: 30px; background: linear-gradient(135deg, #ec4899, #f472b6); 
                                       color: white; border: none; border-radius: 15px; font-size: 18px;
                                       font-weight: 600; cursor: pointer; transition: all 0.2s;
                                       box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                            🎤 HOLD TO SPEAK
                        </button>

                        <div id="transcript-b" style="margin-top: 15px; padding: 15px; 
                                                      background: rgba(0,0,0,0.3); border-radius: 10px; 
                                                      min-height: 100px; color: white; font-size: 14px;
                                                      overflow-y: auto; max-height: 200px;">
                            <span style="color: #64748b;">Transcript will appear here...</span>
                        </div>
                    </div>
                </div>

                <!-- Instructions -->
                <div style="padding: 15px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #334155;">
                    Hold button → Speak → Release → Auto-translates & speaks
                </div>
            </div>
        `;
        document.body.appendChild(ui);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        // Setup for Person A
        this.recognitionA = new SpeechRecognition();
        this.recognitionA.continuous = false;
        this.recognitionA.interimResults = false;
        this.recognitionA.onresult = (e) => this.handleResult('A', e);
        this.recognitionA.onerror = (e) => this.handleError('A', e);

        // Setup for Person B
        this.recognitionB = new SpeechRecognition();
        this.recognitionB.continuous = false;
        this.recognitionB.interimResults = false;
        this.recognitionB.onresult = (e) => this.handleResult('B', e);
        this.recognitionB.onerror = (e) => this.handleError('B', e);
    }

    setLang(person, langCode) {
        if (person === 'A') {
            this.personA.lang = langCode;
            if (this.recognitionA) this.recognitionA.lang = langCode;
        } else {
            this.personB.lang = langCode;
            if (this.recognitionB) this.recognitionB.lang = langCode;
        }
    }

    startListening(person) {
        if (!this.isActive) return;

        const btn = document.getElementById(`btn-${person.toLowerCase()}`);
        const status = document.getElementById(`status-${person.toLowerCase()}`);
        
        btn.style.transform = 'scale(0.95)';
        btn.innerHTML = '🔴 LISTENING...';
        status.textContent = 'Listening...';
        status.style.color = '#10b981';

        const recognition = person === 'A' ? this.recognitionA : this.recognitionB;
        const lang = person === 'A' ? this.personA.lang : this.personB.lang;
        
        recognition.lang = lang;
        
        try {
            recognition.start();
        } catch (e) {
            // Already started, ignore
        }
    }

    stopListening(person) {
        const btn = document.getElementById(`btn-${person.toLowerCase()}`);
        const status = document.getElementById(`status-${person.toLowerCase()}`);
        
        btn.style.transform = 'scale(1)';
        btn.innerHTML = '🎤 HOLD TO SPEAK';
        status.textContent = 'Processing...';
        status.style.color = '#f59e0b';

        const recognition = person === 'A' ? this.recognitionA : this.recognitionB;
        
        try {
            recognition.stop();
        } catch (e) {
            // Already stopped, ignore
        }
    }

    async handleResult(person, event) {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        // Show what was heard
        const transcriptDiv = document.getElementById(`transcript-${person.toLowerCase()}`);
        transcriptDiv.innerHTML += `<div style="margin-bottom: 8px;"><strong style="color: #6366f1;">Heard:</strong> ${transcript}</div>`;
        
        // Determine target
        const targetPerson = person === 'A' ? 'B' : 'A';
        const targetLang = person === 'A' ? this.personB.lang : this.personA.lang;
        const sourceLang = person === 'A' ? this.personA.lang : this.personB.lang;
        
        // Translate
        const translated = await this.translate(transcript, targetLang.substring(0, 2));
        
        // Show translation in target's box
        const targetTranscript = document.getElementById(`transcript-${targetPerson.toLowerCase()}`);
        targetTranscript.innerHTML += `<div style="margin-bottom: 8px; animation: fadeIn 0.3s;"><strong style="color: #10b981;">Translated:</strong> ${translated}</div>`;
        
        // Speak translation
        this.speak(translated, targetLang);
        
        // Update status
        document.getElementById(`status-${person.toLowerCase()}`).textContent = 'Ready';
        document.getElementById(`status-${person.toLowerCase()}`).style.color = '#94a3b8';
        
        // Scroll to bottom
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        targetTranscript.scrollTop = targetTranscript.scrollHeight;
    }

    async translate(text, targetLang) {
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('target_language', targetLang);
            formData.append('source_language', 'auto');

            const res = await fetch(API_URL + '/translate-and-speak', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                return res.headers.get('X-Translated-Text') || text;
            }
            return text;
        } catch (e) {
            console.error('Translation error:', e);
            return text;
        }
    }

    speak(text, lang) {
        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1;
        utterance.pitch = 1;
        
        // Try to find matching voice
        const voices = this.synth.getVoices();
        const voice = voices.find(v => v.lang.startsWith(lang.substring(0, 2)));
        if (voice) utterance.voice = voice;

        this.synth.speak(utterance);
    }

    handleError(person, event) {
        console.error(`Speech recognition error (${person}):`, event.error);
        const status = document.getElementById(`status-${person.toLowerCase()}`);
        status.textContent = 'Error - try again';
        status.style.color = '#ef4444';
        
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '#94a3b8';
        }, 2000);
    }

    stop() {
        this.isActive = false;
        
        // Stop all recognition
        if (this.recognitionA) {
            try { this.recognitionA.stop(); } catch(e) {}
        }
        if (this.recognitionB) {
            try { this.recognitionB.stop(); } catch(e) {}
        }
        
        // Cancel speech
        this.synth.cancel();
        
        // Remove UI
        const ui = document.getElementById('live-conversation-ui');
        if (ui) ui.remove();
        
        // Restore scrolling
        document.body.style.overflow = '';
    }
}

// Global instance
const liveConversation = new LiveConversation();

// CSS animation for fade in
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
