# Example Configurations

This file contains example `.env` configurations for different use cases.

## 1. Local Testing Setup

Perfect for testing the bot on a local Minecraft server:

```env
# Local Minecraft Server
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=TestBot
MINECRAFT_VERSION=1.20.1

# Disable Telegram for testing
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Default behavior settings
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

## 2. Remote Server with Telegram

For connecting to a remote server with notifications:

```env
# Remote Minecraft Server
MINECRAFT_HOST=mc.yourserver.com
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AutoBot
MINECRAFT_VERSION=1.20.1

# Enable Telegram notifications
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321

# Standard behavior
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

## 3. Hardcore/Survival Mode

Extra cautious settings for hardcore worlds:

```env
# Minecraft Server
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=HardcoreBot
MINECRAFT_VERSION=1.20.1

# Telegram for monitoring
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Very conservative settings
MIN_HEALTH_PERCENT=80
MIN_FOOD_LEVEL=15
```

## 4. Aggressive Resource Gathering

Optimized for maximum resource collection:

```env
# Minecraft Server
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=MinerBot
MINECRAFT_VERSION=1.20.1

# Telegram notifications
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Slightly riskier for faster gathering
MIN_HEALTH_PERCENT=50
MIN_FOOD_LEVEL=8
```

## 5. Creative/Peaceful Server

For peaceful servers where combat isn't a concern:

```env
# Peaceful Minecraft Server
MINECRAFT_HOST=creative.server.com
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=BuilderBot
MINECRAFT_VERSION=1.20.1

# Telegram updates
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Relaxed settings for peaceful mode
MIN_HEALTH_PERCENT=40
MIN_FOOD_LEVEL=5
```

## 6. Multiple Bots Setup

Run multiple bots by creating separate folders:

### Bot 1 - Miner
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=MinerBot1
MINECRAFT_VERSION=1.20.1
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

### Bot 2 - Builder
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=BuilderBot2
MINECRAFT_VERSION=1.20.1
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

### Bot 3 - Farmer
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=FarmerBot3
MINECRAFT_VERSION=1.20.1
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

## Version-Specific Notes

### Minecraft 1.16.x
```env
MINECRAFT_VERSION=1.16.5
# Works well with all features
```

### Minecraft 1.17.x - 1.18.x
```env
MINECRAFT_VERSION=1.18.2
# New cave generation - mining works great
# Adjust MIN_MINING_DEPTH for new world height
```

### Minecraft 1.19.x
```env
MINECRAFT_VERSION=1.19.4
# Deep dark biome - be cautious with mining
# Consider higher MIN_HEALTH_PERCENT
```

### Minecraft 1.20.x
```env
MINECRAFT_VERSION=1.20.1
# Latest features supported
# All systems fully compatible
```

## Docker Deployment

For running in a Docker container:

```env
# Use host networking for local server
MINECRAFT_HOST=host.docker.internal
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=DockerBot
MINECRAFT_VERSION=1.20.1

TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

## Cloud Server Setup

For running on a cloud VPS:

```env
# External server connection
MINECRAFT_HOST=192.168.1.100
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=CloudBot
MINECRAFT_VERSION=1.20.1

# Telegram for remote monitoring
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Standard settings
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

## Development/Debug Setup

For development and debugging:

```env
# Local test server
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=DebugBot
MINECRAFT_VERSION=1.20.1

# Keep Telegram disabled during dev
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# More cautious for stability
MIN_HEALTH_PERCENT=70
MIN_FOOD_LEVEL=12
```

## How to Use These Examples

1. Choose the configuration that matches your use case
2. Copy it to your `.env` file
3. Replace placeholder values with your actual credentials
4. Adjust settings as needed for your specific requirements
5. Run `npm start` to start the bot

## Tips

- **Username**: Make it descriptive (MinerBot, BuilderBot, etc.)
- **Health/Food**: Start conservative, adjust based on bot performance
- **Telegram**: Always use for remote monitoring in production
- **Version**: Match your server version for best compatibility
- **Testing**: Always test with Telegram disabled first

## Security Notes

⚠️ **Never commit your actual `.env` file to version control!**

- The `.env` file contains sensitive credentials
- Always use `.env.example` for templates
- Keep your Telegram bot token private
- Don't share your chat ID publicly
