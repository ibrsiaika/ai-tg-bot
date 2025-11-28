/**
 * System Base Class
 * Provides common functionality for all bot systems
 * - Standardized error handling
 * - Lifecycle management
 * - Logging integration
 * - Event emission
 */
class SystemBase {
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;
        this.initialized = false;
        this.destroyed = false;
        this.intervals = [];
        this.timeouts = [];
        this.listeners = [];
        this.logger = options.logger || console;
        this.eventBus = options.eventBus || null;
    }

    /**
     * Initialize the system
     * Override in subclass for custom initialization
     */
    async initialize() {
        if (this.initialized) {
            this.log('warn', `${this.name} already initialized`);
            return;
        }
        
        this.log('info', `Initializing ${this.name}`);
        this.initialized = true;
        this.emit('system:initialized', { name: this.name });
    }

    /**
     * Destroy the system and cleanup resources
     */
    async destroy() {
        if (this.destroyed) {
            return;
        }

        this.log('info', `Destroying ${this.name}`);

        // Clear all intervals
        for (const interval of this.intervals) {
            clearInterval(interval);
        }
        this.intervals = [];

        // Clear all timeouts
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.timeouts = [];

        // Remove all event listeners
        for (const { emitter, event, handler } of this.listeners) {
            if (emitter && typeof emitter.off === 'function') {
                emitter.off(event, handler);
            } else if (emitter && typeof emitter.removeListener === 'function') {
                emitter.removeListener(event, handler);
            }
        }
        this.listeners = [];

        this.destroyed = true;
        this.initialized = false;
        this.emit('system:destroyed', { name: this.name });
    }

    /**
     * Register an interval that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} ms - Interval in milliseconds
     * @returns {NodeJS.Timeout}
     */
    setInterval(callback, ms) {
        const interval = setInterval(callback, ms);
        this.intervals.push(interval);
        return interval;
    }

    /**
     * Register a timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} ms - Timeout in milliseconds
     * @returns {NodeJS.Timeout}
     */
    setTimeout(callback, ms) {
        const timeout = setTimeout(() => {
            // Remove from array after execution
            const index = this.timeouts.indexOf(timeout);
            if (index > -1) {
                this.timeouts.splice(index, 1);
            }
            callback();
        }, ms);
        this.timeouts.push(timeout);
        return timeout;
    }

    /**
     * Register an event listener that will be cleaned up on destroy
     * @param {EventEmitter} emitter - Event emitter
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(emitter, event, handler) {
        if (emitter && typeof emitter.on === 'function') {
            emitter.on(event, handler);
            this.listeners.push({ emitter, event, handler });
        }
    }

    /**
     * Log a message with the system name prefix
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} message - Message to log
     * @param {Object} [metadata] - Additional metadata
     */
    log(level, message, metadata = {}) {
        const logMessage = `[${this.name}] ${message}`;
        
        if (this.logger && typeof this.logger.log === 'function') {
            this.logger.log(level, logMessage, metadata);
        } else if (this.logger) {
            const logFn = this.logger[level] || this.logger.log || console.log;
            if (Object.keys(metadata).length > 0) {
                logFn(logMessage, metadata);
            } else {
                logFn(logMessage);
            }
        }
    }

    /**
     * Emit an event via the EventBus
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit(event, { ...data, source: this.name });
        }
    }

    /**
     * Handle an error with standardized error handling
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     * @returns {boolean} Whether the error was handled
     */
    handleError(error, context = {}) {
        // Ignore protocol errors
        if (this.isProtocolError(error)) {
            this.log('debug', 'Protocol error suppressed', { error: error.message });
            return true;
        }

        // Log the error
        this.log('error', error.message, { 
            stack: error.stack,
            context,
            name: this.name
        });

        // Emit error event
        this.emit('system:error', {
            name: this.name,
            error: error.message,
            context
        });

        return false;
    }

    /**
     * Check if an error is a non-fatal protocol error
     * @param {Error} error - Error to check
     * @returns {boolean}
     */
    isProtocolError(error) {
        return error.name === 'PartialReadError' ||
               error.message?.includes('PartialReadError') ||
               error.message?.includes('Read error') ||
               error.message?.includes('goal was changed');
    }

    /**
     * Sleep for a specified duration
     * @param {number} ms - Duration in milliseconds
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => this.setTimeout(resolve, ms));
    }

    /**
     * Get system status
     * @returns {Object}
     */
    getStatus() {
        return {
            name: this.name,
            initialized: this.initialized,
            destroyed: this.destroyed,
            intervals: this.intervals.length,
            timeouts: this.timeouts.length,
            listeners: this.listeners.length
        };
    }
}

module.exports = SystemBase;
