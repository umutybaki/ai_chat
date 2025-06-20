class LLMChatApp {
    constructor() {
        this.currentChatId = null;
        this.chats = this.loadChats();
        this.apiKeys = {
            openai: '',
            anthropic: '',
            google: ''
        };
        this.initializeElements();
        this.bindEvents();
        this.loadChatHistory();
        this.autoResizeTextarea();
    }

    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.chatList = document.getElementById('chatList');
        this.modelSelect = document.getElementById('modelSelect');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.clearAllBtn.addEventListener('click', () => this.clearAllChats());
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                !this.sidebar.contains(e.target) &&
                !this.sidebarToggle.contains(e.target) &&
                this.sidebar.classList.contains('open')) {
                this.sidebar.classList.remove('open');
            }
        });
    }

    getText(key) {
        if (window.languageManager && window.languageManager.getText) {
            return window.languageManager.getText(key);
        }
        const fallbackTexts = {
            newChat: "New Chat",
            noMessages: "No messages yet",
            error: "Sorry, I encountered an error. Please try again.",
            confirmClearAll: "Are you sure you want to clear all chats? This action cannot be undone.",
            welcomeTitle: "Welcome to LLM Chat",
            welcomeMessage: "Start a conversation with your AI assistant. Your chats will be automatically saved."
        };
        return fallbackTexts[key] || key;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
    }

    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: this.getText('newChat'),
            messages: [],
            createdAt: new Date().toISOString(),
            model: this.modelSelect.value
        };
        this.chats.unshift(newChat);
        this.saveChats();
        this.loadChatHistory();
        this.loadChat(chatId);
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');

        this.chatContainer.innerHTML = '';
        chat.messages.forEach(message => {
            this.displayMessage(message.content, message.role, false);
        });

        this.modelSelect.value = chat.model || 'gpt-3.5-turbo';
        this.scrollToBottom();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        if (!this.currentChatId) {
            this.createNewChat();
        }

        this.displayMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeTextarea();

        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat) {
            chat.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
            if (chat.messages.length === 1) {
                chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
                this.loadChatHistory();
            }
        }

        this.showTypingIndicator();

        try {
            const response = await this.callLLMAPI(message, chat.messages);
            this.hideTypingIndicator();
            this.displayMessage(response, 'assistant');

            if (chat) {
                chat.messages.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
                this.saveChats();
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.displayMessage(this.getText('error') + ': ' + error.message, 'assistant');
            console.error('API Error:', error);
        }
    }
    async callLLMAPI(message, chatHistory) {
        const model = this.modelSelect.value;
        
        // Ensure proper message format
        const messages = chatHistory.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }));
    
        try {
            if (model.startsWith('gpt-')) {
                return await APIService.callOpenAI(messages, model, this.apiKeys.openai);
            } else if (model.startsWith('claude-')) {
                return await APIService.callAnthropic(messages, model, this.apiKeys.anthropic);
            } else if (model.startsWith('gemini-')) {
                return await APIService.callGoogle(messages, model, this.apiKeys.google);
            } else {
                throw new Error('Unsupported model selected');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        this.chatContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingMessage = this.chatContainer.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    displayMessage(content, role, scroll = true) {
        const welcomeMessage = this.chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        const avatar = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                ${this.formatMessage(content)}
                <div class="message-time">${time}</div>
            </div>
        `;

        this.chatContainer.appendChild(messageDiv);
        if (scroll) {
            this.scrollToBottom();
        }
    }

    formatMessage(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    loadChatHistory() {
        this.chatList.innerHTML = '';
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.setAttribute('data-chat-id', chat.id);

            const lastMessage = chat.messages.length > 0 ?
                chat.messages[chat.messages.length - 1].content.substring(0, 60) + '...' :
                this.getText('noMessages');
            const date = new Date(chat.createdAt).toLocaleDateString();

            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${lastMessage}</div>
                <div class="chat-item-date">${date}</div>
            `;

            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatList.appendChild(chatItem);
        });
    }

    clearAllChats() {
        if (confirm(this.getText('confirmClearAll'))) {
            this.chats = [];
            this.currentChatId = null;
            this.saveChats();
            this.loadChatHistory();
            this.chatContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i class="fas fa-robot welcome-icon"></i>
                        <h2 data-i18n="welcomeTitle">${this.getText('welcomeTitle')}</h2>
                        <p data-i18n="welcomeMessage">${this.getText('welcomeMessage')}</p>
                    </div>
                </div>
            `;
        }
    }

    loadChats() {
        const saved = localStorage.getItem('llm-chats');
        return saved ? JSON.parse(saved) : [];
    }

    saveChats() {
        localStorage.setItem('llm-chats', JSON.stringify(this.chats));
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    refreshUILanguage() {
        console.log('Refreshing UI language...');
        this.loadChatHistory();

        const welcomeMessage = this.chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            const welcomeTitle = welcomeMessage.querySelector('h2');
            const welcomeText = welcomeMessage.querySelector('p');
            if (welcomeTitle) welcomeTitle.textContent = this.getText('welcomeTitle');
            if (welcomeText) welcomeText.textContent = this.getText('welcomeMessage');
        }
        console.log('UI language refresh completed');
    }
}

// Enhanced API Service with real implementations
class APIService {
    static async callOpenAI(messages, model, apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            throw new Error(`OpenAI Error: ${error.message}`);
        }
    }

    static async callAnthropic(messages, model, apiKey) {
        try {
            // Convert OpenAI format messages to Anthropic format
            const systemMessage = messages.find(m => m.role === 'system');
            let conversationMessages = messages.filter(m => m.role !== 'system');

            // Anthropic requires alternating user/assistant messages
            // and the conversation must start with user and end with user
            const anthropicMessages = [];
            let lastRole = null;

            for (const message of conversationMessages) {
                let role = message.role;
                let content = message.content;

                // Convert content to string if it's not already
                if (typeof content !== 'string') {
                    if (Array.isArray(content)) {
                        content = content.map(item =>
                            typeof item === 'string' ? item :
                                item.text || JSON.stringify(item)
                        ).join(' ');
                    } else {
                        content = JSON.stringify(content);
                    }
                }

                // Skip consecutive messages from the same role
                if (role === lastRole) {
                    // Merge with previous message
                    if (anthropicMessages.length > 0) {
                        anthropicMessages[anthropicMessages.length - 1].content += '\n\n' + content;
                    }
                    continue;
                }

                // Only allow 'user' and 'assistant' roles
                if (role !== 'user' && role !== 'assistant') {
                    role = 'user'; // Convert other roles to user
                }

                anthropicMessages.push({
                    role: role,
                    content: content
                });

                lastRole = role;
            }

            // Ensure the conversation ends with a user message
            if (anthropicMessages.length === 0) {
                throw new Error('No valid messages for Anthropic API');
            }

            if (anthropicMessages[anthropicMessages.length - 1].role !== 'user') {
                // If last message is from assistant, we need a user message to get a response
                throw new Error('Anthropic API requires the last message to be from user');
            }

            const requestBody = {
                model: model,
                max_tokens: 2000,
                messages: anthropicMessages
            };

            // Add system message if it exists
            if (systemMessage && systemMessage.content) {
                requestBody.system = systemMessage.content;
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error?.message || errorData.message || response.statusText;
                } catch {
                    errorMessage = errorText || response.statusText;
                }
                throw new Error(`Anthropic API Error (${response.status}): ${errorMessage}`);
            }

            const data = await response.json();

            // Extract text from response
            if (data.content && data.content.length > 0) {
                const textContent = data.content.find(item => item.type === 'text');
                if (textContent) {
                    return textContent.text;
                }
            }

            throw new Error('No text content in Anthropic API response');

        } catch (error) {
            console.error('Anthropic API call failed:', error);

            // Provide more helpful error messages
            if (error.message.includes('authentication')) {
                throw new Error('Anthropic API authentication failed. Please check your API key.');
            } else if (error.message.includes('rate limit')) {
                throw new Error('Anthropic API rate limit exceeded. Please try again later.');
            } else if (error.message.includes('CORS')) {
                throw new Error('CORS error: Anthropic API calls must be made from a server, not directly from the browser.');
            } else {
                throw new Error(`Anthropic Error: ${error.message}`);
            }
        }
    }

    static async callGoogle(messages, model, apiKey) {
        try {
            // Convert messages to Google Gemini format
            const contents = [];

            for (const message of messages) {
                if (message.role === 'system') continue; // Gemini doesn't use system messages the same way

                contents.push({
                    role: message.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: message.content }]
                });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No response generated from Google API');
            }
        } catch (error) {
            console.error('Google API call failed:', error);
            throw new Error(`Google Error: ${error.message}`);
        }
    }

    // Utility method to test API connectivity
    static async testAPIConnection(provider, apiKey) {
        try {
            const testMessage = [{ role: 'user', content: 'Hello, this is a test message.' }];

            switch (provider) {
                case 'openai':
                    await this.callOpenAI(testMessage, 'gpt-3.5-turbo', apiKey);
                    break;
                case 'anthropic':
                    await this.callAnthropic(testMessage, 'claude-3-haiku-20240307', apiKey);
                    break;
                case 'google':
                    await this.callGoogle(testMessage, 'gemini-pro', apiKey);
                    break;
                default:
                    throw new Error('Unknown provider');
            }
            return true;
        } catch (error) {
            console.error(`${provider} API test failed:`, error);
            return false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.chatApp = new LLMChatApp();
    }, 100);
});