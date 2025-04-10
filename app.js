// Chat storage (single chat group)
let chatStorage = {
  messages: [],
  save: function() {
    localStorage.setItem('secureGroupChat', JSON.stringify(this.messages));
  },
  load: function() {
    const data = localStorage.getItem('secureGroupChat');
    if (datadata) {
      this.messages = JSON.parse(data) || [];
    }
  }
};

// Encryption/Decryption functions
const crypto = {
  encrypt: function(publicKeyPem, message) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encrypted = publicKey.encrypt(forge.util.encodeUtf8(message), 'RSA-OAEP');
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
      const decrypted = privateKey.decrypt(decoded, 'RSA-OAEP');
      return forge.util.decodeUtf8(decrypted);
    } catch (e) {
      console.error("Decryption error:", e);
      return null;
    }
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

    // Try to load saved keys if available
    if (localStorage.getItem('chatKeys')) {
      const savedKeys = JSON.parse(localStorage.getItem('chatKeys'));
      document.getElementById('publicKey').value = savedKeys.publicKey || '';
      document.getElementById('privateKey').value = savedKeys.privateKey || '';
      document.getElementById('username').value = savedKeys.username || '';
    }

    // Load messages
    chatStorage.load();
  },

  connect: function() {
    const publicKey = document.getElementById('publicKey').value.trim();
    const privateKey = document.getElementById('privateKey').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!publicKey || !privateKey || !username) {
      document.getElementById('loginError').textContent = 'All fields are required';
      return;
    }

    // Test if keys work
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

    // Save keys for future sessions
    localStorage.setItem('chatKeys', JSON.stringify({
      publicKey,
      privateKey,
      username
    }));

    // Show chat interface
    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';

    // Display messages
    this.displayMessages();

    // Poll for new messages
    setInterval(() => {
      const oldCount = chatStorage.messages.length;
      chatStorage.load();
      if (chatStorage.messages.length !== oldCount) {
        this.displayMessages();
      }
    }, 2000);
  },

  sendMessage: function() {
    if (!this.connected) return;

    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (!messageText) return;

    // Encrypt the message message
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

    chatStorage.messages.forEach(msg => {
      // Try to decrypt each message
      const decryptedText = crypto.decrypt(this.keys.privateKey, msg.encryptedText);
      
      // Only display if decryption was successful
      if (decryptedText) {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        
        messagesContainer.innerHTML += `
          <div class="message">
            <span class="username">${msg.username}</span>
            <span class="timestamp">${timestamp}</span>
            <div>${decryptedText}</div>
          </div>
        `;
      }
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
};

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', () => {
  chatApp.init();
});
