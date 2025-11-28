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
        this.maxHistorySize = 500; // Reduced from 1000 to save memory
        this.listeners = new Map(); // Track listeners for debugging
        this.MAX_LISTENER_TYPES = 100; // Limit event types tracked
    }

    /**
     * Emit an event and store in history
     */
    emit(eventName, ...args) {
        // Store in history - store first argument only to avoid memory issues
        this.eventHistory.push({
            event: eventName,
            timestamp: Date.now(),
            data: args[0] // Store first argument only
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
        // Limit tracked event types to prevent memory leak
        if (!this.listeners.has(eventName)) {
            if (this.listeners.size >= this.MAX_LISTENER_TYPES) {
                // Try to remove an event type with no listeners
                let removed = false;
                for (const [key, value] of this.listeners) {
                    if (!value || value.length === 0) {
                        this.listeners.delete(key);
                        removed = true;
                        break;
                    }
                }
                // Fallback: remove first entry if no empty ones found
                if (!removed && this.listeners.size >= this.MAX_LISTENER_TYPES) {
                    const firstKey = this.listeners.keys().next().value;
                    if (firstKey) {
                        this.listeners.delete(firstKey);
                    }
                }
            }
            this.listeners.set(eventName, []);
        }
        
        const listenerList = this.listeners.get(eventName);
        // Limit listeners tracked per event
        if (listenerList.length < 20) {
            listenerList.push(listener.name || 'anonymous');
        }
        
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
    PERFORMANCE_WARNING: 'performance:warning',
    
    // ML events
    ML_INITIALIZED: 'ml:initialized',
    ML_PREDICTION: 'ml:prediction',
    ML_ERROR: 'ml:error'
};

// Create singleton instance for global event communication
const globalEventBus = new EventBus();

// Attach static methods that delegate to the singleton instance
// This allows using EventBus.emit() and EventBus.on() directly
EventBus.emit = (...args) => globalEventBus.emit(...args);
EventBus.on = (...args) => globalEventBus.on(...args);
EventBus.once = (...args) => globalEventBus.once(...args);
EventBus.off = (...args) => globalEventBus.off(...args);
EventBus.removeListener = (...args) => globalEventBus.removeListener(...args);
EventBus.removeAllListeners = (...args) => globalEventBus.removeAllListeners(...args);
EventBus.listeners = (...args) => globalEventBus.listeners(...args);
EventBus.listenerCount = (...args) => globalEventBus.listenerCount(...args);
EventBus.getHistory = (...args) => globalEventBus.getHistory(...args);
EventBus.getEventTypes = () => globalEventBus.getEventTypes();
EventBus.getListenerInfo = (...args) => globalEventBus.getListenerInfo(...args);
EventBus.clearHistory = () => globalEventBus.clearHistory();

// Export the class (which now has static methods delegating to singleton)
// Also export the singleton instance for explicit access
EventBus.getInstance = () => globalEventBus;

module.exports = EventBus;
