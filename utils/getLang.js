const fs = require('fs').promises;
const path = require('path');

let languages = {};

async function loadLanguages() {
  try {
    const langDir = path.join(__dirname, '../languages');
    const files = await fs.readdir(langDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const langCode = file.replace('.json', '');
        const content = await fs.readFile(path.join(langDir, file), 'utf8');
        languages[langCode] = JSON.parse(content);
      }
    }
    
    global.logger.info(Loaded ${Object.keys(languages).length} languages);
  } catch (error) {
    global.logger.error('Failed to load languages:', error);
  }
}

function getLang(threadID, userID, key, variables = {}) {
  try {
    // Get language preference
    let langCode = global.config.language.default;
    
    // Check thread language
    const threadData = global.data.threadData.get(threadID);
    if (threadData && threadData.language && global.config.language.allowPerThread) {
      langCode = threadData.language;
    }
    
    // Check user language
    const userData = global.data.userData.get(userID);
    if (userData && userData.language && global.config.language.allowPerUser) {
      langCode = userData.language;
    }
    
    // Get translation
    let translation = languages[langCode]?.[key];
    
    // Fallback to default language
    if (!translation && langCode !== global.config.language.default) {
      translation = languages[global.config.language.default]?.[key];
    }
    
    // Fallback to English
    if (!translation && global.config.language.default !== 'en') {
      translation = languages.en?.[key];
    }
    
    // Replace variables
    if (translation && typeof translation === 'string') {
      Object.keys(variables).forEach(varKey => {
        translation = translation.replace(new RegExp({${varKey}}, 'g'), variables[varKey]);
      });
    }
    
    return translation || key;
  } catch (error) {
    global.logger.error('Language get error:', error);
    return key;
  }
}

// Load languages on startup
loadLanguages();

module.exports = { getLang, loadLanguages };
