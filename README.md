```markdown
# 🐐 GoatBot Framework - Advanced WhatsApp Bot System

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![License](https://img.shields.io/badge/license-MIT-yellow)
![Author](https://img.shields.io/badge/author-IRFAN-red)

A production-grade WhatsApp bot framework built with Baileys library, featuring pairing code authentication, multi-language support, database persistence, and modular command system.

## 📋 Features

### 🔐 Authentication
- **Pairing Code Login** (No QR codes)
- Session persistence & auto-reconnect
- Multi-device support
- Secure credential storage

### 🏗️ Architecture
- Modular and scalable design
- Global state management
- Event-driven architecture
- Plugin-based command system

### 💾 Database
- JSON-based persistent storage
- Auto-save with backup system
- User & thread data management
- Cache layer for performance

### ⚙️ Configuration
- Centralized config files
- Per-thread settings
- Multi-language support (EN, BN)
- Role-based permissions

### 🔧 Command System
- Prefix-based command parsing
- Cooldown management
- Ban system (user/thread/command)
- Reply & reaction handlers
- Alias support

### 🛡️ Security
- Anti-spam protection
- Anti-flood measures
- Permission validation
- Input sanitization

## 📁 Project Structure

```

goatbot-framework/
├── Goat.js                 # Main entry point
├── package.json            # Dependencies
├── config.json             # Bot configuration
├── configCommands.json     # Command configuration
│
├── auth/
│   └── session.json        # WhatsApp session data
│
├── scripts/
│   └── cmds/               # Command modules
│       ├── ping.js
│       ├── help.js
│       └── *.js
│
├── handlers/               # Event handlers
│   ├── messageHandler.js
│   ├── commandHandler.js
│   ├── replyHandler.js
│   ├── reactionHandler.js
│   └── eventHandler.js
│
├── database/               # Database system
│   ├── index.js
│   ├── users.json
│   ├── threads.json
│   ├── settings.json
│   ├── bans.json
│   └── cache.json
│
├── utils/                  # Utilities
│   ├── getLang.js
│   ├── logger.js
│   ├── permission.js
│   ├── prefix.js
│   └── cooldown.js
│
└── languages/              # Language files
├── en.json
└── bn.json

```

## 🚀 Installation

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn
- WhatsApp account

### Steps

1. **Clone/Download the repository**
```bash
git clone <repository-url>
cd goatbot-framework
```

1. Install dependencies

```bash
npm install
# or
yarn install
```

1. Configure the bot
   Edit config.json with your settings:

```json
{
  "owners": {
    "ownerUID": ["923xxxxxxxxxx@s.whatsapp.net"],
    "adminUID": ["923xxxxxxxxxx@s.whatsapp.net"]
  }
}
```

1. Start the bot

```bash
npm start
# or for development
npm run dev
```

1. Pair your WhatsApp

· The terminal will show a pairing code
· Open WhatsApp on your phone
· Go to: Settings → Linked Devices → Link a Device
· Enter the pairing code

⚙️ Configuration Guide

config.json

```json
{
  "bot": {
    "name": "GoatBot",
    "version": "3.0.0",
    "author": "IRFAN"
  },
  "prefix": {
    "global": "!",
    "allowNoPrefix": false
  },
  "language": {
    "default": "en",
    "fallback": "en"
  },
  "features": {
    "autoRead": true,
    "antiSpam": true,
    "allowPM": true,
    "allowGroup": true
  }
}
```

configCommands.json

```json
{
  "defaultCooldown": 3,
  "disable": {
    "global": [],
    "perThread": {}
  },
  "roles": {
    "0": "user",
    "1": "admin",
    "2": "botAdmin",
    "3": "owner"
  }
}
```

📖 Creating Commands

Create new command files in scripts/cmds/:

Example: scripts/cmds/ping.js

```javascript
module.exports = {
  config: {
    name: "ping",
    aliases: ["p", "test"],
    version: "1.0.0",
    author: "IRFAN",
    countDown: 5,
    role: 0,
    description: "Check bot response time",
    category: "utility",
    guide: "{p}ping"
  },

  langs: {
    en: {
      ping: "🏓 Pong!",
      latency: "⏱️ Latency: {latency}ms"
    },
    bn: {
      ping: "🏓 পং!",
      latency: "⏱️ লেটেন্সি: {latency}ms"
    }
  },

  onStart: async function ({ message, getLang }) {
    const startTime = Date.now();
    const latency = Date.now() - startTime;
    
    await message.reply(
      getLang("ping") + "\n" +
      getLang("latency", { latency })
    );
  },

  onReply: async function({ message, Reply, getLang }) {
    // Handle replies to this command
  },

  onReaction: async function({ message, Reaction, getLang }) {
    // Handle reactions to this command
  }
};
```

Command Properties

Property Type Description
name string Command name (required)
aliases array Alternative names
version string Command version
author string Command author
countDown number Cooldown in seconds
role number Required role (0-3)
category string Command category
guide string Usage guide

Available Roles

· 0: User (Everyone)
· 1: Admin (Group admins)
· 2: Bot Admin (Bot administrators)
· 3: Owner (Bot owner)

🌐 Language System

Adding New Language

1. Create languages/xx.json (xx = language code)
2. Add translations:

```json
{
  "ping": "Pong!",
  "help": "Help Menu",
  "permissionDenied": "You don't have permission"
}
```

1. Update command language files

Using Languages in Commands

```javascript
getLang("key", { variable: "value" })
// Returns translation with variables replaced
```

🗄️ Database API

User Management

```javascript
// Get user data
const user = await global.db.getUser(userID);

// Update user
await global.db.updateUser(userID, {
  data: { money: 1000 },
  language: "bn"
});

// Ban user
await global.db.banUser(userID, "Spamming", 24 * 60 * 60 * 1000);
```

Thread Management

```javascript
// Get thread data
const thread = await global.db.getThread(threadID);

// Update thread settings
await global.db.updateThread(threadID, {
  prefix: ".",
  language: "en",
  settings: { nsfw: true }
});
```

🔌 Event Handlers

Message Events

· messages.upsert - New messages
· messages.delete - Deleted messages
· messages.reaction - Message reactions

Group Events

· group-participants.update - Join/Leave/Admin changes
· groups.update - Group info changes

🛠️ Utilities

Logger

```javascript
global.logger.info("Info message");
global.logger.success("Success message");
global.logger.warn("Warning message");
global.logger.error("Error message");
```

Permissions

```javascript
const hasPerm = await checkPermission(userID, requiredRole, threadID);
```

Cooldowns

```javascript
const cooldown = await checkCooldown(key, duration);
if (cooldown.isOnCooldown) {
  // Handle cooldown
}
```

🚨 Security Features

Anti-Spam

· Rate limiting per user
· Configurable thresholds
· Warning system

Anti-Flood

· Message flood detection
· Automatic cooldowns
· User-based restrictions

Input Validation

· Command length limits
· Argument sanitization
· Safe database operations

🔄 Auto-Reconnect

The bot automatically reconnects on disconnect:

· Exponential backoff retry
· Max 10 reconnection attempts
· Session persistence
· Graceful error handling

📊 Monitoring

Runtime Statistics

· Commands executed
· Messages processed
· Active users/threads
· Uptime tracking

Database Statistics

· Total users/threads
· Database size
· Backup status

🚫 Troubleshooting

Common Issues

1. Pairing Code Not Working
   · Ensure WhatsApp is updated
   · Check internet connection
   · Verify phone number in config
2. Bot Not Responding
   · Check if session is valid
   · Verify command prefix
   · Check user permissions
3. Database Errors
   · Check file permissions
   · Verify JSON format
   · Restore from backup

Debug Mode

Enable detailed logging in config.json:

```json
{
  "logging": {
    "level": "debug",
    "saveToFile": true
  }
}
```

📚 API Reference

Global Objects

Object Description
global.client Baileys socket + runtime data
global.config Bot configuration
global.configCommands Command configuration
global.db Database instance
global.data Runtime cache
global.logger Logger instance

Message Object

```javascript
{
  reply(content, options) // Reply to message
  send(content, options)  // Send message
  react(emoji)            // Add reaction
}
```

🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

Code Style

· Use async/await
· Add error handling
· Include comments
· Follow existing patterns

📄 License

MIT License - See LICENSE file for details

👤 Author

IRFAN

· Framework creator
· WhatsApp bot specialist
· Open source contributor

🌟 Credits

· Baileys - WhatsApp Web Library
· Node.js community
· All contributors

📞 Support

For issues and feature requests:

1. Check existing issues
2. Create new issue
3. Provide detailed information

---

⚠️ Disclaimer: This framework is for educational purposes. Use responsibly and in compliance with WhatsApp's Terms of Service. The authors are not responsible for misuse.

---

<div align="center">
  <p>Made with ❤️ by IRFAN</p>
  <p>If you find this useful, consider giving it a ⭐</p>
</div>