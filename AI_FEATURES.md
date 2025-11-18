# AI Features and Advanced Systems Guide

This document describes the new AI-powered features and advanced systems added to the Autonomous Minecraft Bot.

## Table of Contents
- [Google Gemini AI Integration](#google-gemini-ai-integration)
- [Item Protection System](#item-protection-system)
- [Advanced Crafting Recipes](#advanced-crafting-recipes)

---

## Google Gemini AI Integration

The bot now uses Google's Gemini Flash model (free tier) for intelligent decision-making.

### Setup

1. Get a free API key from [Google AI Studio](https://ai.google.dev/)
2. Add the key to your `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. The bot will automatically detect and use Gemini AI if the key is configured

### Features

#### AI-Powered Decision Making
- The bot consults Gemini AI every 10 decisions for strategic guidance
- AI analyzes current game state (health, food, time, threats, inventory)
- Provides prioritized action recommendations

#### Crafting Suggestions
- AI suggests optimal items to craft based on:
  - Current inventory
  - Available resources
  - Current needs and goals
- Returns prioritized list with reasoning

#### Building Advice
- AI analyzes base state and recommends structures to build
- Considers priority, required materials, and strategic value
- Helps optimize base development

#### Danger Response
- In dangerous situations, AI recommends:
  - `retreat` - Run away from threats
  - `fight` - Engage hostile mobs
  - `hide` - Find shelter
  - `eat` - Consume food for health
  - `heal` - Wait for health regeneration
  - `escape` - Find alternate escape route

#### Performance Analysis
- AI periodically analyzes bot performance metrics
- Provides actionable suggestions to improve efficiency
- Helps optimize resource gathering and task prioritization

### Usage

The AI system works automatically in the background. You'll see messages like:

```
🤖 Gemini AI suggests: gather_wood (high) - Need resources for crafting table and tools
🤖 AI: mine_stone - Current priority is establishing tool infrastructure
```

### Benefits

- **Smarter decisions**: AI considers context and long-term strategy
- **Adaptive behavior**: Learns from game state and adjusts recommendations
- **Resource optimization**: Better resource allocation based on needs
- **Strategic planning**: Helps prioritize goals for faster progression

---

## Item Protection System

Advanced protection for food, tools, and valuable items from players and mobs.

### Features

#### Player Detection
- Monitors for nearby players within 16 blocks
- Alerts when new players are detected
- Sends Telegram notifications about player presence

#### Safe Food Consumption
- Only eats when safe (no players or hostile mobs nearby)
- Checks combat state before consuming food
- Implements cooldown to prevent food spam
- Protects food consumption animation from interruption

#### Protected Chest System
- Register chests as "protected" storage locations
- Track chest positions and types (storage, food, valuables)
- Automatic storage of valuable items in protected chests

#### Mob Food Protection
- Detects dropped food items nearby
- Automatically collects food to prevent mob pickup
- Monitors for entities trying to access stored food

#### Valuable Item Protection
Automatically protects and stores:
- Diamonds, emeralds, gold, iron
- Netherite items and scrap
- Enchanted items
- Rare blocks and ores

### API Usage

```javascript
// Check if it's safe to eat
if (systems.itemProtection.canSafelyEat()) {
    await systems.itemProtection.safelyEatFood();
}

// Register a protected chest
systems.itemProtection.registerProtectedChest(position, 'storage');

// Store valuable items
await systems.itemProtection.storeValuableItems();

// Get protection status
const status = systems.itemProtection.getProtectionStatus();
console.log(`Safe to eat: ${status.safeToEat}`);
console.log(`Nearby players: ${status.nearbyPlayers}`);
```

### Safety Conditions

Food consumption is blocked when:
- Players are within 16 blocks
- Hostile mobs are within 16 blocks  
- Bot is currently in combat
- Food consumption cooldown is active (3 seconds)

### Integration

The protection system integrates with:
- **Behavior System**: Safe eating in `findAndEatFood()`
- **Safety Monitor**: Health and food level checks
- **Inventory Manager**: Food detection and consumption
- **Combat System**: Combat state awareness

---

## Advanced Crafting Recipes

Extended crafting system with 15+ new advanced structures and utilities.

### Utility Structures

#### Beacon
```javascript
await systems.crafting.craftBeacon();
```
**Requirements**: 5 glass, 3 obsidian, 1 nether star  
**Purpose**: Provides area buffs and effects

#### Anvil
```javascript
await systems.crafting.craftAnvil();
```
**Requirements**: 31 iron ingots (3 iron blocks + 4 ingots)  
**Purpose**: Repair and rename tools/items

#### Brewing Stand
```javascript
await systems.crafting.craftBrewingStand();
```
**Requirements**: 1 blaze rod, 3 cobblestone  
**Purpose**: Create potions

#### Enchantment Table
```javascript
await systems.crafting.craftEnchantmentTable();
```
**Requirements**: 1 book, 2 diamonds, 4 obsidian  
**Purpose**: Enchant tools and armor

### Automation Components

#### Hopper
```javascript
await systems.crafting.craftHopper();
```
**Requirements**: 5 iron ingots, 1 chest  
**Purpose**: Automated item transfer

#### Blast Furnace
```javascript
await systems.crafting.craftBlastFurnace();
```
**Requirements**: 5 iron ingots, 1 furnace, 3 smooth stone  
**Purpose**: 2x faster ore smelting

#### Smoker
```javascript
await systems.crafting.craftSmoker();
```
**Requirements**: 1 furnace, 4 logs  
**Purpose**: 2x faster food cooking

#### Composter
```javascript
await systems.crafting.craftComposter();
```
**Requirements**: 7 planks  
**Purpose**: Convert crops to bone meal

### Building Materials

#### Fence
```javascript
await systems.crafting.craftFence(16); // Craft 16 fence pieces
```
**Requirements**: 4 planks + 2 sticks per 3 fences  
**Purpose**: Base perimeter protection

#### Fence Gate
```javascript
await systems.crafting.craftFenceGate(1);
```
**Requirements**: 2 planks, 4 sticks  
**Purpose**: Controlled entry points

#### Ladder
```javascript
await systems.crafting.craftLadder(3); // Craft 3 sets (9 ladders)
```
**Requirements**: 7 sticks per 3 ladders  
**Purpose**: Vertical access

#### Scaffolding
```javascript
await systems.crafting.craftScaffolding(6);
```
**Requirements**: 6 bamboo, 1 string  
**Purpose**: Temporary building platform

### Enchanting Setup

#### Bookshelf
```javascript
await systems.crafting.craftBookshelf(15); // For max enchanting
```
**Requirements**: 6 planks + 3 books per bookshelf  
**Purpose**: Increase enchantment levels

#### Lectern
```javascript
await systems.crafting.craftLectern();
```
**Requirements**: 4 planks, 1 bookshelf  
**Purpose**: Hold and read books

#### Grindstone
```javascript
await systems.crafting.craftGrindstone();
```
**Requirements**: 2 sticks, 2 stone, 2 planks  
**Purpose**: Remove enchantments, repair items

#### Cartography Table
```javascript
await systems.crafting.craftCartographyTable();
```
**Requirements**: 2 paper, 4 planks  
**Purpose**: Clone and modify maps

### Usage in Behavior System

The behavior system automatically calls these crafting methods when:
- Building advanced base structures
- Setting up enchanting area
- Creating automation systems
- Improving base defenses

### Material Efficiency

The system intelligently:
- Uses best available wood types for planks
- Crafts intermediate materials as needed
- Batches crafting for efficiency
- Notifies about missing materials

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Google Gemini AI (optional)
GEMINI_API_KEY=your_api_key_here

# Existing settings
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AutoBot
MIN_HEALTH_PERCENT=60
MIN_FOOD_LEVEL=10
```

### System Initialization

All new systems are automatically initialized in `index.js`:

```javascript
// Gemini AI
this.systems.geminiAI = new GeminiAI(config.geminiApiKey, notifier);

// Item Protection
this.systems.itemProtection = new ItemProtection(bot, notifier, inventory);
```

---

## Telegram Notifications

New notification types added:

```
🤖 AI: gather_wood - Need resources for base building
⚠️ Player nearby: Steve. Protecting items.
⚠️ Not safe to eat right now (threats nearby)
🔮 Crafted beacon!
⚒️ Crafted anvil for tool repair!
🧪 Crafted brewing stand!
✨ Crafted enchantment table!
📚 Crafted 15 bookshelves for enchanting!
🔥 Crafted blast furnace for faster smelting!
```

---

## Performance Impact

### AI Integration
- Minimal impact: AI consulted every 10 decisions
- Async operations don't block gameplay
- Caches recent decisions to reduce API calls

### Item Protection
- Lightweight monitoring (5-second intervals)
- Efficient entity filtering
- No performance impact on normal operations

### Advanced Crafting
- No performance overhead
- On-demand crafting only
- Smart material checking prevents wasteful attempts

---

## Troubleshooting

### Gemini AI Not Working
1. Check API key is valid and added to `.env`
2. Verify internet connectivity
3. Check API quota limits (free tier)
4. Look for error messages in console

### Food Not Being Eaten
1. Check if threats are nearby (expected behavior)
2. Verify food is in inventory
3. Check cooldown hasn't just triggered
4. Look for "Not safe to eat" messages

### Crafting Fails
1. Verify required materials are in inventory
2. Check if crafting table is accessible
3. Ensure proper material types (e.g., planks vs logs)
4. Check console for specific error messages

---

## Future Enhancements

Potential improvements for future versions:

1. **AI Learning**: Store AI decisions and outcomes for pattern learning
2. **Multi-player coordination**: Protect items in shared bases
3. **Advanced security**: Encrypted chest access with passwords
4. **Recipe discovery**: AI suggests new recipes based on rare finds
5. **Smart caching**: Cache AI responses for similar situations

---

## Credits

- **Google Gemini AI**: AI decision-making powered by Google's Gemini Flash model
- **Item Protection**: Original implementation for autonomous bot protection
- **Advanced Crafting**: Extended recipe system for complex structures

---

## License

Same as main project (MIT License)
