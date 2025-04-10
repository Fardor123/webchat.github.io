// Chat application with end-to-end encryption
class SecureChat {
    constructor() {
        this.cryptoKey = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.messages = [];
        
        // DOM elements
        this.setupDiv = document.getElementById('setup');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatDiv = document.getElementById('chat');
        this.passwordInput = document.getElementById('chatPassword');
        this.connectBtn = document.getElementById('connect');
        this.messageInput = document.getElementById('message');
        this.sendBtn = document.getElementById('send');
        
        // Event listeners
        this.connectBtn.addEventListener('click', () => this.initializeChat());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }
    
    async initializeChat() {
        const password = this.passwordInput.value;
        if (!password) {
            alert('Please enter a password');
            return;
        }
        
        try {
            // Derive encryption key from password
            this.cryptoKey = await this.deriveKeyFromPassword(password);
            
            // Show chat interface
            this.setupDiv.style.display = 'none';
            this.chatContainer.style.display = 'block';
            
            // In a real app, you'd establish WebRTC connection here
            // For this demo, we'll simulate local chat with encryption
            
            this.addSystemMessage('Chat connected. Messages are end-to-end encrypted.');
        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Failed to initialize chat');
        }
    }
    
    async deriveKeyFromPassword(password) {
        // Convert password to ArrayBuffer
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Import password as raw key material
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        // Derive encryption key using PBKDF2
        const salt = encoder.encode('StaticSaltForDemo'); // In real app, use random salt
        const iterations = 100000;
        
        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    async encryptMessage(message) {
        const encoder = new TextEncoder();
        const messageBuffer = encoder.encode(message);
        
        // Generate IV (Initialization Vector)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the message
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            this.cryptoKey,
            messageBuffer
        );
        
        // Combine IV and ciphertext for storage/transmission
        const encryptedMessage = new Uint8Array(iv.length + ciphertext.byteLength);
        encryptedMessage.set(iv, 0);
        encryptedMessage.set(new Uint8Array(ciphertext), iv.length);
        
        return encryptedMessage;
    }
    
    async decryptMessage(encryptedMessage) {
        // Split IV and ciphertext
        const iv = encryptedMessage.slice(0, 12);
        const ciphertext = encryptedMessage.slice(12);
        
        // Decrypt the message
        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.cryptoKey,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Failed to decrypt message]';
        }
    }
    
    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (!messageText) return;
        
        try {
            // Encrypt the message
            const encrypted = await this.encryptMessage(messageText);
            
            // In a real app, you'd send the encrypted message to peers
            // For this demo, we'll just display it locally
            
            // Store message locally (simulating sending)
            this.messages.push({
                encrypted: encrypted,
                sent: true,
                timestamp: new Date()
            });
            
            // Display the sent message
            this.displayMessage(messageText, true);
            
            // Clear input
            this.messageInput.value = '';
            
            // Simulate receiving the message (in real app, this would come from peers)
            setTimeout(async () => {
                const decrypted = await this this.decryptMessage(encrypted);
                this.displayMessage(decrypted, false);
            }, 500);
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    }
    
    displayMessage(text, isSent) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const timestamp = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `<strong>${isSent ? 'You' : 'Friend'}</strong> (${timestamp}): ${text}`;
        
        this.chatDiv.appendChild(messageDiv);
        this.chatDiv.scrollTop = this.chatDiv.scrollHeight;
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.style.fontStyle = 'italic';
        messageDiv.style.color = '#666';
        messageDiv.textContent = text;
        
        this.chatDiv.appendChild(messageDiv);
        this.chatDiv.scrollTop = this.chatDiv.scrollHeight;
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SecureChat();
});
