# Complete Setup Guide - AI Minecraft Bot v3.0.0

This guide will help you set up and run the autonomous Minecraft bot with all v3.0.0 features.

## 📋 Prerequisites

### Required
- **Node.js** 14.x or higher ([Download](https://nodejs.org/))
- **Minecraft Java Edition** server (version 1.16+)
- **Git** ([Download](https://git-scm.com/))

### Optional (for enhanced features)
- **Telegram Bot Token** (for notifications)
- **Google Gemini API Key** (for AI features - FREE tier available)

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/ibrsiaika/ai-tg-bot.git
cd ai-tg-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Minimum Configuration** (Required):
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AutoBot
```

**Full Configuration** (Recommended):
```env
# Minecraft Server
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AutoBot
MINECRAFT_VERSION=1.20.1

# Telegram (Optional - for notifications)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Google Gemini AI (Optional - for hybrid intelligence)
GEMINI_API_KEY=your_gemini_api_key_here

# Bot Behavior
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

### 4. Run the Bot
```bash
npm start
```

That's it! The bot should connect to your Minecraft server and start autonomous operation.

---

## 🔧 Detailed Setup

### Setting Up Telegram Notifications

1. **Create a Telegram Bot**
   - Open Telegram and search for [@BotFather](https://t.me/botfather)
   - Send `/newbot` and follow the instructions
   - Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Get Your Chat ID**
   - Search for [@userinfobot](https://t.me/userinfobot) on Telegram
   - Send any message to it
   - Copy your User ID (the number it shows)

3. **Add to `.env`**
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Test**
   - Start the bot
   - You should receive a notification on Telegram when the bot connects

### Setting Up Google Gemini AI (Hybrid Intelligence)

1. **Get a FREE API Key**
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Sign in with your Google account
   - Click "Get API Key"
   - Create a new API key
   - Copy the key

2. **Add to `.env`**
   ```env
   GEMINI_API_KEY=AIza...your_key_here
   ```

3. **Verify**
   - Start the bot
   - Look for: `✓ Gemini AI initialized with Flash model`
   - The bot will now use hybrid intelligence (AI + Brain)

### Minecraft Server Setup

**Option 1: Local Server**
```bash
# Download Minecraft Server
wget https://launcher.mojang.com/v1/objects/.../server.jar

# Run server
java -Xmx1024M -Xms1024M -jar server.jar nogui
```

**Option 2: Aternos (Free)**
1. Go to [Aternos.org](https://aternos.org/)
2. Create a free server
3. Start your server
4. Use the server address in `.env`

**Option 3: Existing Server**
- Just use your server's IP and port in `.env`

---

## 🎮 First Run Checklist

After starting the bot, you should see:

```
═══════════════════════════════════════════════
  AUTONOMOUS MINECRAFT BOT
  Fully Automated Survival & Building Robot
═══════════════════════════════════════════════

Configuration:
  Server: localhost:25565
  Username: AutoBot
  Telegram: Enabled
  Health Threshold: 60%
  Food Threshold: 10

Features:
  ✓ Enhanced AI with adaptive behavior
  ✓ Hybrid Intelligence (AI Orchestrator)
  ✓ Advanced Error Recovery
  ✓ Performance Optimization
  ✓ [... 27 more features]

Starting bot...
```

**Success Indicators**:
- ✓ Logged into server
- ✓ Bot spawned in world
- ✓ All systems initialized (30 systems online)
- ✓ Telegram notification received (if configured)
- ✓ Gemini AI initialized (if configured)

---

## ⚙️ Advanced Configuration

### Tuning Bot Behavior

Edit `.env` to customize:

```env
# Safety Thresholds
MIN_HEALTH_PERCENT=60      # Retreat when health drops below 60%
MIN_FOOD_LEVEL=10          # Eat when food drops below 10

# Mining (if needed)
MAX_MINING_DEPTH=256
MIN_MINING_DEPTH=10
```

### AI Orchestrator Settings

In `src/aiOrchestrator.js`, you can tune:

```javascript
this.maxAICallsPerHour = 100;           // AI budget (free tier)
this.COMPLEXITY_THRESHOLD = 0.7;         // When to use AI
this.CONFIDENCE_THRESHOLD = 0.6;         // When to consult AI
this.CACHE_TTL = 300000;                 // Cache duration (5 min)
```

### Error Handler Settings

In `src/errorHandler.js`, you can tune:

```javascript
this.MAX_RECOVERY_ATTEMPTS = 3;          // Retry attempts
this.CRITICAL_ERROR_THRESHOLD = 5;       // When to alert
```

### Optimization Manager Settings

In `src/optimizationManager.js`, you can tune:

```javascript
this.OPTIMIZATION_INTERVAL = 60000;      // Optimize every 60s
```

---

## 🐛 Troubleshooting

### Bot Can't Connect to Server

**Problem**: `ECONNREFUSED` error

**Solutions**:
1. Check server is running
2. Verify `MINECRAFT_HOST` and `MINECRAFT_PORT` in `.env`
3. Ensure server allows offline mode (or use real account)
4. Check firewall settings

### Gemini AI Not Working

**Problem**: AI features not activating

**Solutions**:
1. Verify API key is correct in `.env`
2. Check you have internet connection
3. Ensure API key has no spaces/newlines
4. Check quota at [Google AI Studio](https://ai.google.dev/)

**Verify**:
```bash
# Should see this in console
✓ Gemini AI initialized with Flash model
```

### Telegram Notifications Not Received

**Problem**: No messages on Telegram

**Solutions**:
1. Verify bot token is correct
2. Verify chat ID is correct
3. Start a chat with your bot first
4. Check bot isn't blocked

**Test**:
```bash
# Check console for
Telegram: Enabled
```

### Bot Keeps Dying/Disconnecting

**Problem**: Bot frequently dies or disconnects

**Solutions**:
1. Increase `MIN_HEALTH_PERCENT` (try 70 or 80)
2. Check server difficulty (Peaceful is easiest)
3. Review error logs in `logs/error.log`
4. Check bot has basic resources (food, tools)

### High Memory Usage

**Problem**: Bot uses too much memory

**Solutions**:
1. Optimization Manager auto-cleans memory every 60s
2. Restart bot periodically
3. Reduce `MAX_RESOURCE_LOCATIONS` in intelligence.js
4. Clear old backups in `.bot-memory.json`

---

## 📊 Monitoring & Logs

### Console Output

The bot provides detailed console output:

```
✓ Logged into server
✓ Bot spawned in world
✓ All systems initialized (30 systems online)
Choosing next autonomous goal...
🎯 Orchestrator: gather_wood (brain)
Gathering 10 wood...
```

### Error Logs

Errors are logged to `logs/error.log`:

```bash
tail -f logs/error.log  # Follow error log
```

### Telegram Reports

If Telegram is configured, you'll receive:
- 🤖 Bot activation/deactivation
- 📊 Performance metrics
- 🛠️ Error reports
- ⚡ Optimization updates
- 🧠 AI decision insights

---

## 🔄 Updating the Bot

### Pulling Latest Changes

```bash
git pull origin main
npm install  # Update dependencies if needed
```

### Version Check

Check your version in `package.json`:

```bash
cat package.json | grep version
# Should show: "version": "3.0.0"
```

---

## 🎯 Performance Tuning

### For Resource Efficiency

If bot is using too many resources:

```javascript
// In src/aiOrchestrator.js
this.maxAICallsPerHour = 50;  // Reduce AI usage

// In src/optimizationManager.js
this.OPTIMIZATION_INTERVAL = 120000;  // Optimize less often
```

### For Maximum Intelligence

If you want maximum AI power:

```javascript
// In src/aiOrchestrator.js
this.maxAICallsPerHour = 200;  // More AI calls (watch quotas)
this.COMPLEXITY_THRESHOLD = 0.5;  // Use AI more often

// In src/behavior.js
this.AI_DECISION_INTERVAL = 5;  // Consult AI more frequently
```

---

## 📚 Next Steps

1. **Read Documentation**
   - `AI_FEATURES.md` - AI system guide
   - `GAME_CHANGER.md` - Hybrid intelligence guide
   - `TROUBLESHOOTING.md` - Common issues

2. **Customize Behavior**
   - Edit `src/behavior.js` for custom goals
   - Modify `src/constants.js` for thresholds

3. **Monitor Performance**
   - Watch console output
   - Check Telegram notifications
   - Review `logs/error.log`

4. **Join Community**
   - Report issues on GitHub
   - Share improvements
   - Help others

---

## 🆘 Getting Help

### Common Commands

```bash
npm start              # Start the bot
npm test               # Run tests (requires server)
node -c index.js       # Syntax check
git status             # Check changes
git pull               # Update code
```

### Support Resources

- **Documentation**: Check `*.md` files in repository
- **Issues**: [GitHub Issues](https://github.com/ibrsiaika/ai-tg-bot/issues)
- **Code**: Review source in `src/` directory

### Debug Mode

For detailed debugging:

```bash
# Add to .env
DEBUG=true
LOG_LEVEL=verbose
```

---

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Node.js 14+ installed (`node --version`)
- [ ] Dependencies installed (`npm install` ran successfully)
- [ ] `.env` file created and configured
- [ ] Minecraft server running and accessible
- [ ] Bot username not taken on server
- [ ] Console shows "All systems initialized"
- [ ] No syntax errors (`node -c index.js` passes)

---

## 🎉 Success!

If you see:

```
✓ All systems initialized (30 systems online)
🤖 GAME CHANGER: 30 AI systems online!
Beginning fully optimized autonomous operations.
```

**Congratulations!** Your game-changing AI Minecraft bot is running!

The bot will now:
- ✅ Make intelligent decisions (hybrid AI)
- ✅ Recover from errors automatically
- ✅ Optimize itself continuously
- ✅ Gather resources autonomously
- ✅ Build structures
- ✅ Protect itself from threats
- ✅ And much more!

Enjoy your fully autonomous Minecraft companion! 🎮🤖

---

**Version**: 3.0.0  
**Last Updated**: 2025-11-18  
**Support**: See GitHub repository for updates
