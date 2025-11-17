# Behavior Customization Guide

Learn how to customize the bot's autonomous behavior to match your preferences.

## Understanding the Behavior System

The bot uses a **priority-based goal system** defined in `src/behavior.js`. Goals are evaluated every 5 seconds, and the highest priority goal is executed.

### Priority Levels

```javascript
CRITICAL: 100  // Safety, health, food
HIGH: 75       // Essential tools, inventory full
MEDIUM: 50     // Resource gathering, mining, farming
LOW: 25        // Exploration, base expansion
```

## Customizing Goal Probabilities

In `src/behavior.js`, you'll find random probability checks that determine if a goal is added to the queue:

```javascript
// Mining goals (30% chance)
if (Math.random() < 0.3) {
    goals.push({
        name: 'mine_resources',
        priority: this.priorities.MEDIUM,
        action: async () => await this.mineResources()
    });
}
```

### Making the Bot Mine More

Change the probability from 0.3 to a higher value:
```javascript
if (Math.random() < 0.7) {  // Now 70% chance
```

### Making the Bot Farm More

Increase farming probability:
```javascript
// Change from 0.2 to 0.5 (50% chance)
if (Math.random() < 0.5) {
    goals.push({
        name: 'auto_farm',
        priority: this.priorities.MEDIUM,
        action: async () => await this.systems.farming.autoFarm()
    });
}
```

### Making the Bot Build More

Increase building probability:
```javascript
// Change from 0.15 to 0.4 (40% chance)
if (Math.random() < 0.4) {
    goals.push({
        name: 'expand_base',
        priority: this.priorities.LOW,
        action: async () => await this.expandBase()
    });
}
```

## Adding Custom Goals

### Example: Always Collect Diamonds

Add a new goal in the `chooseNextGoal()` method:

```javascript
// Add after existing goals
goals.push({
    name: 'seek_diamonds',
    priority: this.priorities.HIGH,
    action: async () => {
        console.log('Seeking diamonds');
        await this.systems.gathering.mineOre('diamond', 128);
    }
});
```

### Example: Periodic Base Building

Add a scheduled goal:

```javascript
// In BehaviorManager constructor, add:
this.lastBaseExpansion = Date.now();

// In chooseNextGoal(), add:
const timeSinceExpansion = Date.now() - this.lastBaseExpansion;
if (timeSinceExpansion > 600000) { // Every 10 minutes
    goals.push({
        name: 'scheduled_expansion',
        priority: this.priorities.MEDIUM,
        action: async () => {
            await this.expandBase();
            this.lastBaseExpansion = Date.now();
        }
    });
}
```

## Adjusting Resource Gathering

### Collect More Wood

In `src/gathering.js`, modify the `collectWood` function call:

```javascript
// In behavior.js, change from 20 to 64
await this.systems.gathering.collectWood(64)
```

### Focus on Specific Ores

Create a custom mining strategy:

```javascript
async mineSpecificOres() {
    // Prioritize valuable ores
    await this.systems.gathering.mineOre('diamond', 128);
    await this.systems.gathering.mineOre('iron', 64);
    await this.systems.gathering.mineOre('gold', 32);
}
```

Then use it in a goal:
```javascript
goals.push({
    name: 'mine_valuable_ores',
    priority: this.priorities.HIGH,
    action: async () => await this.mineSpecificOres()
});
```

## Modifying Safety Settings

### Change Health Threshold

In `.env`:
```env
MIN_HEALTH_PERCENT=80  # More cautious (default: 60)
```

Or in code (`src/safety.js`):
```javascript
constructor(bot, minHealthPercent = 80, minFoodLevel = 15) {
```

### Adjust Danger Detection Range

In `src/safety.js`, modify the detection radius:

```javascript
async checkNearbyDangers() {
    const hostileMobs = Object.values(this.bot.entities).filter(entity => {
        // Change from 16 to 32 for earlier detection
        const distance = this.bot.entity.position.distanceTo(entity.position);
        const isHostile = this.isHostileMob(entity);
        return isHostile && distance < 32;
    });
```

## Combat Behavior

### More Aggressive Combat

In `src/behavior.js`, increase combat priority:

```javascript
// Check for nearby threats more often
const threats = await this.safety.checkNearbyDangers();
if (threats.length > 0) {
    goals.push({
        name: 'engage_combat',
        priority: this.priorities.HIGH,  // Changed from handling in safety
        action: async () => await this.systems.combat.engageCombat(threats)
    });
}
```

### Always Equip Shield

In `src/combat.js`, auto-equip shield:

```javascript
async engageCombat(threats) {
    await this.equipShield();  // Add this line
    await this.inventory.equipBestWeapon();
    // ... rest of code
}
```

## Building Customization

### Larger Starter Base

In `src/building.js`, modify the `buildStarterBase` function:

```javascript
async buildStarterBase(centerPos) {
    const baseSize = 15;  // Changed from 7
    const wallHeight = 4;  // Changed from 3
    // ... rest of code
}
```

### Auto-Build Specific Structures

Add a new goal for specific builds:

```javascript
goals.push({
    name: 'build_tower',
    priority: this.priorities.LOW,
    action: async () => {
        const pos = this.bot.entity.position;
        await this.buildTower(pos, 20);  // 20 blocks high
    }
});
```

## Farming Preferences

### Focus on Specific Crops

In `src/farming.js`, modify planting preferences:

```javascript
async autoFarm() {
    // Always plant carrots instead of wheat
    await this.plantCrops(centerPos, farmSize, farmSize, 'carrot');
}
```

### Larger Farms

In `src/behavior.js`, build bigger farms:

```javascript
async expandBase() {
    const farmSize = 15;  // Changed from 9
    await this.systems.building.buildFarm(pos.offset(10, 0, 10), farmSize, farmSize);
}
```

## Inventory Preferences

### Keep More Resources

In `src/inventory.js`, modify junk thresholds:

```javascript
async tossJunk() {
    const junkItems = [
        'dirt', 'cobblestone', 'gravel'  // Removed valuable items
    ];
    
    // Increase keeper stack size
    if (count > 128) {  // Changed from 64
```

### Priority Crafting

Add auto-crafting checks:

```javascript
async manageInventory() {
    await this.systems.inventory.tossJunk();
    
    // Always keep torches available
    const torchCount = await this.systems.inventory.countItem('torch');
    if (torchCount < 16) {
        await this.systems.crafting.craftTorches();
    }
    
    // Auto-craft beds
    const hasBed = await this.systems.inventory.hasItem('bed');
    if (!hasBed) {
        await this.systems.crafting.craftItem('bed');
    }
}
```

## Advanced Customization

### State Tracking

Add persistent state to remember goals:

```javascript
// In BehaviorManager constructor
this.stats = {
    woodCollected: 0,
    stonesMinedined: 0,
    diamondsFound: 0,
    basesBuilt: 0
};

// In goals
goals.push({
    name: 'milestone_check',
    priority: this.priorities.LOW,
    action: async () => {
        if (this.stats.diamondsFound >= 10) {
            await this.notifier.send('Milestone: 10 diamonds collected!');
            await this.systems.building.buildTower(this.bot.entity.position, 30);
        }
    }
});
```

### Time-Based Behavior

```javascript
// Add day/night cycle awareness
const timeOfDay = this.bot.time.timeOfDay;
const isNight = timeOfDay > 13000 && timeOfDay < 23000;

if (isNight) {
    goals.push({
        name: 'night_mining',
        priority: this.priorities.MEDIUM,
        action: async () => await this.systems.mining.branchMine(12, 50)
    });
} else {
    goals.push({
        name: 'day_gathering',
        priority: this.priorities.MEDIUM,
        action: async () => await this.systems.gathering.collectWood(32)
    });
}
```

## Testing Your Changes

1. Make changes to the relevant files
2. Save the files
3. Restart the bot with `npm start`
4. Watch the console output to see new behavior
5. Monitor Telegram notifications

## Debugging Tips

Add console logs to track behavior:

```javascript
console.log(`[BEHAVIOR] Chose goal: ${goal.name} with priority: ${goal.priority}`);
```

Enable verbose logging:

```javascript
async executeGoal(goal) {
    console.log(`[START] ${goal.name} at ${new Date().toISOString()}`);
    const startTime = Date.now();
    
    await goal.action();
    
    const duration = Date.now() - startTime;
    console.log(`[COMPLETE] ${goal.name} took ${duration}ms`);
}
```

## Example: Resource-Focused Bot

Complete example configuration for a bot that focuses on resource gathering:

```javascript
async chooseNextGoal() {
    const goals = [];
    
    // Safety first (always)
    if (!this.safety.isSafe()) {
        goals.push({
            name: 'safety_first',
            priority: this.priorities.CRITICAL,
            action: async () => await this.handleSafetyIssue()
        });
    }
    
    // High probability resource gathering
    if (Math.random() < 0.8) {
        const resourceType = Math.random();
        if (resourceType < 0.4) {
            goals.push({
                name: 'mine_ores',
                priority: this.priorities.HIGH,
                action: async () => await this.systems.gathering.searchForValuableOres()
            });
        } else if (resourceType < 0.7) {
            goals.push({
                name: 'collect_wood',
                priority: this.priorities.MEDIUM,
                action: async () => await this.systems.gathering.collectWood(64)
            });
        } else {
            goals.push({
                name: 'mine_stone',
                priority: this.priorities.MEDIUM,
                action: async () => await this.systems.gathering.mineStone(128)
            });
        }
    }
    
    // Less building, more gathering
    if (Math.random() < 0.05) {
        goals.push({
            name: 'minimal_base',
            priority: this.priorities.LOW,
            action: async () => await this.systems.building.buildStarterBase(this.bot.entity.position)
        });
    }
    
    goals.sort((a, b) => b.priority - a.priority);
    return goals[0];
}
```

Remember: After making changes, always restart the bot for them to take effect!
