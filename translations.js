const translations = {
    en: {
        chatHistory: "Chat History",
        newChat: "New Chat",
        clearAll: "Clear All",
        appTitle: "LLM Chat Assistant",
        welcomeTitle: "Welcome to LLM Chat",
        welcomeMessage: "Start a conversation with your AI assistant. Your chats will be automatically saved.",
        inputPlaceholder: "Type your message here...",
        inputHint: "Press Enter to send, Shift+Enter for new line",
        thinking: "Thinking...",
        sendMessage: "Send Message",
        confirmClearAll: "Are you sure you want to clear all chats? This action cannot be undone.",
        noMessages: "No messages yet",
        today: "Today",
        yesterday: "Yesterday",
        thisWeek: "This week",
        lastWeek: "Last week",
        older: "Older",
        error: "Sorry, I encountered an error. Please try again.",
        connecting: "Connecting...",
        connected: "Connected",
        offline: "Offline"
    },
    tr: {
        chatHistory: "Sohbet Geçmişi",
        newChat: "Yeni Sohbet",
        clearAll: "Hepsini Temizle",
        appTitle: "LLM Sohbet Asistanı",
        welcomeTitle: "LLM Sohbet'e Hoş Geldiniz",
        welcomeMessage: "AI asistanınızla sohbet etmeye başlayın. Sohbetleriniz otomatik olarak kaydedilecek.",
        inputPlaceholder: "Mesajınızı buraya yazın...",
        inputHint: "Göndermek için Enter'a, yeni satır için Shift+Enter'a basın",
        thinking: "Düşünüyor...",
        sendMessage: "Mesaj Gönder",
        confirmClearAll: "Tüm sohbetleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
        noMessages: "Henüz mesaj yok",
        today: "Bugün",
        yesterday: "Dün",
        thisWeek: "Bu hafta",
        lastWeek: "Geçen hafta",
        older: "Daha eski",
        error: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
        connecting: "Bağlanıyor...",
        connected: "Bağlandı",
        offline: "Çevrimdışı"
    }
};

// Language management class
class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
        console.log('LanguageManager initialized with language:', this.currentLanguage);
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded before binding events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupLanguageSelector();
                this.updateLanguage(this.currentLanguage);
            });
        } else {
            this.setupLanguageSelector();
            this.updateLanguage(this.currentLanguage);
        }
    }

    setupLanguageSelector() {
        const languageSelect = document.getElementById('languageSelect');
        console.log('Setting up language selector:', languageSelect);

        if (languageSelect) {
            // Set current value
            languageSelect.value = this.currentLanguage;

            // Remove any existing event listeners
            languageSelect.removeEventListener('change', this.handleLanguageChange);

            // Add new event listener
            this.handleLanguageChange = (e) => {
                console.log('Language changed to:', e.target.value);
                this.updateLanguage(e.target.value);

                // Refresh chat history when language changes
                if (window.chatApp && window.chatApp.loadChatHistory) {
                    window.chatApp.loadChatHistory();
                }
            };

            languageSelect.addEventListener('change', this.handleLanguageChange);
        } else {
            console.warn('Language selector not found, retrying in 500ms...');
            // Retry if element not found
            setTimeout(() => this.setupLanguageSelector(), 500);
        }
    }

    updateLanguage(lang) {
        console.log('Updating language to:', lang);

        if (!translations[lang]) {
            console.warn('Translation not found for language:', lang);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);

        // Update document language
        document.documentElement.lang = lang;

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
                console.log(`Updated ${key}:`, translations[lang][key]);
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                element.placeholder = translations[lang][key];
                console.log(`Updated placeholder ${key}:`, translations[lang][key]);
            }
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (translations[lang][key]) {
                element.title = translations[lang][key];
            }
        });

        // Update page title
        document.title = translations[lang].appTitle;

        // Update language selector value
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && languageSelect.value !== lang) {
            languageSelect.value = lang;
        }

        console.log('Language update completed for:', lang);
    }

    getText(key) {
        const text = translations[this.currentLanguage][key] || translations['en'][key] || key;
        console.log(`getText(${key}):`, text);
        return text;
    }
}

// Initialize language manager
let languageManager;

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLanguageManager);
} else {
    initializeLanguageManager();
}

function initializeLanguageManager() {
    console.log('Initializing LanguageManager...');
    languageManager = new LanguageManager();
    window.languageManager = languageManager;

    // Also make it globally accessible for debugging
    window.translations = translations;

    console.log('LanguageManager ready:', languageManager);
}