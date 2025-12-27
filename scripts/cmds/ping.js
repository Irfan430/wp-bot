module.exports = {
  config: {
    name: "ping",
    aliases: ["p", "test"],
    version: "1.0.0",
    author: "IRFAN",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Check bot response time",
      bn: "বটের প্রতিক্রিয়া সময় পরীক্ষা করুন"
    },
    longDescription: {
      en: "Check bot's latency and response time",
      bn: "বটের লেটেন্সি এবং প্রতিক্রিয়া সময় পরীক্ষা করুন"
    },
    category: "utility",
    guide: {
      en: "{p}ping",
      bn: "{p}ping"
    }
  },

  langs: {
    en: {
      ping: "🏓 Pong!",
      latency: "⏱️ Latency: {latency}ms",
      uptime: "⏰ Uptime: {uptime}",
      memory: "💾 Memory: {memory}",
      users: "👥 Users: {users}",
      threads: "💬 Threads: {threads}"
    },
    bn: {
      ping: "🏓 পং!",
      latency: "⏱️ লেটেন্সি: {latency}ms",
      uptime: "⏰ আপটাইম: {uptime}",
      memory: "💾 মেমরি: {memory}",
      users: "👥 ব্যবহারকারী: {users}",
      threads: "💬 থ্রেড: {threads}"
    }
  },

  onStart: async function ({ message, event, getLang, userData, threadData, api }) {
    try {
      const startTime = Date.now();
      
      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      const uptimeStr = ${days}d ${hours}h ${minutes}m ${seconds}s;
      
      // Get memory usage
      const memory = process.memoryUsage();
      const memoryUsage = Math.round(memory.heapUsed / 1024 / 1024);
      
      // Calculate latency
      const latency = Date.now() - startTime;
      
      // Prepare response
      const response = [
        getLang("ping"),
        "",
        getLang("latency", { latency }),
        getLang("uptime", { uptime: uptimeStr }),
        getLang("memory", { memory: memoryUsage + "MB" }),
        getLang("users", { users: global.data.allUserID.size }),
        getLang("threads", { threads: global.data.allThreadID.size }),
        "",
        ⚡ Powered by ${global.config.bot.name} v${global.config.bot.version},
        👤 Author: ${global.config.bot.author}
      ].join("\n");
      
      await message.reply(response);
      
    } catch (error) {
      console.error(error);
      await message.reply(getLang("error"));
    }
  },

  onReply: async function({ message, Reply, getLang }) {
    // Handle reply if needed
  },

  onReaction: async function({ message, Reaction, getLang }) {
    // Handle reaction if needed
  }
