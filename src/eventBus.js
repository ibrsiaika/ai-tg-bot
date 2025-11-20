const EventEmitter = require('events');

/**
 * Central Event Bus
 * Enables decoupled system communication via event-driven architecture
 */
class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Support many systems
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        this.listeners = new Map(); // Track listeners for debugging
    }

    /**
     * Emit an event and store in history
     */
    emit(eventName, ...args) {
        // Store in history
        this.eventHistory.push({
            event: eventName,
            timestamp: Date.now(),
            data: args[0] // Store first argument only to avoid memory issues
        });

        // Trim history if too large
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }

        // Emit the event
        return super.emit(eventName, ...args);
    }

    /**
     * Register event listener with tracking
     */
    on(eventName, listener) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(listener.name || 'anonymous');
        return super.on(eventName, listener);
    }

    /**
     * Get recent event history
     */
    getHistory(eventName = null, limit = 100) {
        let history = this.eventHistory;
        
        if (eventName) {
            history = history.filter(e => e.event === eventName);
        }

        return history.slice(-limit);
    }

    /**
     * Get all registered event types
     */
    getEventTypes() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get listener count for an event
     */
    getListenerInfo(eventName) {
        return {
            count: this.listenerCount(eventName),
            listeners: this.listeners.get(eventName) || []
        };
    }

    /**
     * Clear all event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
}

// Event type constants for type safety
EventBus.EVENTS = {
    // System events
    SYSTEM_INITIALIZED: 'system:initialized',
    SYSTEM_ERROR: 'system:error',
    SYSTEM_WARNING: 'system:warning',
    
    // Bot events
    BOT_SPAWNED: 'bot:spawned',
    BOT_HEALTH_CHANGED: 'bot:health_changed',
    BOT_FOOD_CHANGED: 'bot:food_changed',
    BOT_DIED: 'bot:died',
    BOT_RESPAWNED: 'bot:respawned',
    BOT_POSITION_CHANGED: 'bot:position_changed',
    
    // Resource events
    RESOURCE_FOUND: 'resource:found',
    RESOURCE_GATHERED: 'resource:gathered',
    RESOURCE_DEPLETED: 'resource:depleted',
    
    // Decision events
    DECISION_MADE: 'decision:made',
    DECISION_COMPLETED: 'decision:completed',
    DECISION_FAILED: 'decision:failed',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    ERROR_RECOVERED: 'error:recovered',
    
    // Combat events
    COMBAT_STARTED: 'combat:started',
    COMBAT_ENDED: 'combat:ended',
    MOB_DEFEATED: 'mob:defeated',
    DAMAGE_TAKEN: 'damage:taken',
    
    // Crafting events
    CRAFT_STARTED: 'craft:started',
    CRAFT_COMPLETED: 'craft:completed',
    CRAFT_FAILED: 'craft:failed',
    
    // Trading events (for future use)
    TRADE_STARTED: 'trade:started',
    TRADE_COMPLETED: 'trade:completed',
    TRADE_FAILED: 'trade:failed',
    
    // Mining events
    MINING_STARTED: 'mining:started',
    MINING_COMPLETED: 'mining:completed',
    ORE_FOUND: 'ore:found',
    
    // Building events
    BUILD_STARTED: 'build:started',
    BUILD_COMPLETED: 'build:completed',
    
    // Exploration events
    CHUNK_EXPLORED: 'chunk:explored',
    STRUCTURE_FOUND: 'structure:found',
    BIOME_DISCOVERED: 'biome:discovered',
    
    // Inventory events
    ITEM_ACQUIRED: 'item:acquired',
    ITEM_USED: 'item:used',
    INVENTORY_FULL: 'inventory:full',
    
    // Performance events
    METRIC_RECORDED: 'metric:recorded',
    PERFORMANCE_WARNING: 'performance:warning'
};

module.exports = EventBus;
