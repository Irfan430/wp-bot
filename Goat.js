const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const pino = require('pino');

// Initialize global objects
global.config = require('./config.json');
global.configCommands = require('./configCommands.json');
global.data = {
  allUserID: new Set(),
  allThreadID: new Set(),
  userData: new Map(),
  threadData: new Map(),
  cooldowns: new Map(),
  commandBanned: new Set(),
  threadBanned: new Set(),
  handleReply: new Map(),
  handleReaction: new Map(),
  commands: new Map(),
  events: new Map(),
  logger: null
};

// Load handlers
const messageHandler = require('./handlers/messageHandler');
const commandHandler = require('./handlers/commandHandler');
const replyHandler = require('./handlers/replyHandler');
const reactionHandler = require('./handlers/reactionHandler');
const eventHandler = require('./handlers/eventHandler');

// Load utils
const logger = require('./utils/logger');
const { initializeDatabase, saveDatabase } = require('./database');

class GoatBot {
  constructor() {
    this.version = global.config.bot.version;
    this.author = global.config.bot.author;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async initialize() {
    console.clear();
    this.printBanner();
    
    // Initialize logger
    global.data.logger = logger;
    
    // Initialize database
    await initializeDatabase();
    global.logger.info('Database initialized');
    
    // Load commands
    await this.loadCommands();
    global.logger.info(Loaded ${global.data.commands.size} commands);
    
    // Start WhatsApp connection
    await this.connectToWhatsApp();
  }

  printBanner() {
    const banner = `
╔═══════════════════════════════════════════╗
║                                           ║
║        🐐 G O A T B O T  F R A M E W O R K     ║
║                v${this.version}                        ║
║          Author: ${this.author}              ║
║                                           ║
╚═══════════════════════════════════════════╝
    `;
    console.log(banner);
  }

  async loadCommands() {
    const commandsDir = path.join(__dirname, 'scripts', 'cmds');
    
    try {
      const files = await fs.readdir(commandsDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          try {
            const command = require(path.join(commandsDir, file));
            
            if (command.config && command.config.name) {
              global.data.commands.set(command.config.name.toLowerCase(), command);
              
              // Register aliases
              if (Array.isArray(command.config.aliases)) {
                command.config.aliases.forEach(alias => {
                  global.data.commands.set(alias.toLowerCase(), command);
                });
              }
            }
          } catch (err) {
            global.logger.error(Failed to load command ${file}:, err);
          }
        }
      }
    } catch (err) {
      global.logger.error('Failed to read commands directory:', err);
    }
  }

  async connectToWhatsApp() {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      global.logger.info(Using Baileys v${version.join('.')} ${isLatest ? '(latest)' : ''});
      
      const { state, saveCreds } = await useMultiFileAuthState('./auth/session');
      
      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // QR disabled as requested
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false,
        getMessage: async (key) => {
          return {
            conversation: "Message not found"
          };
        }
      });

      global.client = {
        ...sock,
        authState: state,
        saveCreds,
        version,
        runtime: {
          startTime: Date.now(),
          commandsExecuted: 0,
          messagesProcessed: 0
        }
      };

      this.setupEventHandlers();
      
      // Request pairing code
      await this.requestPairingCode();
      
    } catch (error) {
      global.logger.error('Connection error:', error);
      await this.handleReconnect();
    }
  }

  async requestPairingCode() {
    if (!global.client) return;
    
    // Generate and display pairing code
    const code = await global.client.requestPairingCode(global.config.owners.master[0].split('@')[0]);
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('🔐 PAIRING CODE REQUIRED');
    console.log('═══════════════════════════════════════════════');
    console.log(Code: ${code});
    console.log('═══════════════════════════════════════════════');
    console.log('Instructions:');
    console.log('1. Open WhatsApp on your phone');
    console.log('2. Go to Settings → Linked Devices → Link a Device');
    console.log(3. Enter this code: ${code});
    console.log('4. Wait for connection...');
    console.log('═══════════════════════════════════════════════\n');
    
    global.logger.info(Pairing code generated: ${code});
  }

  setupEventHandlers() {
    global.client.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        global.logger.warn('QR code received but pairing code is required');
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        global.logger.warn(Connection closed: ${statusCode || 'Unknown'});
        
        if (statusCode !== DisconnectReason.loggedOut) {
          this.handleReconnect();
        } else {
          global.logger.error('Logged out, please restart bot');
          process.exit(1);
        }
      }
      
      if (connection === 'open') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        global.logger.success('✓ Connected to WhatsApp');
        this.printConnectionInfo();
      }
    });

    // Message handler
    global.client.ev.on('messages.upsert', async (message) => {
      try {
        const m = message.messages[0];
        if (!m.message || m.key.fromMe) return;
        
        global.data.runtime.messagesProcessed++;
        
        // Check if it's a reply
        if (global.data.handleReply.has(m.key.remoteJid)) {
          await replyHandler(m);
          return;
        }
        
        // Regular message handling
        await messageHandler(m);
      } catch (error) {
        global.logger.error('Message processing error:', error);
      }
    });

    // Reaction handler
    global.client.ev.on('messages.reaction', async (reaction) => {
      try {
        if (global.data.handleReaction.has(reaction.key.remoteJid)) {
          await reactionHandler(reaction);
        }
      } catch (error) {
        global.logger.error('Reaction processing error:', error);
      }
    });

    // Event handler
    global.client.ev.on('group-participants.update', eventHandler.handleParticipantsUpdate);
    global.client.ev.on('groups.update', eventHandler.handleGroupsUpdate);
    global.client.ev.on('messages.delete', eventHandler.handleMessageDelete);

    // Creds update
    global.client.ev.on('creds.update', global.client.saveCreds);
  }

  printConnectionInfo() {
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ BOT IS READY');
    console.log('═══════════════════════════════════════════════');
    console.log(Bot Name: ${global.config.bot.name});
    console.log(Version: ${global.config.bot.version});
    console.log(Author: ${global.config.bot.author});
    console.log(Prefix: ${global.config.prefix.global});
    console.log(Commands: ${global.data.commands.size});
    console.log(Users: ${global.data.allUserID.size});
    console.log(Threads: ${global.data.allThreadID.size});
    console.log('═══════════════════════════════════════════════\n');
  }

  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      global.logger.error('Max reconnection attempts reached');
      process.exit(1);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    global.logger.warn(Reconnecting in ${delay/1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}));
    
    setTimeout(async () => {
      try {
        await this.connectToWhatsApp();
      } catch (error) {
        global.logger.error('Reconnection failed:', error);
      }
    }, delay);
  }

  // Graceful shutdown
  async shutdown() {
    global.logger.info('Shutting down...');
    
    // Save database
    await saveDatabase();
    
    // Clear intervals
    clearInterval(this.saveInterval);
    
    // Logout if connected
    if (global.client && this.isConnected) {
      await global.client.logout();
    }
    
    process.exit(0);
  }
}

// Handle process events
process.on('SIGINT', () => new GoatBot().shutdown());
process.on('SIGTERM', () => new GoatBot().shutdown());
process.on('uncaughtException', (error) => {
  global.logger?.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  global.logger?.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
const bot = new GoatBot();
bot.initialize().catch(console.error);
