# Quick Start Guide

This guide will help you get the Autonomous Minecraft Bot running in minutes.

## Prerequisites

1. **Node.js**: Download and install from [nodejs.org](https://nodejs.org/) (version 14 or higher)
2. **Minecraft Java Edition Server**: You need access to a Minecraft server (local or remote)
3. **Basic Terminal/Command Prompt Knowledge**: You'll need to run a few commands

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ibrsiaika/ai-tg-bot.git
cd ai-tg-bot

# Install dependencies
npm install
```

### 2. Configure the Bot

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your favorite text editor and set these values:

```env
# Required: Your Minecraft server details
MINECRAFT_HOST=localhost           # Change to your server IP
MINECRAFT_PORT=25565               # Default Minecraft port
MINECRAFT_USERNAME=AutoBot         # Choose any username

# Optional: Telegram notifications
TELEGRAM_BOT_TOKEN=                # Leave empty to disable
TELEGRAM_CHAT_ID=                  # Leave empty to disable

# Optional: Behavior settings (defaults are fine)
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

### 3. Start the Bot

```bash
npm start
```

You should see output like:
```
═══════════════════════════════════════════════
  AUTONOMOUS MINECRAFT BOT
  Fully Automated Survival & Building Robot
═══════════════════════════════════════════════

Configuration:
  Server: localhost:25565
  Username: AutoBot
  Telegram: Disabled

Starting bot...
✓ Logged into server
✓ Bot spawned in world
```

## Testing Locally

If you don't have a Minecraft server, you can quickly set one up:

### Option 1: Simple Local Server
1. Download Minecraft Server from [minecraft.net/download/server](https://www.minecraft.net/en-us/download/server)
2. Create a folder and place the server jar inside
3. Run: `java -Xmx1024M -Xms1024M -jar server.jar nogui`
4. Edit `server.properties` and set `online-mode=false`
5. Restart the server

### Option 2: Use Docker (Easiest)
```bash
docker run -d -p 25565:25565 --name mc -e EULA=TRUE itzg/minecraft-server
```

## Setting Up Telegram (Optional)

To receive notifications on Telegram:

1. **Create a Bot**:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow the instructions
   - Copy the bot token (looks like `123456:ABC-DEF1234...`)

2. **Get Your Chat ID**:
   - Search for `@userinfobot` in Telegram
   - Start a chat with it
   - It will reply with your user ID (e.g., `123456789`)

3. **Update `.env`**:
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Start a conversation with your bot**:
   - Find your bot in Telegram (use the username you chose)
   - Send `/start` to activate it

Now you'll receive notifications like:
- "Found iron ore at Y=34. Mining now."
- "Farm expanded. Wheat growing."
- "Danger: skeletons nearby. Retreating."

## First Run Checklist

When you first run the bot, it will:

1. ✓ Connect to the server
2. ✓ Spawn in the world
3. ✓ Start gathering wood
4. ✓ Craft basic tools
5. ✓ Begin mining stone
6. ✓ Collect food
7. ✓ Build a starter base
8. ✓ Continue autonomous operations

## Monitoring the Bot

Watch the console output to see what the bot is doing:
- It logs all major decisions and actions
- Telegram notifications (if enabled) provide summaries
- The bot operates continuously until you stop it

## Stopping the Bot

Press `Ctrl+C` in the terminal to gracefully shut down the bot.

## Troubleshooting

**"Cannot connect to server"**
- Check that the Minecraft server is running
- Verify the host and port in `.env`
- Make sure the server allows the bot username

**"Bot keeps dying"**
- The spawn area might be dangerous
- Try increasing `MIN_HEALTH_PERCENT` in `.env`
- Manually place the bot in a safer location first

**"No Telegram notifications"**
- Verify bot token and chat ID are correct
- Make sure you've started a chat with your bot
- Check console logs for error messages

**"Bot seems stuck"**
- This is normal occasionally due to pathfinding
- The bot will usually recover on its own
- Restart if stuck for more than a few minutes

## Next Steps

Once the bot is running successfully:
- Watch it work and learn its behavior patterns
- Customize the behavior in `src/behavior.js`
- Adjust priorities for different goals
- Modify what resources it focuses on
- Add custom building designs

## Getting Help

If you encounter issues:
1. Check the main [README.md](README.md) for detailed documentation
2. Look at the source code comments for specific systems
3. Create an issue on GitHub with details about the problem

## Tips for Best Results

- Start the bot in a safe area (not near lava, cliffs, or mobs)
- Give it a few minutes to establish basic operations
- Don't interfere with the bot's inventory initially
- Let it run for at least 30 minutes to see full autonomous behavior
- Check Telegram notifications to see what it's accomplishing

Enjoy your autonomous Minecraft bot! 🤖⛏️
