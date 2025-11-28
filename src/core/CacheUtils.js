/**
 * Memoization Cache
 * Provides caching for expensive calculations with TTL support
 */
class MemoCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.misses++;
            return undefined;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }

        this.hits++;
        return entry.value;
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} [ttl] - Time to live in ms
     */
    set(key, value, ttl = this.defaultTTL) {
        // Enforce max size
        if (this.cache.size >= this.maxSize) {
            this._evictOldest();
        }

        this.cache.set(key, {
            value,
            expiresAt: ttl > 0 ? Date.now() + ttl : null,
            createdAt: Date.now()
        });
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Delete a key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : 'N/A'
        };
    }

    /**
     * Evict oldest entries to make room
     * @private
     */
    _evictOldest() {
        // Remove 20% of oldest entries
        const entriesToRemove = Math.max(1, Math.floor(this.maxSize * 0.2));
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].createdAt - b[1].createdAt);
        
        for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Create a memoized version of a function
 * @param {Function} fn - Function to memoize
 * @param {Object} options - Memoization options
 * @returns {Function} Memoized function
 */
function memoize(fn, options = {}) {
    const cache = new MemoCache(options);
    const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

    const memoized = function(...args) {
        const key = keyGenerator(...args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn.apply(this, args);
        
        // Handle promises
        if (result instanceof Promise) {
            return result.then(value => {
                cache.set(key, value);
                return value;
            });
        }

        cache.set(key, result);
        return result;
    };

    memoized.cache = cache;
    memoized.clear = () => cache.clear();
    memoized.getStats = () => cache.getStats();

    return memoized;
}

/**
 * Object Pool for reusable objects
 * Reduces garbage collection pressure
 */
class ObjectPool {
    constructor(factory, options = {}) {
        this.factory = factory;
        this.pool = [];
        this.maxSize = options.maxSize || 100;
        this.created = 0;
        this.reused = 0;
        this.reset = options.reset || ((obj) => obj);
    }

    /**
     * Acquire an object from the pool
     * @returns {*} Object instance
     */
    acquire() {
        if (this.pool.length > 0) {
            this.reused++;
            return this.pool.pop();
        }
        
        this.created++;
        return this.factory();
    }

    /**
     * Release an object back to the pool
     * @param {*} obj - Object to release
     */
    release(obj) {
        if (this.pool.length < this.maxSize) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }

    /**
     * Get pool statistics
     * @returns {Object}
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            maxSize: this.maxSize,
            created: this.created,
            reused: this.reused,
            reuseRate: this.created > 0 
                ? (this.reused / (this.created + this.reused) * 100).toFixed(1) + '%' 
                : 'N/A'
        };
    }

    /**
     * Clear the pool
     */
    clear() {
        this.pool = [];
    }
}

/**
 * Debounce function - delays execution until after wait period
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(fn, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Throttle function - limits execution rate
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function} Throttled function
 */
function throttle(fn, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return fn.apply(this, args);
        }
    };
}

/**
 * Delta-based sync helper
 * Only transmits changed values
 */
class DeltaSync {
    constructor() {
        this.lastState = {};
    }

    /**
     * Get delta between current and last state
     * @param {Object} currentState - Current state object
     * @returns {Object|null} Delta object or null if no changes
     */
    getDelta(currentState) {
        const delta = {};
        let hasChanges = false;

        for (const [key, value] of Object.entries(currentState)) {
            const lastValue = this.lastState[key];
            
            // Deep comparison for objects
            if (typeof value === 'object' && value !== null) {
                const serialized = JSON.stringify(value);
                const lastSerialized = JSON.stringify(lastValue);
                
                if (serialized !== lastSerialized) {
                    delta[key] = value;
                    hasChanges = true;
                }
            } else if (value !== lastValue) {
                delta[key] = value;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.lastState = { ...currentState };
            return delta;
        }

        return null;
    }

    /**
     * Reset the last state
     */
    reset() {
        this.lastState = {};
    }
}

module.exports = {
    MemoCache,
    memoize,
    ObjectPool,
    debounce,
    throttle,
    DeltaSync
};
