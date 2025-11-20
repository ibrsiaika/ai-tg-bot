# Plugin Development Guide

This guide explains how to create custom plugins for the Autonomous Minecraft Bot v4.0.0.

## Overview

The plugin system allows you to extend bot functionality without modifying core code. Plugins can:
- Listen to bot events
- Access all bot systems
- Add custom behaviors
- Integrate with the event bus

## Creating a Plugin

### 1. Directory Structure

Create a new directory in the `plugins/` folder:

```
plugins/
└── my-custom-plugin/
    ├── package.json
    ├── index.js
    └── README.md (optional)
```

### 2. Package.json

Define your plugin metadata:

```json
{
  "name": "my-custom-plugin",
  "version": "1.0.0",
  "description": "My custom bot behavior",
  "main": "index.js",
  "author": "Your Name",
  "botVersion": "4.0.0",
  "keywords": ["minecraft", "bot", "plugin"]
}
```

### 3. Plugin Class

Extend the `BasePlugin` class:

```javascript
const { BasePlugin } = require('../../src/pluginManager');

class MyCustomPlugin extends BasePlugin {
    constructor(bot, systems) {
        super(bot, systems);
        // Initialize your plugin state
    }

    async onLoad() {
        // Called when plugin loads
        console.log('My plugin is loading...');
        
        // Access systems
        const { eventBus, notifier, storage } = this.systems;
        
        // Register event listeners
        if (eventBus) {
            eventBus.on('resource:gathered', this.onResourceGathered.bind(this));
        }
    }

    async onUnload() {
        // Called when plugin unloads
        console.log('My plugin is unloading...');
        
        // Clean up resources
        // Remove event listeners
    }

    getName() {
        return 'My Custom Plugin';
    }

    getVersion() {
        return '1.0.0';
    }

    // Your custom methods
    onResourceGathered(data) {
        console.log('Resource gathered:', data.resource);
    }
}

module.exports = MyCustomPlugin;
```

## Available Systems

Your plugin has access to all bot systems:

- `this.bot` - Mineflayer bot instance
- `this.systems.eventBus` - Event system
- `this.systems.storage` - Persistent storage
- `this.systems.notifier` - Telegram notifications
- `this.systems.inventory` - Inventory manager
- `this.systems.crafting` - Crafting system
- `this.systems.mining` - Mining system
- `this.systems.combat` - Combat system
- `this.systems.trading` - Trading system (v4.0.0)
- `this.systems.redstone` - Redstone automation (v4.0.0)
- And 30+ more systems...

## Event Bus Events

Listen to these events:

### System Events
- `system:initialized` - System startup complete
- `system:error` - System error occurred
- `system:warning` - System warning

### Bot Events
- `bot:spawned` - Bot spawned in world
- `bot:health_changed` - Health changed
- `bot:died` - Bot died

### Resource Events
- `resource:found` - Resource discovered
- `resource:gathered` - Resource collected

### Decision Events
- `decision:made` - Decision made
- `decision:completed` - Decision completed

### Combat Events
- `combat:started` - Combat started
- `mob:defeated` - Mob defeated

### Trading Events
- `trade:started` - Trade session started
- `trade:completed` - Trade completed

## Example: Auto-Smelter Plugin

```javascript
const { BasePlugin } = require('../../src/pluginManager');

class AutoSmelterPlugin extends BasePlugin {
    async onLoad() {
        const { eventBus, crafting } = this.systems;
        
        eventBus.on('resource:gathered', async (data) => {
            if (data.resource === 'iron_ore') {
                console.log('Smelting iron ore...');
                await crafting.smeltItem('iron_ore', 'iron_ingot');
            }
        });
    }

    async onUnload() {
        this.systems.eventBus.removeAllListeners('resource:gathered');
    }

    getName() { return 'Auto Smelter'; }
    getVersion() { return '1.0.0'; }
}

module.exports = AutoSmelterPlugin;
```

## Testing Your Plugin

1. Place your plugin in `plugins/your-plugin-name/`
2. Restart the bot - plugins auto-load on startup
3. Check logs for load confirmation
4. Watch for your plugin's console output

## Plugin Lifecycle

1. **Discovery** - Plugin manager scans plugins directory
2. **Validation** - Checks package.json and compatibility
3. **Loading** - Instantiates plugin class
4. **Initialization** - Calls `onLoad()`
5. **Running** - Plugin handles events
6. **Unloading** - Calls `onUnload()` on shutdown

## Best Practices

1. **Error Handling** - Wrap your code in try-catch blocks
2. **Cleanup** - Always remove event listeners in `onUnload()`
3. **Performance** - Avoid blocking the event loop
4. **Logging** - Use console.log for debugging
5. **Version** - Specify compatible bot version in package.json

## Troubleshooting

**Plugin not loading?**
- Check package.json is valid JSON
- Ensure main file exists
- Check bot version compatibility
- Look for errors in console

**Events not firing?**
- Verify event name is correct
- Check event bus is available
- Ensure listener is registered in onLoad()

## Publishing Your Plugin

Share your plugin with the community:
1. Create a GitHub repository
2. Add comprehensive README
3. Include example usage
4. Tag with `minecraft-bot-plugin`

## Support

For help developing plugins:
- Check example plugin in `plugins/example-plugin/`
- Review event bus documentation
- Join community discussions
