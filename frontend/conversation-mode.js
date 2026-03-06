// LIVE CONVERSATION MODE - Real Pro Feature
class ConversationMode {
    constructor() {
        this.isActive = false;
        this.personALang = 'en';
        this.personBLang = 'es';
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
    }

    start() {
        this.isActive = true;
        this.showConversationUI();
        this.setupSpeechRecognition();
    }

    showConversationUI() {
        const ui = document.createElement('div');
        ui.id = 'conversation-ui';
        ui.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(15, 23, 42, 0.95); z-index: 10000; 
                        display: flex; flex-direction: column; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: white; margin: 0;">🎙️ Live Conversation</h2>
                    <button onclick="conversationMode.stop()" 
                            style="background: #ef4444; color: white; border: none; 
                                   padding: 10px 20px; border-radius: 8px; cursor: pointer;">End</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1;">
                    <!-- Person A -->
                    <div style="background: rgba(99, 102, 241, 0.2); border-radius: 16px; padding: 20px;">
                        <h3 style="color: #6366f1; margin-top: 0;">Person A</h3>
                        <select id="personALang" onchange="conversationMode.setLang('A', this.value)" 
                                style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="de">German</option>
                            <option value="fr">French</option>
                        </select>
                        <button onclick="conversationMode.startListening('A')" 
                                style="width: 100%; padding: 15px; background: #6366f1; color: white; 
                                       border: none; border-radius: 8px; font-size: 16px;">
                            🎤 Hold to Speak
                        </button>
                        <div id="personAText" style="margin-top: 15px; padding: 15px; 
                                                     background: rgba(0,0,0,0.3); border-radius: 8px; 
                                                     min-height: 100px; color: white;"></div>
                    </div>
                    
                    <!-- Person B -->
                    <div style="background: rgba(236, 72, 153, 0.2); border-radius: 16px; padding: 20px;">
                        <h3 style="color: #ec4899; margin-top: 0;">Person B</h3>
                        <select id="personBLang" onchange="conversationMode.setLang('B', this.value)" 
                                style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                            <option value="es">Spanish</option>
                            <option value="en">English</option>
                            <option value="de">German</option>
                            <option value="fr">French</option>
                        </select>
                        <button onclick="conversationMode.startListening('B')" 
                                style="width: 100%; padding: 15px; background: #ec4899; color: white; 
                                       border: none; border-radius: 8px; font-size: 16px;">
                            🎤 Hold to Speak
                        </button>
                        <div id="personBText" style="margin-top: 15px; padding: 15px; 
                                                     background: rgba(0,0,0,0.3); border-radius: 8px; 
                                                     min-height: 100px; color: white;"></div>
                    </div>
                </div>
                
                <div id="conversation-status" style="text-align: center; padding: 20px; color: #94a3b8;">
                    Select languages and hold buttons to start conversation
                </div>
            </div>
        `;
        document.body.appendChild(ui);
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }

    startListening(person) {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser. Try Chrome.');
            return;
        }

        const lang = person === 'A' ? document.getElementById('personALang').value : document.getElementById('personBLang').value;
        const targetLang = person === 'A' ? document.getElementById('personBLang').value : document.getElementById('personALang').value;
        const targetDiv = person === 'A' ? 'personBText' : 'personAText';

        this.recognition.lang = lang;
        document.getElementById('conversation-status').textContent = `Listening to Person ${person}...`;

        this.recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById(person === 'A' ? 'personAText' : 'personBText').innerHTML += `<div>> ${transcript}</div>`;
            
            // Translate
            const translated = await this.translateText(transcript, targetLang);
            document.getElementById(targetDiv).innerHTML += `<div style="color: #10b981;">→ ${translated}</div>`;
            
            // Speak translation
            this.speak(translated, targetLang);
        };

        this.recognition.start();
    }

    async translateText(text, targetLang) {
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
            return text;
        }
    }

    speak(text, lang) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        this.synthesis.speak(utterance);
    }

    setLang(person, lang) {
        if (person === 'A') this.personALang = lang;
        else this.personBLang = lang;
    }

    stop() {
        this.isActive = false;
        const ui = document.getElementById('conversation-ui');
        if (ui) ui.remove();
        if (this.recognition) this.recognition.stop();
    }
}

const conversationMode = new ConversationMode();
