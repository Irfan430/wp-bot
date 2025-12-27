const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor() {
    this.path = global.config.database.path;
    this.data = {
      users: {},
      threads: {},
      settings: {},
      bans: {},
      cache: {}
    };
    this.saveInterval = null;
  }

  async initialize() {
    try {
      // Ensure directory exists
      await fs.mkdir(this.path, { recursive: true });
      
      // Load or create database files
      await this.loadFile('users.json');
      await this.loadFile('threads.json');
      await this.loadFile('settings.json');
      await this.loadFile('bans.json');
      await this.loadFile('cache.json');
      
      // Setup auto-save
      if (global.config.database.autoSave) {
        this.saveInterval = setInterval(() => this.saveAll(), global.config.database.saveInterval);
      }
      
      global.logger.info('Database initialized successfully');
    } catch (error) {
      global.logger.error('Database initialization error:', error);
      // Create fresh database
      await this.createFreshDatabase();
    }
  }

  async loadFile(filename) {
    const filePath = path.join(this.path, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const key = filename.replace('.json', '');
      this.data[key] = JSON.parse(data);
      
      // Populate caches
      if (key === 'users') {
        Object.keys(this.data.users).forEach(userID => {
          global.data.allUserID.add(userID);
          global.data.userData.set(userID, this.data.users[userID]);
        });
      }
      
      if (key === 'threads') {
        Object.keys(this.data.threads).forEach(threadID => {
          global.data.allThreadID.add(threadID);
          global.data.threadData.set(threadID, this.data.threads[threadID]);
        });
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it
        await this.saveFile(filename, {});
      } else {
        throw error;
      }
    }
  }

  async saveFile(filename, data) {
    const filePath = path.join(this.path, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async saveAll() {
    try {
      await this.saveFile('users.json', this.data.users);
      await this.saveFile('threads.json', this.data.threads);
      await this.saveFile('settings.json', this.data.settings);
      await this.saveFile('bans.json', this.data.bans);
      await this.saveFile('cache.json', this.data.cache);
      
      if (global.config.logging.saveToFile) {
        global.logger.debug('Database saved');
      }
    } catch (error) {
      global.logger.error('Database save error:', error);
    }
  }

  async createFreshDatabase() {
    this.data = {
      users: {},
      threads: {},
      settings: {
        version: global.config.bot.version,
        initialized: new Date().toISOString(),
        stats: {
          totalUsers: 0,
          totalThreads: 0,
          totalCommands: 0
        }
      },
      bans: {
        users: [],
        threads: [],
        commands: []
      },
      cache: {}
    };
    
    await this.saveAll();
  }

  // User methods
  async getUser(userID, createIfNotExists = true) {
    if (!this.data.users[userID] && createIfNotExists) {
      this.data.users[userID] = this.createUserTemplate(userID);
      global.data.allUserID.add(userID);
      global.data.userData.set(userID, this.data.users[userID]);
    }
    
    return this.data.users[userID] || null;
  }

  createUserTemplate(userID) {
    return {
      id: userID,
      name: userID.split('@')[0],
      registered: new Date().toISOString(),
      language: global.config.language.default,
      settings: {
        autoRead: global.config.features.autoRead,
        nsfw: false
      },
      data: {
        exp: 0,
        level: 1,
        money: 100,
        daily: null,
        commandsUsed: 0
      },
      timestamps: {
        lastSeen: new Date().toISOString(),
        lastMessage: new Date().toISOString()
      },
      bans: {
        isBanned: false,
        reason: null,
        expires: null
      }
    };
  }

  async updateUser(userID, data) {
    const user = await this.getUser(userID);
    if (!user) return null;
    
    Object.assign(user, data);
    this.data.users[userID] = user;
    global.data.userData.set(userID, user);
    
    return user;
  }

  // Thread methods
  async getThread(threadID, createIfNotExists = true) {
    if (!threadID.includes('@g.us')) return null;
    
    if (!this.data.threads[threadID] && createIfNotExists) {
      this.data.threads[threadID] = this.createThreadTemplate(threadID);
      global.data.allThreadID.add(threadID);
      global.data.threadData.set(threadID, this.data.threads[threadID]);
    }
    
    return this.data.threads[threadID] || null;
  }

  createThreadTemplate(threadID) {
    return {
      id: threadID,
      name: threadID,
      prefix: global.config.prefix.global,
      language: global.config.language.default,
      settings: {
        nsfw: global.config.features.allowNSFW,
        antiSpam: true,
        welcome: true,
        goodbye: true,
        autoKick: false
      },
      data: {
        members: [],
        admins: [],
        createdAt: new Date().toISOString(),
        totalMessages: 0,
        commandsUsed: 0
      },
      bans: {
        isBanned: false,
        reason: null
      },
      disabledCommands: []
    };
  }

  async updateThread(threadID, data) {
    const thread = await this.getThread(threadID);
    if (!thread) return null;
    
    Object.assign(thread, data);
    this.data.threads[threadID] = thread;
    global.data.threadData.set(threadID, thread);
    
    return thread;
  }

  // Ban methods
  async banUser(userID, reason = 'No reason provided', duration = null) {
    const ban = {
      userID,
      reason,
      timestamp: new Date().toISOString(),
      duration,
      expires: duration ? new Date(Date.now() + duration).toISOString() : null
    };
    
    this.data.bans.users.push(ban);
    global.data.commandBanned.add(userID);
    
    const user = await this.getUser(userID);
    if (user) {
      user.bans.isBanned = true;
      user.bans.reason = reason;
      user.bans.expires = ban.expires;
    }
    
    return ban;
  }

  async unbanUser(userID) {
    this.data.bans.users = this.data.bans.users.filter(ban => ban.userID !== userID);
    global.data.commandBanned.delete(userID);
    
    const user = await this.getUser(userID);
    if (user) {
      user.bans.isBanned = false;
      user.bans.reason = null;
      user.bans.expires = null;
    }
    
    return true;
  }

  // Statistics
  async getStats() {
    return {
      totalUsers: Object.keys(this.data.users).length,
      totalThreads: Object.keys(this.data.threads).length,
      totalBans: this.data.bans.users.length + this.data.bans.threads.length,
      databaseSize: Buffer.byteLength(JSON.stringify(this.data))
    };
  }

  // Backup
  async createBackup() {
    const backupDir = path.join(this.path, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const backupName = backup_${Date.now()}.json;
    const backupPath = path.join(backupDir, backupName);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: global.config.bot.version,
      data: this.data
    };
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    
    // Clean old backups (keep last 10)
    const files = await fs.readdir(backupDir);
    if (files.length > 10) {
      const sorted = files.sort();
      for (let i = 0; i < files.length - 10; i++) {
        await fs.unlink(path.join(backupDir, sorted[i]));
      }
    }
    
    return backupPath;
  }
}

// Initialize and export
const db = new Database();

async function initializeDatabase() {
  await db.initialize();
  global.db = db;
}

async function saveDatabase() {
  await db.saveAll();
}

module.exports = {
  initializeDatabase,
  saveDatabase,
  db
};
