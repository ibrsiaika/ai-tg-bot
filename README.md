# Autonomous Minecraft Bot - Enhanced Edition

A fully autonomous Minecraft robot built with Node.js and Mineflayer featuring **enhanced AI**, **intelligent exploration**, and **advanced base building**. This bot operates 24/7 without human commands, making intelligent decisions about survival, resource gathering, building, mining, farming, and combat. It sends important updates to your Telegram.

## 🤖 Enhanced Features

### Advanced Intelligence System (NEW - "The Brain")
- **Memory Systems**: Remembers resource locations, danger zones, and safe areas
- **Learning Capability**: Tracks action outcomes and success rates
- **Decision Confidence**: Uses past performance to optimize choices
- **Risk Assessment**: Evaluates danger of proposed actions
- **Resource Prediction**: Prioritizes gathering based on actual needs
- **Long-term Planning**: Manages goals and milestones strategically
- **Strategy Optimization**: Learns from experience to improve over time

### Tool Durability Management (NEW)
- **Auto-Monitoring**: Tracks wear on all tools in inventory
- **Smart Replacement**: Automatically replaces broken or low-durability tools
- **Material Optimization**: Uses best available materials for crafting
- **Priority System**: Focuses on most critical tools first
- **Proactive Warnings**: Alerts before tools break completely

### Advanced Intelligence System (ENHANCED)
- **Adaptive Behavior**: Learns and adjusts strategies based on performance
- **Day/Night Cycle Awareness**: Changes activities based on time of day
- **Performance Metrics**: Tracks resources, structures, exploration progress
- **Smart Decision Making**: Prioritizes tasks based on current needs
- **Intelligent Goal Selection**: Enhanced priority system with situational awareness

### Exploration & Mapping System (ENHANCED)
- **Smart Exploration**: Systematically explores unexplored chunks
- **Tree Location Memory**: Remembers tree locations for efficient wood gathering
- **Waypoint System**: Remembers important locations (home, villages, temples)
- **Structure Detection**: Finds and marks villages, temples, and other structures
- **Biome Discovery**: Identifies and catalogs different biomes
- **Ore Scanning**: Actively searches for valuable ore deposits
- **Mapping**: Tracks visited locations and chunks to avoid redundant exploration
- **Intelligent Pathfinding**: Finds nearest known resources before searching

### Advanced Base Building (NEW)
- **Fortified Walls**: Multi-layered defensive walls with battlements
- **Corner Watchtowers**: 8-block tall towers at all corners with ladders
- **Interior Structures**: Organized rooms (storage, crafting, bedroom, smelting)
- **Defensive Lighting**: Perimeter lighting to prevent mob spawns
- **Moat Construction**: Optional protective moat around base
- **Base Progression**: Upgradeable base levels with increasing complexity

### Autonomous Behavior
- **Fully Independent**: Makes all decisions automatically without waiting for commands
- **Intelligent Planning**: Continuously evaluates priorities and chooses optimal goals
- **24/7 Operation**: Works continuously until manually stopped or disconnected
- **Adaptive Learning**: Adjusts behavior based on success metrics

### Survival Systems
- **Health Monitoring**: Maintains health above 60% (configurable)
- **Food Management**: Automatically finds and eats food when hungry
- **Danger Avoidance**: Detects and escapes from lava, falls, drowning, and suffocation
- **Retreat Logic**: Falls back when overwhelmed by mobs or low on health

### Resource Gathering
- **Automatic Wood Collection**: Finds and chops trees (with memory system)
- **Intelligent Search**: Remembers tree locations and searches efficiently
- **Stone Mining**: Gathers stone and cobblestone
- **Ore Mining**: Searches for and mines coal, iron, gold, diamonds, and other ores
- **Ore Vein Mining**: Automatically mines entire ore veins when discovered
- **Better Error Handling**: Improved messages when resources aren't found

### Tool Management
- **Auto-Crafting**: Creates tools, torches, and other items as needed
- **Tool Upgrading**: Automatically upgrades from wooden → stone → iron → diamond tools
- **Durability Monitoring**: Tracks tool condition and replaces broken tools proactively
- **Smart Equipment**: Equips best available tools for each task
- **Auto-Replacement**: Crafts new tools when current ones break or wear out
- **Material Optimization**: Uses best available materials for tool crafting

### Building Systems
- **Starter Base**: Builds initial shelter with walls, floor, and door
- **Storage Rooms**: Creates rooms with multiple chests for organization
- **Farm Construction**: Builds farmland with irrigation and fencing
- **Lighting**: Automatically places torches to light up areas
- **Expansion**: Continuously expands base over time

### Mining Operations
- **Branch Mining**: Creates efficient branch mine systems
- **Depth Management**: Mines at optimal depths for different resources
- **Torch Placement**: Automatically lights tunnels while mining
- **Auto-Return**: Returns home when inventory is full
- **Safety Checks**: Avoids digging into lava or dangerous areas

### Combat System
- **Hostile Mob Detection**: Identifies threats within 16 blocks
- **Automatic Defense**: Attacks hostile mobs when safe to do so
- **Tactical Retreat**: Runs away when health is low or overwhelmed
- **Weapon Management**: Equips best available weapon for combat
- **Healing**: Retreats to safe area and heals after combat

### Farming Automation
- **Crop Planting**: Plants wheat, carrots, potatoes, and other crops
- **Auto-Harvesting**: Detects mature crops and harvests them
- **Replanting**: Automatically replants after harvesting
- **Animal Breeding**: Can breed cows, pigs, sheep, and chickens
- **Farm Maintenance**: Continuously manages farms without intervention

### Inventory Management
- **Smart Storage**: Organizes items in chests
- **Junk Removal**: Tosses unnecessary items when inventory is full
- **Crafting Automation**: Creates needed items from available materials
- **Smelting**: Processes raw ores in furnaces
- **Space Optimization**: Keeps inventory organized and efficient

### Telegram Notifications
The bot sends concise, professional notifications for important events:
- Resource discoveries (diamonds, iron, etc.)
- Mining progress and locations
- Base expansion updates
- Farm completions
- Tool upgrades
- Danger warnings
- Inventory status
- Combat encounters

## 📋 Requirements

- Node.js 14.x or higher
- A Minecraft Java Edition server (version 1.16+)
- (Optional) Telegram Bot Token for notifications

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ibrsiaika/ai-tg-bot.git
   cd ai-tg-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   # Minecraft Server Configuration
   MINECRAFT_HOST=localhost
   MINECRAFT_PORT=25565
   MINECRAFT_USERNAME=AutoBot
   MINECRAFT_VERSION=1.20.1
   
   # Telegram Bot Configuration (optional)
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_CHAT_ID=your_telegram_chat_id_here
   
   # Bot Behavior Settings
   MIN_HEALTH_PERCENT=60
   MIN_FOOD_LEVEL=10
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Minecraft Server Settings
- `MINECRAFT_HOST`: Server IP address (default: localhost)
- `MINECRAFT_PORT`: Server port (default: 25565)
- `MINECRAFT_USERNAME`: Bot's username
- `MINECRAFT_VERSION`: Minecraft version (leave as false for auto-detect)

### Telegram Setup (Optional)
1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
4. Add both to your `.env` file

### Behavior Parameters
- `MIN_HEALTH_PERCENT`: Health threshold for retreat (default: 60)
- `MIN_FOOD_LEVEL`: Food level to trigger eating (default: 10)

## 🎮 Usage

Once started, the bot operates completely autonomously:

1. **Initial Phase**: Gathers basic resources (wood, stone)
2. **Tool Creation**: Crafts and upgrades tools
3. **Base Building**: Constructs shelter and storage
4. **Resource Expansion**: Mines ores and collects materials
5. **Advanced Operations**: Farming, exploration, and base expansion
6. **Continuous Improvement**: Upgrades equipment and expands capabilities

The bot makes decisions based on:
- Current health and food levels
- Available inventory space
- Tool availability and durability
- Nearby resources and opportunities
- Environmental hazards
- Time of day and weather conditions

## 📱 Telegram Notifications

When Telegram is configured, you'll receive updates like:

```
Found iron ore at Y=34. Mining now.
Farm expanded. Wheat growing.
Returning home, inventory full.
Diamond discovered. Securing area.
Danger: skeletons nearby. Retreating.
Tool upgraded: iron pickaxe.
Base expansion: storage room completed.
```

## 🔧 Advanced Features

### Autonomous Decision Making
The bot uses a priority-based goal system enhanced with intelligence:
- **CRITICAL**: Safety (health, food)
- **HIGH**: Essential tools, inventory management, tool maintenance
- **MEDIUM**: Resource gathering, mining, farming (based on intelligent needs)
- **LOW**: Exploration, base expansion

**Intelligence-Enhanced Features:**
- Confidence scoring based on past performance
- Risk assessment for proposed actions
- Resource need prediction and prioritization
- Learning from successful and failed actions
- Strategic long-term goal management
- Periodic intelligence reports

### Safety Systems
- Continuous health monitoring
- Environmental hazard detection
- Mob threat assessment
- Fall damage prevention
- Lava and water safety

### Pathfinding
- Uses mineflayer-pathfinder for intelligent navigation
- Avoids obstacles and dangerous terrain
- Finds optimal routes to resources
- Returns home when needed

## 🛠️ Development

### Project Structure
```
ai-tg-bot/
├── index.js              # Main entry point
├── src/
│   ├── behavior.js       # Autonomous decision making (Enhanced with AI)
│   ├── intelligence.js   # Advanced intelligence system (NEW)
│   ├── toolDurability.js # Tool durability management (NEW)
│   ├── safety.js         # Safety monitoring
│   ├── inventory.js      # Inventory management
│   ├── telegram.js       # Telegram notifications
│   ├── gathering.js      # Resource gathering (Enhanced)
│   ├── exploration.js    # Exploration system (Enhanced)
│   ├── crafting.js       # Crafting system
│   ├── mining.js         # Mining operations
│   ├── building.js       # Building system
│   ├── advancedBase.js   # Advanced base building
│   ├── combat.js         # Combat system
│   └── farming.js        # Farming automation
├── package.json
├── .env.example
└── README.md
```

### Adding Custom Behaviors

You can modify the behavior system in `src/behavior.js` to add custom goals:

```javascript
goals.push({
    name: 'custom_goal',
    priority: this.priorities.MEDIUM,
    action: async () => await this.customAction()
});
```

## 🐛 Troubleshooting

**Bot disconnects frequently**
- Check server connection and authentication
- Ensure server allows the bot username
- Check server whitelist settings

**Bot gets stuck**
- The bot will attempt to recover automatically
- Restart if stuck for extended periods
- Check pathfinding obstacles

**Notifications not working**
- Verify Telegram token and chat ID
- Check bot permissions in Telegram
- Ensure network connectivity

**Bot dies repeatedly**
- Adjust MIN_HEALTH_PERCENT higher
- Check spawn area for immediate threats
- Consider starting in a safer location

## 📄 License

MIT License - feel free to use and modify

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## ⚠️ Disclaimer

This bot is for educational and entertainment purposes. Always:
- Respect server rules and policies
- Get permission before running bots on servers
- Monitor bot behavior to prevent issues
- Use responsibly

## 🌟 Acknowledgments

Built with:
- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Minecraft bot framework
- [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder) - Pathfinding
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram integration

---

**Status**: Fully Autonomous | **Mode**: 24/7 Operation | **Intelligence**: High
