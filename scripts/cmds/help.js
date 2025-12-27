module.exports = {
  config: {
    name: "help",
    aliases: ["h", "cmd", "commands"],
    version: "1.0.0",
    author: "IRFAN",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Show all commands",
      bn: "সব কমান্ড দেখান"
    },
    longDescription: {
      en: "Show list of all commands or specific command info",
      bn: "সব কমান্ডের তালিকা বা নির্দিষ্ট কমান্ডের তথ্য দেখান"
    },
    category: "utility",
    guide: {
      en: "{p}help [command name]",
      bn: "{p}help [কমান্ড নাম]"
    }
  },

  langs: {
    en: {
      helpTitle: "📚 Available Commands",
      helpFooter: "Use {p}help [command] for more info\nTotal commands: {total}",
      categoryTitle: "📂 Category: {category}",
      commandInfo: "📝 Command Info",
      name: "📛 Name",
      aliases: "🔤 Aliases",
      version: "🔢 Version",
      author: "👤 Author",
      role: "🔐 Role",
      cooldown: "⏱️ Cooldown",
      category: "📁 Category",
      usage: "📋 Usage",
      description: "📄 Description",
      notFound: "❌ Command not found",
      noDescription: "No description available"
    },
    bn: {
      helpTitle: "📚 উপলব্ধ কমান্ডসমূহ",
      helpFooter: "আরও তথ্যের জন্য {p}help [কমান্ড] ব্যবহার করুন\nমোট কমান্ড: {total}",
      categoryTitle: "📂 ক্যাটাগরি: {category}",
      commandInfo: "📝 কমান্ড তথ্য",
      name: "📛 নাম",
      aliases: "🔤 উপনাম",
      version: "🔢 সংস্করণ",
      author: "👤 লেখক",
      role: "🔐 ভূমিকা",
      cooldown: "⏱️ কুলডাউন",
      category: "📁 ক্যাটাগরি",
      usage: "📋 ব্যবহার",
      description: "📄 বর্ণনা",
      notFound: "❌ কমান্ড পাওয়া যায়নি",
      noDescription: "কোন বর্ণনা নেই"
    }
  },

  onStart: async function ({ message, args, getLang, threadData }) {
    try {
      const prefix = threadData?.prefix || global.config.prefix.global;
      
      if (args[0]) {
        // Show specific command help
        const cmdName = args[0].toLowerCase();
        const command = global.data.commands.get(cmdName);
        
        if (!command) {
          return message.reply(getLang("notFound"));
        }
        
        const config = command.config;
        
        const helpText = [
          📝 ${getLang("commandInfo")},
          "",
          ${getLang("name")}: ${config.name},
          ${getLang("aliases")}: ${config.aliases?.join(", ") || "None"},
          ${getLang("version")}: ${config.version},
          ${getLang("author")}: ${config.author},
          ${getLang("role")}: ${global.configCommands.roles[config.role] || config.role},
          ${getLang("cooldown")}: ${config.countDown || global.configCommands.defaultCooldown}s,
          ${getLang("category")}: ${config.category || "Uncategorized"},
          ${getLang("usage")}: ${(config.guide?.en || "").replace(/\{p\}/g, prefix)},
          "",
          ${getLang("description")}:,
          config.longDescription?.en || config.shortDescription?.en || getLang("noDescription")
        ].join("\n");
        
        await message.reply(helpText);
      } else {
        // Show all commands categorized
        const categories = {};
        
        // Group commands by category
        for (const [name, cmd] of global.data.commands.entries()) {
          // Skip aliases
          if (name !== cmd.config.name.toLowerCase()) continue;
          
          const category = cmd.config.category || "Uncategorized";
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push(cmd.config.name);
        }
        
        let helpText = ${getLang("helpTitle")}\n\n;
        
        for (const [category, commands] of Object.entries(categories)) {
          const categoryName = global.configCommands.categories[category] || category;
          helpText += 📂 ${categoryName}\n;
          helpText += ➤ ${commands.sort().join(", ")}\n\n;
        }
        
        helpText += getLang("helpFooter", {
          p: prefix,
          total: Array.from(global.data.commands.keys()).filter(name => {
            const cmd = global.data.commands.get(name);
            return name === cmd.config.name.toLowerCase();
          }).length
        });
        
        await message.reply(helpText);
      }
    } catch (error) {
      console.error(error);
      await message.reply("❌ An error occurred while showing help");
    }
  }
