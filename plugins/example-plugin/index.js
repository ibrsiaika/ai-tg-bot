const { BasePlugin } = require('../../src/pluginManager');

/**
 * Example Plugin
 * Demonstrates how to create custom bot behaviors
 */
class ExamplePlugin extends BasePlugin {
    constructor(bot, systems) {
        super(bot, systems);
        this.messageCount = 0;
        this.greetingInterval = null;
    }

    /**
     * Called when plugin is loaded
     */
    async onLoad() {
        console.log('📦 Example Plugin loading...');
        
        // Access bot systems
        const { eventBus, notifier } = this.systems;
        
        // Listen to events
        if (eventBus) {
            eventBus.on('bot:spawned', this.onBotSpawned.bind(this));
            eventBus.on('resource:gathered', this.onResourceGathered.bind(this));
            console.log('✓ Registered event listeners');
        }

        // Start periodic greeting
        this.startPeriodicGreeting();
        
        // Notify load complete
        if (notifier) {
            await notifier.send('🔌 Example Plugin loaded successfully!');
        }
        
        console.log('✓ Example Plugin loaded');
    }

    /**
     * Called when plugin is unloaded
     */
    async onUnload() {
        console.log('Unloading Example Plugin...');
        
        // Stop periodic greeting
        if (this.greetingInterval) {
            clearInterval(this.greetingInterval);
        }
        
        // Clean up event listeners
        const { eventBus } = this.systems;
        if (eventBus) {
            eventBus.removeAllListeners('bot:spawned');
            eventBus.removeAllListeners('resource:gathered');
        }
        
        console.log('✓ Example Plugin unloaded');
    }

    /**
     * Get plugin name
     */
    getName() {
        return 'Example Plugin';
    }

    /**
     * Get plugin version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Event handler: Bot spawned
     */
    onBotSpawned(data) {
        console.log('🤖 Example Plugin: Bot spawned event received');
        this.messageCount++;
    }

    /**
     * Event handler: Resource gathered
     */
    onResourceGathered(data) {
        console.log(`🌲 Example Plugin: Resource gathered - ${data.resource || 'unknown'}`);
        this.messageCount++;
        
        // Custom behavior: Celebrate every 10 resources
        if (this.messageCount % 10 === 0) {
            console.log('🎉 Example Plugin: 10 resources milestone!');
            if (this.systems.notifier) {
                this.systems.notifier.send(`🎉 ${this.messageCount} events processed by Example Plugin!`);
            }
        }
    }

    /**
     * Custom behavior: Periodic greeting
     */
    startPeriodicGreeting() {
        // Send greeting every 5 minutes
        this.greetingInterval = setInterval(() => {
            console.log('👋 Example Plugin: Periodic greeting');
            
            if (this.systems.notifier) {
                this.systems.notifier.send('👋 Example Plugin is still active!');
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Custom method: Get plugin statistics
     */
    getStats() {
        return {
            name: this.getName(),
            version: this.getVersion(),
            eventsProcessed: this.messageCount,
            active: !!this.greetingInterval
        };
    }
}

module.exports = ExamplePlugin;
