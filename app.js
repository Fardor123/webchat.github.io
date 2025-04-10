// Chat storage (client-side only)
let chatStorage = {
    messages: [],
    save: function() {
        localStorage.setItem('secureGroupChat', JSON.stringify(this.messages));
    },
    load: function() {
        const data = localStorage.getItem('secureGroupChat');
        if (data) {
            this.messages = JSON.parse(data) || [];
        }
    }
};

// Encryption/Decryption functions
const crypto = {
    encrypt: function(publicKeyPem, message) {
        try {
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            const encrypted = publicKey.encrypt(message, 'RSA-OAEP');
            return forge.util.encode64(encrypted);
        } catch (e) {
            console.error("Encryption error:", e);
            return null;
        }
    },
    
    decrypt: function(privateKeyPem, encryptedMessage) {
        try {
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const decoded = forge.util.decode64(encryptedMessage);
            return privateKey.decrypt(decoded, 'RSA-OAEP');
        } catch (e) {
            console.error("Decryption error:", e);
            return null;
        }
    },
    
    generateKeyPair: function() {
        const keypair = forge.pki.rsa.generateKeyPair({bits: 2048});
        return {
            publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
            privateKey: forge.pki.privateKeyToPem(keypair.privateKey)
        };
    }
};

// Chat application
const chatApp = {
    keys: {
        publicKey: null,
        privateKey: null
    },
    username: '',
    connected: false,
    
    init: function() {
        chatStorage.load();
        
        document.getElementById('generateKeys').addEventListener('click', () => {
            this.generateKeys();
        });
        
        document.getElementById('connect').addEventListener('click', () => {
            this.connect();
        });
        
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Check if we have keys in localStorage
        const savedKeys = localStorage.getItem('chatKeys');
        if (savedKeys) {
            const keys = JSON.parse(savedKeys);
            document.getElementById('publicKey').value = keys.publicKey;
            document.getElementById('privateKey').value = keys.privateKey;
        }
    },
    
    generateKeys: function() {
        const keys = crypto.generateKeyPair();
        document.getElementById('publicKey').value = keys.publicKey;
        document.getElementById('privateKey').value = keys.privateKey;
        document.getElementById('loginError').textContent = '';
    },
    
    connect: function() {
        const publicKey = document.getElementById('publicKey').value.trim();
        const privateKey = document.getElementById('privateKey').value.trim();
        const username = document.getElementById('username').value.trim();
        
        if (!publicKey || !privateKey || !username) {
            document.getElementById('loginError').textContent = 'All fields are required';
            return;
        }
        
        // Save keys to localStorage for convenience
        localStorage.setItem('chatKeys', JSON.stringify({publicKey, privateKey}));
        
        // Test if keys work by encrypting/decrypting a test message
        const testMessage = "test";
        const encrypted = crypto.encrypt(publicKey, testMessage);
        if (!encrypted) {
            document.getElementById('loginError').textContent = 'Invalid public key';
            return;
        }
        
        const decrypted = crypto.decrypt(privateKey, encrypted);
        if (decrypted !== testMessage) {
            document.getElementById('loginError').textContent = 'Invalid private key or key mismatch';
            return;
        }
        
        // Keys are valid
        this.keys.publicKey = publicKey;
        this.keys.privateKey = privateKey;
        this.username = username;
        this.connected = true;
        
        // Show chat interface
        document.getElementById('login').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        
        // Load and display messages
        this.displayMessages();
        
        // Set up periodic message checking
        this.messageCheckInterval = setInterval(() => {
            this.displayMessages();
        }, 1000);
    },
    
    sendMessage: function() {
        if (!this.connected) return;
        
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        
        if (!messageText) return;
        
        // Encrypt the message with the group's public key
        const encryptedMessage = crypto.encrypt(this.keys.publicKey, messageText);
        if (!encryptedMessage) {
            alert('Failed to encrypt message');
            return;
        }
        
        // Create message object
        const message = {
            id: Date.now(),
            username: this.username,
            timestamp: new Date().toISOString(),
            encryptedText: encryptedMessage
        };
        
        // Add to storage and display
        chatStorage.messages.push(message);
        chatStorage.save();
        this.displayMessages();
        
        // Clear input
        messageInput.value = '';
    },
    
    displayMessages: function() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        // Sort messages by timestamp
        const sortedMessages = [...chatStorage.messages].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp));
        
        sortedMessages.forEach(msg => {
            // Try to decrypt each message
            const decryptedText = crypto.decrypt(this.keys.privateKey, msg.encryptedText);
            
            // Only display if decryption was successful
            if (decryptedText) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const isCurrentUser = msg.username === this.username;
                
                messageElement.innerHTML = `
                    <span class="username" style="color: ${isCurrentUser ? '#2c7be5' : '#333'}">${msg.username}</span>
                    <span class="timestamp">${timestamp}</span>
                    <div class="message-content">${decryptedText}</div>
                `;
                
                if (isCurrentUser) {
                    messageElement.style.textAlign = 'right';
                    messageElement.style.marginLeft = 'auto';
                    messageElement.style.maxWidth = '70%';
                } else {
                    messageElement.style.textAlign = 'left';
                    messageElement.style.marginRight = 'auto';
                    messageElement.style.maxWidth = '70%';
                }
                
                messagesContainer.appendChild(messageElement);
            }
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', () => {
    chatApp.init();
});
