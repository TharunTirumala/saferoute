// SafeRoute: Multilingual Hands-Free Voice SOS Engine
// Supports Web Speech API (SpeechRecognition / webkitSpeechRecognition)
// Strict Privacy: Zero audio recording or external storage. In-memory trigger evaluation only.

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US / Global)' },
  { code: 'hi-IN', name: 'Hindi / Hinglish' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'es-ES', name: 'Spanish (Español)' }
];

export const DEFAULT_EMERGENCY_PHRASES = [
  { id: 'p1', phrase: 'Help me', lang: 'en-US', enabled: true },
  { id: 'p2', phrase: 'Emergency', lang: 'en-US', enabled: true },
  { id: 'p3', phrase: 'SOS', lang: 'all', enabled: true },
  { id: 'p4', phrase: 'Call for help', lang: 'en-US', enabled: true },
  { id: 'p5', phrase: 'Stop following me', lang: 'en-US', enabled: true },
  { id: 'p6', phrase: 'Bachao', lang: 'hi-IN', enabled: true },
  { id: 'p7', phrase: 'Bachao mujhe', lang: 'hi-IN', enabled: true },
  { id: 'p8', phrase: 'Mujhe bachao', lang: 'hi-IN', enabled: true },
  { id: 'p9', phrase: 'నన్ను కాపాడండి', lang: 'te-IN', enabled: true },
  { id: 'p10', phrase: 'సహాయం చేయండి', lang: 'te-IN', enabled: true },
  { id: 'p11', phrase: 'nannu kapadandi', lang: 'te-IN', enabled: true },
  { id: 'p12', phrase: 'sahayam cheyandi', lang: 'te-IN', enabled: true },
  { id: 'p13', phrase: 'உதவி', lang: 'ta-IN', enabled: true },
  { id: 'p14', phrase: 'ಕಾಪಾಡಿ', lang: 'kn-IN', enabled: true },
  { id: 'p15', phrase: 'वाचवा', lang: 'mr-IN', enabled: true },
  { id: 'p16', phrase: 'ayuda', lang: 'es-ES', enabled: true }
];

export class VoicePanicEngine {
  constructor(options = {}) {
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onCountdownTick = options.onCountdownTick || (() => {});
    this.onEmergencyTriggered = options.onEmergencyTriggered || (() => {});
    this.onCancelled = options.onCancelled || (() => {});
    this.onEmergencyDetected = options.onEmergencyDetected || null;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRec;
    this.SpeechRecognitionClass = SpeechRec;

    this.recognition = null;
    this.isEnabled = false;
    this.currentLanguage = localStorage.getItem('saferoute_voice_lang') || 'en-US';
    this.state = 'DISABLED'; // 'DISABLED' | 'STARTING' | 'PERMISSION_REQUIRED' | 'LISTENING' | 'COUNTDOWN' | 'EMERGENCY_TRIGGERED' | 'UNSUPPORTED' | 'ERROR'
    
    this.countdownTimer = null;
    this.countdownSeconds = 3;
    this.activePhrase = '';
    this.restartAttempts = 0;
    this.maxRestarts = 10;
    this.lastProcessedTranscript = '';

    this.phrases = this.loadPhrases();
  }

  /**
   * Loads custom & default phrases from localStorage
   */
  loadPhrases() {
    try {
      const saved = localStorage.getItem('saferoute_emergency_phrases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load emergency phrases from localStorage", e);
    }
    return [...DEFAULT_EMERGENCY_PHRASES];
  }

  /**
   * Saves phrases to localStorage
   */
  savePhrases() {
    try {
      localStorage.setItem('saferoute_emergency_phrases', JSON.stringify(this.phrases));
    } catch (e) {
      console.warn("Failed to save emergency phrases", e);
    }
  }

  /**
   * Get all registered phrases
   */
  getPhrases() {
    return [...this.phrases];
  }

  /**
   * Add a new emergency phrase
   */
  addPhrase(text, lang = 'all') {
    const cleanText = text.trim();
    if (!cleanText) return { success: false, error: 'Phrase cannot be empty.' };

    const exists = this.phrases.some(p => p.phrase.toLowerCase() === cleanText.toLowerCase());
    if (exists) {
      return { success: false, error: 'This emergency phrase is already registered.' };
    }

    const newPhrase = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      phrase: cleanText,
      lang: lang || 'all',
      enabled: true
    };

    this.phrases.push(newPhrase);
    this.savePhrases();
    return { success: true, phrase: newPhrase };
  }

  /**
   * Update existing phrase text or state
   */
  updatePhrase(id, newText, enabled = true) {
    const phrase = this.phrases.find(p => p.id === id);
    if (!phrase) return { success: false, error: 'Phrase not found.' };

    const cleanText = (newText !== undefined ? newText : phrase.phrase).trim();
    if (!cleanText) return { success: false, error: 'Phrase cannot be empty.' };

    phrase.phrase = cleanText;
    if (enabled !== undefined) phrase.enabled = !!enabled;

    this.savePhrases();
    return { success: true, phrase };
  }

  /**
   * Toggle enabled status of a phrase
   */
  togglePhrase(id) {
    const phrase = this.phrases.find(p => p.id === id);
    if (phrase) {
      phrase.enabled = !phrase.enabled;
      this.savePhrases();
      return true;
    }
    return false;
  }

  /**
   * Delete an emergency phrase
   */
  deletePhrase(id) {
    const initialLen = this.phrases.length;
    this.phrases = this.phrases.filter(p => p.id !== id);
    if (this.phrases.length !== initialLen) {
      this.savePhrases();
      return true;
    }
    return false;
  }

  /**
   * Reset phrases to default library
   */
  resetToDefaults() {
    this.phrases = [...DEFAULT_EMERGENCY_PHRASES];
    this.savePhrases();
  }

  /**
   * Sets the recognition language (e.g. en-US, te-IN, hi-IN)
   */
  setLanguage(langCode) {
    this.currentLanguage = langCode;
    localStorage.setItem('saferoute_voice_lang', langCode);
    if (this.recognition) {
      this.recognition.lang = langCode;
      if (this.isEnabled && this.state === 'LISTENING') {
        try {
          this.recognition.stop();
        } catch (e) {}
      }
    }
  }

  /**
   * Initializes SpeechRecognition instance
   */
  initRecognition() {
    if (!this.isSupported || this.recognition) return;

    try {
      this.recognition = new this.SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.restartAttempts = 0;
        if (this.state !== 'COUNTDOWN' && this.state !== 'EMERGENCY_TRIGGERED') {
          this.state = 'LISTENING';
          this.onStatusChange('LISTENING', 'Listening');
        }
      };

      this.recognition.onresult = (event) => {
        if (this.state === 'COUNTDOWN' || this.state === 'EMERGENCY_TRIGGERED') {
          // Ignore additional voice triggers during countdown or active emergency
          return;
        }

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim();
          this.lastProcessedTranscript = transcript;
          
          const matchedPhrase = this.checkTriggerPhrase(transcript);
          if (matchedPhrase) {
            this.state = 'COUNTDOWN';
            if (this.onEmergencyDetected) {
              this.onEmergencyDetected(matchedPhrase);
            } else {
              this.startCountdown(matchedPhrase);
            }
            break;
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Voice SOS SpeechRecognition event error:', event.error);
        if (event.error === 'not-allowed') {
          this.isEnabled = false;
          this.state = 'PERMISSION_REQUIRED';
          this.onStatusChange('PERMISSION_REQUIRED', 'Microphone permission required');
        } else if (event.error === 'no-speech') {
          // Normal timeout when silent
        } else if (event.error === 'network') {
          this.state = 'ERROR';
          this.onStatusChange('ERROR', 'Speech network unavailable');
        }
      };

      this.recognition.onend = () => {
        if (this.isEnabled && this.state === 'LISTENING') {
          if (this.restartAttempts < this.maxRestarts) {
            this.restartAttempts++;
            setTimeout(() => {
              if (this.isEnabled && this.state === 'LISTENING') {
                try {
                  this.recognition.start();
                } catch (e) {}
              }
            }, 300);
          } else {
            this.state = 'DISABLED';
            this.isEnabled = false;
            this.onStatusChange('DISABLED', 'Disabled');
          }
        }
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
      this.state = 'UNSUPPORTED';
      this.onStatusChange('UNSUPPORTED', 'Not supported');
    }
  }

  /**
   * Normalizes strings for robust matching across languages and scripts
   */
  normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ') // replace punctuation with spaces
      .replace(/\s+/g, ' ') // collapse multi-spaces
      .trim();
  }

  /**
   * Checks if transcript contains any enabled emergency trigger phrase.
   * Tolerant of spacing, capitalization, transliteration, and minor variations.
   * False-Trigger Safe: Rejects long sentences where "help" appears incidentally.
   */
  checkTriggerPhrase(transcript) {
    if (!transcript) return null;

    const normalizedTranscript = this.normalizeText(transcript);
    const words = normalizedTranscript.split(' ').filter(Boolean);

    // Active enabled phrases
    const activePhrases = this.phrases.filter(p => p.enabled !== false);

    for (const item of activePhrases) {
      const normalizedTarget = this.normalizeText(item.phrase);
      if (!normalizedTarget) continue;

      // 1. Direct or whole phrase match
      if (normalizedTranscript === normalizedTarget) {
        return item.phrase;
      }

      // 2. Exact word sequence matching
      const targetWords = normalizedTarget.split(' ').filter(Boolean);
      const isMultiWord = targetWords.length > 1;

      // If target is multi-word (e.g. "help me", "bachao mujhe", "nannu kapadandi", "sahayam cheyandi")
      if (isMultiWord) {
        if (normalizedTranscript.includes(normalizedTarget)) {
          // Verify transcript is predominantly the emergency phrase to prevent false positives
          const wordLengthRatio = targetWords.length / words.length;
          if (wordLengthRatio >= 0.3 || words.length <= 6) {
            return item.phrase;
          }
        }
      } else {
        // Single word target (e.g. "SOS", "Bachao", "Ayuda", "Emergency", "కాపాడి", "உதவி")
        // Trigger only if the word is an exact standalone match or leading urgent command
        const foundIndex = words.indexOf(targetWords[0]);
        if (foundIndex !== -1) {
          // If word is alone or said in short urgent context (<= 3 words total, e.g. "SOS", "Bachao please")
          if (words.length <= 3) {
            return item.phrase;
          }
        }
      }
    }

    return null;
  }

  /**
   * Starts the 5-second false-activation-prevention countdown
   */
  startCountdown(phrase) {
    if (this.state === 'COUNTDOWN' || this.state === 'EMERGENCY_TRIGGERED') return;

    this.state = 'COUNTDOWN';
    this.activePhrase = phrase;
    this.countdownSeconds = 5;

    this.onCountdownTick(this.countdownSeconds, this.activePhrase);

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      
      if (this.countdownSeconds > 0) {
        this.onCountdownTick(this.countdownSeconds, this.activePhrase);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.state = 'EMERGENCY_TRIGGERED';
        this.onEmergencyTriggered(this.activePhrase);
      }
    }, 1000);
  }

  /**
   * User manually cancels the SOS countdown
   */
  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state = 'LISTENING';
    this.activePhrase = '';
    this.countdownSeconds = 5;

    this.onCancelled();
    this.onStatusChange('LISTENING', 'Listening');
  }

  /**
   * Resumes listening after SOS modal is dismissed
   */
  resumeAfterEmergency() {
    this.state = 'LISTENING';
    this.activePhrase = '';
    this.countdownSeconds = 5;
    this.onStatusChange('LISTENING', 'Listening');
    if (this.isEnabled && this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  /**
   * Explicitly enables Hands-Free Voice SOS & requests microphone permission
   */
  async enable() {
    if (!this.isSupported) {
      this.state = 'UNSUPPORTED';
      this.onStatusChange('UNSUPPORTED', 'Not supported');
      return false;
    }

    this.initRecognition();
    this.isEnabled = true;
    this.state = 'STARTING';
    this.onStatusChange('STARTING', 'Starting');

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        this.state = 'LISTENING';
        this.onStatusChange('LISTENING', 'Listening');
        return true;
      }
      console.warn('Voice SOS Start error:', err);
      this.isEnabled = false;
      this.state = 'DISABLED';
      this.onStatusChange('DISABLED', 'Disabled');
      return false;
    }
  }

  /**
   * Disables Hands-Free Voice SOS and releases recognition resources
   */
  disable() {
    this.isEnabled = false;
    this.state = 'DISABLED';
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.onStatusChange('DISABLED', 'Disabled');
  }

  /**
   * Toggles Voice SOS on / off
   */
  toggle() {
    if (this.isEnabled) {
      this.disable();
      return false;
    } else {
      return this.enable();
    }
  }
}
