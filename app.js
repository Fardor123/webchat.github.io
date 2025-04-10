// Security Configuration
const SECURITY_CONFIG = {
    // Encryption settings
    ENCRYPTION_KEY: 'aes-256-cbc', // In a real app, this would be generated per session
    IV_LENGTH: 16, // For AES, this is always 16
    
    // Ban settings
    BAN_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    MAX_MESSAGES_PER_MINUTE: 30, // Rate limiting
    
    // Storage settings
    STORAGE_KEY: 'secure_chat_data',
    BAN_LIST_KEY: 'secure_chat_bans',
    
    // User settings
    USERNAME_PREFIX: 'User-',
    USERNAME_LENGTH: 8
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is banned
    if (isUserBanned()) {
        showBanMessage();
        return;
    }
    
    // Initialize chat
    initChat();
});

// Chat application
function initChat() {
    // Generate a random username if none exists
    let username = localStorage.getItem('secure_chat_username');
    if (!username) {
        username = generateRandomUsername();
        localStorage.setItem('secure_chat_username', username);
    }
    
    // Initialize message tracking for rate limiting
    let messageCount = 0;
    let lastMessageTime = 0;
    
    // DOM elements
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const userCountElement = document.getElementById('user-count');
    
    // Load previous messages
    loadMessages();
    
    // Update user count (simulated)
    updateUserCount();
    setInterval(updateUserCount, 10000);
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Window close handler to clear sensitive data
    window.addEventListener('beforeunload', () => {
        // Clear all messages from storage
        localStorage.removeItem(SECURITY_CONFIG.STORAGE_KEY);
    });
    
    // Function to send a message
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        
        // Rate limiting
        const now = Date.now();
        if (now - lastMessageTime < 60000) { // 1 minute window
            messageCount++;
            if (messageCount > SECURITY_CONFIG.MAX_MESSAGES_PER_MINUTE) {
                banUser('Rate limit exceeded');
                return;
            }
        } else {
            messageCount = 1;
            lastMessageTime = now;
        }
        
        // Create message object
        const message = {
            id: generateId(),
            username: username,
            text: messageText,
            timestamp: new Date().toISOString(),
            ipHash: hashString(getUserIP()) // Store hashed IP for moderation
        };
        
        // Encrypt message text
        message.text = encryptMessage(message.text);
        
        // Save message
        saveMessage(message);
        
        // Display message
        displayMessage(message, true);
        
        // Clear input
        messageInput.value = '';
    }
    
    // Function to save a message to localStorage
    function saveMessage(message) {
        let messages = JSON.parse(localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY)) || [];
        messages.push(message);
        
        // Keep only the last 100 messages to prevent storage bloat
        if (messages.length > 100) {
            messages = messages.slice(-100);
        }
 }
        
        localStorage.setItem(SECURITY_CONFIG.STORAGE_KEY, JSON.stringify(messages));
    }
    
    // Function to load messages from localStorage
    function loadMessages() {
        const messages = JSON.parse(localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY)) || [];
        
        // Decrypt and display each message
        messages.forEach(msg => {
            try {
                msg.text = decryptMessage(msg.text);
                displayMessage(msg, false);
            } catch (e) {
                console.error('Failed to decrypt message:', e);
            }
        });
    }
    
    // Function to display a message in the chat
    function displayMessage(message, isNew) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const usernameElement = document.createElement('span');
        usernameElement.className = 'username';
        usernameElement.textContent = message.username;
        
        const timestampElement = document.createElement('span');
        timestampElement.className = 'timestamp';
        timestampElement.textContent = new Date(message.timestamp).toLocaleTimeString();
        
        const textElement = document.createElement('div');
        textElement.textContent = message.text;
        
        messageElement.appendChild(usernameElement);
        messageElement.appendChild(timestampElement);
        messageElement.appendChild(textElement);
        
        if (isNew) {
            chatContainer.appendChild(messageElement);
        } else {
            chatContainer.insertBefore(messageElement, chatContainer.firstChild);
        }
        
        // Auto-scroll to bottom if new message
        if (isNew) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    // Simulated user count update
    function updateUserCount() {
        // In a real app, this would come from a server
        const count = Math.floor(Math.random() * 10) + 1;
        userCountElement.textContent = `Users: ${count}`;
    }
}

// Security Functions
function isUserBanned() {
    const banList = JSON.parse(localStorage.getItem(SECURITY_CONFIG.BAN_LIST_KEY)) || [];
    const ipHash = hashString(getUserIP());
    const cookieId = getCookieId();
    
    // Check if IP or cookie is banned
    const isBanned = banList.some(ban => {
        const banExpired = Date.now() > ban.expires;
        if (banExpired) return false;
        
        return ban.ipHash === ipHash || ban.cookieId === cookieId;
    });
    
    return isBanned;
}

function banUser(reason) {
    const banList = JSON.parse(localStorage.getItem(SECURITY_CONFIG.BAN_LIST_KEY)) || [];
    const ipHash = hashString(getUserIP());
    const cookieId = getCookieId();
    
    banList.push({
        ipHash,
        cookieId,
        reason,
        timestamp: new Date().toISOString(),
        expires: Date.now() + SECURITY_CONFIG.BAN_DURATION
    });
    
    localStorage.setItem(SECURITY_CONFIG.BAN_LIST_KEY, JSON.stringify(banList));
    showBanMessage();
}

function showBanMessage() {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h1>Access Denied</h1>
            <p>You have been banned from this chat.</p>
            <p>This ban will expire in 24 hours.</p>
            <p><small>Clearing cookies may allow you you to rejoin, but repeated violations may result in permanent IP bans.</small></p>
        </div>
    `;
}

// Encryption Functions
function encryptMessage(text) {
    // In a real app, you would use a proper key exchange protocol
    // This is a simplified version for demonstration
    const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IVIV_LENGTH));
    const cipher = crypto.subtle.encrypt(
        { name: SECURITY_CONFIG.ENCRYPTION_KEY, iv },
        getCryptoKey(),
        new TextEncoder().encode(text)
    );
    
    // Combine IV and ciphertext
    return arrayBufferToBase64(iv) + ':' + arrayBufferToBase64(cipher);
}

function decryptMessage(encryptedText) {
    const [ivString, cipherString] = encryptedText.split(':');
    const iv = base64ToArrayBuffer(ivString);
    const cipher = base64ToArrayBuffer(cipherString);
    
    const plaintext = crypto.subtle.decrypt(
        { name: SECURITY_CONFIG.ENCRYPTION_KEY, iv },
        getCryptoKey(),
        cipher
    );
    
    return new TextDecoder().decode(plaintext);
}

function getCryptoKey() {
    // In a real app, this would be properly generated and shared between users
    // This is a simplified version for demonstration
    const keyMaterial = crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('demo-secret-key-32-bytes-long-1234'),
        { name: SECURITY_CONFIG.ENCRYPTION_KEY },
        false,
        ['encrypt', 'decrypt']
    );
    
    return keyMaterial;
}

// Utility Functions
function generateRandomUsername() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = SECURITY_CONFIG.USERNAME_PREFIX;
    
    for (let i = 0; i < SECURITY_CONFIG.USERNAME_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

function generateId() {
    return crypto.randomUUID();
}

function getUserIP() {
    // In a real app, this would come from a WebRTC or server request
    // This is a simplified version for demonstration
    return 'simulated-ip-' + Math.floor(Math.random() * 1000);
}

function getCookieId() {
    let cookieId = localStorage.getItem('secure_chat_cookie_id');
    if (!cookieId) {
        cookieId = generateId();
        localStorage.setItem('secure_chat_cookie_id', cookieId);
    }
    return cookieId;
}

function hashString(str) {
    // Simple hash for demonstration - in a real app, use a proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

function arrayBufferToBase64(buffer) {
    return btoa(String.from.fromCharCode.apply(null, new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

