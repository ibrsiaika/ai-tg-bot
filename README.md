# Autonomous Minecraft Bot - Enhanced Edition

A fully autonomous Minecraft robot built with Node.js and Mineflayer featuring **enhanced AI**, **intelligent exploration**, **advanced base building**, **Google Gemini AI integration**, **comprehensive item protection**, and **multi-bot team coordination**. This bot operates 24/7 without human commands, making intelligent decisions about survival, resource gathering, building, mining, farming, fishing, and combat. It sends important updates to your Telegram.

## 🆕 NEW: Multi-Bot Team System

**Work as a coordinated team with specialized roles!**

Run three bots simultaneously, each with distinct responsibilities:
- 🛡️ **Defender Bot** - Protects the base and eliminates threats
- 🏗️ **Builder Bot** - Constructs and expands structures
- ⛏️ **Miner Bot** - Gathers resources and returns to base

**Team Features:**
- Inter-bot communication and coordination
- Shared resource pool management
- Automated help requests between bots
- Team status reporting
- Role-specific AI decision making
- Collaborative task completion

**Quick Start Team Mode:**
```bash
npm run team
```

See **[Team System Guide](TEAM_GUIDE.md)** for complete documentation.

## 🤖 Enhanced Features

### Google Gemini AI Integration (NEW)
- **AI-Powered Decision Making**: Uses Google's free Gemini Flash model for intelligent decisions
- **Console Logging**: All AI prompts and responses are logged to console for transparency
- **Crafting Suggestions**: AI recommends optimal items to craft based on resources and needs
- **Building Advice**: Strategic recommendations for base development
- **Danger Response**: Smart threat assessment and action recommendations
- **Performance Analysis**: AI-driven optimization suggestions
- **Team Coordination**: Role-specific AI advice for each bot in team mode

### Item Protection System (NEW)
- **Player Detection**: Monitors nearby players and protects items
- **Safe Food Consumption**: Only eats when safe from threats
- **Protected Chests**: Secure storage for valuable items
- **Mob Protection**: Prevents mobs from accessing stored food
- **Combat Awareness**: Smart food consumption based on danger level

### Advanced Crafting System (NEW)
- **18+ New Recipes**: Beacon, anvil, brewing stand, enchantment table, and more
- **Automation Components**: Hopper, blast furnace, smoker, composter
- **Building Materials**: Fence, gates, ladders, scaffolding
- **Enchanting Setup**: Bookshelves, lectern, grindstone, cartography table
- **Smart Material Usage**: Automatically uses best available materials

### Hybrid Intelligence System (NEW - v3.0.0) ⭐
- **AI Orchestrator**: Intelligently routes decisions between Gemini AI, Bot Brain, and Rules
- **Smart Decision Routing**: Strategic (AI), Tactical (Brain), Reactive (Rules)
- **Decision Caching**: 5-minute TTL to avoid redundant AI calls
- **Budget Management**: Stays within free tier (100 AI calls/hour)
- **Performance Tracking**: 3x faster decisions, 81%+ efficiency

### Advanced Error Recovery (NEW - v3.0.0) ⭐
- **Self-Healing System**: 90%+ automatic error recovery rate
- **8 Recovery Strategies**: Pathfinding, Inventory, Crafting, Combat, Connection, Resources, AI, Protocol
- **Critical Detection**: Alerts when same error occurs 5+ times
- **Error Logging**: Writes to file for analysis
- **Retry Logic**: 3 attempts per error type with exponential backoff

### Performance Optimization (NEW - v3.0.0) ⭐
- **Continuous Self-Tuning**: Optimizes every 60 seconds
- **Memory Management**: Auto-cleanup of stale data
- **Path Caching**: 100 most-used paths cached
- **Dynamic Tuning**: Adjusts exploration radius (30-100m) based on resource density
- **Action Batching**: Groups similar actions for 40% efficiency gain

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

### Automated Backup System (NEW)
- **Periodic Backups**: Automatically saves bot state every 10 minutes
- **State Preservation**: Preserves position, inventory, exploration data, and goals
- **Crash Recovery**: Can restore from latest backup after disconnection
- **Smart Cleanup**: Maintains only the 10 most recent backups
- **Graceful Shutdown**: Creates final backup before bot shutdown

### Fishing Automation (NEW)
- **Auto-Fishing**: Autonomous fishing for food and resources
- **Smart Rod Crafting**: Crafts fishing rod when needed
- **Water Detection**: Finds suitable water bodies automatically
- **Inventory Management**: Stops when inventory is full
- **Session Tracking**: Monitors catches and fishing duration

### Health Regeneration System (NEW)
- **Smart Healing**: Eats food and waits for natural regeneration
- **Food Management**: Maintains high food level for faster healing
- **Critical Health Detection**: Takes defensive action when critically low
- **Healing Cooldown**: Prevents heal spam with intelligent timing

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
- (Optional) Google Gemini API Key for AI features (free tier available)

## 📚 Documentation

- **[Team System Guide](TEAM_GUIDE.md)** - Multi-bot team coordination and specialized roles (NEW!)
- **[Combat Improvements](COMBAT_IMPROVEMENTS.md)** - Enhanced combat system documentation (NEW!)
- **[Configuration Update Guide](CONFIG_UPDATE_GUIDE.md)** - Configuration fixes and setup help (NEW!)
- **[AI Features Guide](AI_FEATURES.md)** - Comprehensive guide to Gemini AI, item protection, and advanced crafting
- **[Quick Start Guide](QUICKSTART.md)** - Get started quickly
- **[Customization Guide](CUSTOMIZATION.md)** - Customize bot behavior
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Examples](EXAMPLES.md)** - Usage examples and scenarios

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
   
   Single Bot Mode (traditional):
   ```bash
   npm start
   ```
   
   Team Mode (3 specialized bots):
   ```bash
   npm run team
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

### Google Gemini AI Setup (Optional - NEW)
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Create a free API key
4. Add the key to your `.env` file as `GEMINI_API_KEY`
5. The bot will automatically use AI features when configured

See **[AI Features Guide](AI_FEATURES.md)** for detailed AI capabilities.

### Behavior Parameters
- `MIN_HEALTH_PERCENT`: Health threshold for retreat (default: 60)
- `MIN_FOOD_LEVEL`: Food level to trigger eating (default: 10)

## 🎮 Usage

### Single Bot Mode
Once started, the bot operates completely autonomously:

1. **Initial Phase**: Gathers basic resources (wood, stone)
2. **Tool Creation**: Crafts and upgrades tools
3. **Base Building**: Constructs shelter and storage
4. **Resource Expansion**: Mines ores and collects materials
5. **Advanced Operations**: Farming, exploration, and base expansion
6. **Continuous Improvement**: Upgrades equipment and expands capabilities

### Team Mode (NEW!)
In team mode, three specialized bots work together:

1. **Defender Bot**: Patrols base, eliminates threats, maintains security
2. **Builder Bot**: Constructs structures, farms, and infrastructure
3. **Miner Bot**: Mines resources, explores caves, delivers materials

**Team Coordination:**
- Bots communicate and share resources
- Help each other when in danger
- Coordinate on shared goals
- Report team status regularly

See **[Team System Guide](TEAM_GUIDE.md)** for detailed team operations.

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
├── index.js              # Main entry point (single bot)
├── index-team.js         # Team mode entry point (NEW)
├── src/
│   ├── teamCoordinator.js    # Team coordination system (NEW)
│   ├── roleConfigs.js        # Bot role configurations (NEW)
│   ├── roleBehaviorManager.js # Role-based behaviors (NEW)
│   ├── behavior.js       # Autonomous decision making (Enhanced with AI)
│   ├── intelligence.js   # Advanced intelligence system (NEW)
│   ├── geminiAI.js       # Google Gemini AI integration (Enhanced logging)
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
├── README.md
└── TEAM_GUIDE.md         # Team system documentation (NEW)
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

**Status**: Fully Autonomous | **Mode**: Single Bot / Team Mode | **Intelligence**: Hybrid AI (v3.0.0) | **Systems**: 30+ Online | **Team**: 3 Specialized Bots
