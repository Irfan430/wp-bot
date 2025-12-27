const commandHandler = require('./commandHandler');

async function handleMessage(m) {
  try {
    const body = m.message?.conversation || 
                 m.message?.extendedTextMessage?.text ||
                 m.message?.imageMessage?.caption ||
                 m.message?.videoMessage?.caption ||
                 '';
    
    const sender = m.key.participant || m.key.remoteJid;
    const threadID = m.key.remoteJid;
    const messageID = m.key.id;
    
    // Update user/thread cache
    if (!global.data.allUserID.has(sender)) {
      global.data.allUserID.add(sender);
    }
    
    if (threadID.includes('@g.us') && !global.data.allThreadID.has(threadID)) {
      global.data.allThreadID.add(threadID);
    }
    
    // Check if message is for bot
    const isMentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(global.client.user.id.split(':')[0] + '@s.whatsapp.net');
    const isGroup = threadID.includes('@g.us');
    
    // Process command
    await commandHandler({
      body,
      sender,
      threadID,
      messageID,
      isGroup,
      isMentioned,
      message: m
    });
    
  } catch (error) {
    global.logger.error('Message handler error:', error);
  }
}

module.exports = handleMessage;
