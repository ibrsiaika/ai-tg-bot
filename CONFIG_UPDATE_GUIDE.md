# Configuration Update Guide

## Issue Fixed
Previously, when running team mode (`npm run team`), users would encounter a configuration error:
```
CONFIGURATION ERROR
═══════════════════════════════════════════════
The following configuration errors were found:
  ✗ Invalid or missing username (must be at least 3 characters)
```

This has been fixed! Team mode now works without requiring `MINECRAFT_USERNAME` in the `.env` file.

## What Changed

### .env.example
- Added clear documentation about username usage
- Explained that team mode uses auto-generated usernames
- Clarified which fields are required for each mode

### Configuration Validation
- Updated `validateConfig()` function to support skipping username validation
- Team mode (`index-team.js`) now bypasses username check
- Single mode (`index.js`) still requires username as before

## How to Use

### Single Bot Mode
Your `.env` file should include:
```env
MINECRAFT_HOST=your.server.address
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=YourBotName
MINECRAFT_VERSION=1.20.1
```

Run with:
```bash
npm start
```

### Team Mode (3 Specialized Bots)
Your `.env` file only needs:
```env
MINECRAFT_HOST=your.server.address
MINECRAFT_PORT=25565
MINECRAFT_VERSION=1.20.1
```

The `MINECRAFT_USERNAME` field is **optional** for team mode because the system uses these hardcoded names:
- DefenderBot (protects the base)
- BuilderBot (builds structures)
- MinerBot (gathers resources)

Run with:
```bash
npm run team
```

## Required vs Optional Fields

### Required for Both Modes
- `MINECRAFT_HOST` - Server address
- `MINECRAFT_PORT` - Server port

### Required for Single Mode Only
- `MINECRAFT_USERNAME` - Bot's username (min 3 characters)

### Optional for All Modes
- `MINECRAFT_VERSION` - Minecraft version (defaults to auto-detect)
- `TELEGRAM_BOT_TOKEN` - For Telegram notifications
- `TELEGRAM_CHAT_ID` - For Telegram notifications
- `GEMINI_API_KEY` - For AI features
- `MIN_HEALTH_PERCENT` - Health threshold (default: 60)
- `MIN_FOOD_LEVEL` - Food threshold (default: 10)

## Troubleshooting

### "Invalid or missing username" error in team mode
**Solution**: Update to the latest version. This has been fixed.

### "Invalid or missing username" error in single mode
**Solution**: Add `MINECRAFT_USERNAME=YourBotName` to your `.env` file

### Team bots not spawning
**Possible causes**:
1. Server doesn't allow the bot usernames (DefenderBot, BuilderBot, MinerBot)
2. Server has a whitelist - add the bot names to whitelist
3. Server requires authentication - check server settings

### Configuration test
You can verify your configuration with:
```bash
npm run check-env
```

This will show:
- ✓ Environment loaded
- Host: your.server.address
- Telegram: Configured / Not configured
- Gemini AI: Configured / Not configured
