const path = require('path');
const { getLang } = require('../utils/getLang');
const { checkPermission } = require('../utils/permission');
const { checkCooldown } = require('../utils/cooldown');
const { getPrefix } = require('../utils/prefix');

async function handleCommand({
  body,
  sender,
  threadID,
  messageID,
  isGroup,
  isMentioned,
  message
}) {
  try {
    // Anti-spam check
    if (global.config.features.antiSpam.enabled) {
      const spamKey = ${sender}:${threadID};
      const now = Date.now();
      
      if (!global.data.spamCache) global.data.spamCache = new Map();
      if (!global.data.spamCache.has(spamKey)) {
        global.data.spamCache.set(spamKey, []);
      }
      
      const messages = global.data.spamCache.get(spamKey);
      messages.push(now);
      
      // Remove old messages
      const timeframe = global.config.features.antiSpam.timeframe;
      const recent = messages.filter(time => now - time < timeframe);
      global.data.spamCache.set(spamKey, recent);
      
      if (recent.length > global.config.features.antiSpam.maxMessages) {
        if (global.config.features.antiSpam.action === 'warn') {
          await global.client.sendMessage(threadID, {
            text: ⚠️ Please slow down! You're sending too many messages.
          }, { quoted: message });
        }
        return;
      }
    }
    
    // Get prefix
    const prefix = await getPrefix(threadID);
    const mentionPrefix = @${global.client.user.id.split(':')[0]};
    
    let commandName = '';
    let args = [];
    
    // Check for prefix
    if (body.startsWith(prefix)) {
      commandName = body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
      args = body.slice(prefix.length + commandName.length).trim().split(/\s+/).filter(arg => arg);
    } 
    // Check for mention prefix
    else if (global.config.prefix.mentionAsPrefix && body.startsWith(mentionPrefix)) {
      commandName = body.slice(mentionPrefix.length).trim().split(/\s+/)[0].toLowerCase();
      args = body.slice(mentionPrefix.length + commandName.length).trim().split(/\s+/).filter(arg => arg);
    }
    // Check for no prefix (if allowed)
    else if (global.config.prefix.allowNoPrefix && body.split(/\s+/)[0].toLowerCase() in Array.from(global.data.commands.keys())) {
      commandName = body.split(/\s+/)[0].toLowerCase();
      args = body.slice(commandName.length).trim().split(/\s+/).filter(arg => arg);
    } else {
      return; // No valid command prefix found
    }
    
    // Find command
    const command = global.data.commands.get(commandName);
    if (!command) return;
    
    // Check if command is disabled globally
    if (global.configCommands.disable.global.includes(command.config.name)) {
      return;
    }
    
    // Check if command is disabled in this thread
    const threadDisable = global.configCommands.disable.perThread[threadID] || [];
    if (threadDisable.includes(command.config.name)) {
      return;
    }
    
    // Check bans
    if (global.data.commandBanned.has(sender) || global.data.threadBanned.has(threadID)) {
      return;
    }
    
    // Permission check
    const hasPermission = await checkPermission(sender, command.config.role, threadID);
    if (!hasPermission) {
      const permMsg = await getLang(threadID, sender, 'permissionDenied');
      await global.client.sendMessage(threadID, {
        text: permMsg || ⚠️ You don't have permission to use this command.
      }, { quoted: message });
      return;
    }
    
    // Cooldown check
    const cooldownKey = ${sender}:${command.config.name};
    const cooldownResult = await checkCooldown(cooldownKey, command.config.countDown || global.configCommands.defaultCooldown);
    
    if (cooldownResult.isOnCooldown) {
      const timeLeft = Math.ceil(cooldownResult.timeLeft / 1000);
      const cooldownMsg = await getLang(threadID, sender, 'cooldown', { time: timeLeft });
      await global.client.sendMessage(threadID, {
        text: cooldownMsg || ⏳ Please wait ${timeLeft} seconds before using this command again.
      }, { quoted: message });
      return;
    }
    
    // Load user and thread data
    const userData = global.data.userData.get(sender) || await global.db.getUser(sender);
    const threadData = global.data.threadData.get(threadID) || await global.db.getThread(threadID);
    
    // Update cache
    global.data.userData.set(sender, userData);
    global.data.threadData.set(threadID, threadData);
    
    // Prepare message object
    const messageObj = {
      reply: async (content, options = {}) => {
        return await global.client.sendMessage(threadID, content, {
          quoted: message,
          ...options
        });
      },
      send: async (content, options = {}) => {
        return await global.client.sendMessage(threadID, content, options);
      },
      react: async (emoji) => {
        return await global.client.sendMessage(threadID, {
          react: {
            text: emoji,
            key: message.key
          }
        });
      }
    };
    
    // Execute command
    try {
      await command.onStart({
        message: messageObj,
        args,
        event: message,
        userData,
        threadData,
        getLang: (key, variables) => getLang(threadID, sender, key, variables),
        api: global.client,
        globalData: global.data
      });
      
      // Update runtime stats
      global.data.runtime.commandsExecuted++;
      
    } catch (error) {
      global.logger.error(Command ${command.config.name} error:, error);
      
      const errorMsg = await getLang(threadID, sender, 'commandError');
      await messageObj.reply({
        text: errorMsg || ❌ An error occurred while executing the command: ${error.message}
      });
    }
    
  } catch (error) {
    global.logger.error('Command handler error:', error);
  }
}

module.exports = handleCommand;
