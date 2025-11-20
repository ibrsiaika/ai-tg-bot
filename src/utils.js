/**
 * Utility Functions Module
 * Common helper functions used throughout the bot
 */

const Vec3 = require('vec3');

class Utils {
    /**
     * Sleep/delay helper
     * @param {number} ms - Milliseconds to sleep
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculate distance between two positions
     * @param {Vec3} pos1 - First position
     * @param {Vec3} pos2 - Second position
     * @returns {number} Distance
     */
    static distance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    /**
     * Get chunk coordinates from position
     * @param {Vec3} position - World position
     * @returns {Object} Chunk coordinates {x, z}
     */
    static getChunkCoords(position) {
        return {
            x: Math.floor(position.x / 16),
            z: Math.floor(position.z / 16)
        };
    }

    /**
     * Format position as string
     * @param {Vec3} position - Position to format
     * @returns {string} Formatted position
     */
    static formatPosition(position) {
        return `(${Math.floor(position.x)}, ${Math.floor(position.y)}, ${Math.floor(position.z)})`;
    }

    /**
     * Calculate health percentage
     * @param {number} current - Current health
     * @param {number} max - Max health
     * @returns {number} Percentage (0-100)
     */
    static healthPercent(current, max = 20) {
        return (current / max) * 100;
    }

    /**
     * Check if time is night
     * @param {number} timeOfDay - Minecraft time of day
     * @returns {boolean} True if night
     */
    static isNight(timeOfDay) {
        return timeOfDay > 13000 && timeOfDay < 23000;
    }

    /**
     * Check if time is day
     * @param {number} timeOfDay - Minecraft time of day
     * @returns {boolean} True if day
     */
    static isDay(timeOfDay) {
        return !Utils.isNight(timeOfDay);
    }

    /**
     * Validate configuration object
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result {valid: boolean, errors: string[]}
     */
    static validateConfig(config) {
        const errors = [];

        if (!config.host || typeof config.host !== 'string') {
            errors.push('Invalid or missing host');
        }

        if (!config.port || typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
            errors.push('Invalid or missing port (must be 1-65535)');
        }

        if (!config.username || typeof config.username !== 'string' || config.username.length < 3) {
            errors.push('Invalid or missing username (must be at least 3 characters)');
        }

        if (config.minHealthPercent && (config.minHealthPercent < 0 || config.minHealthPercent > 100)) {
            errors.push('Invalid minHealthPercent (must be 0-100)');
        }

        if (config.minFoodLevel && (config.minFoodLevel < 0 || config.minFoodLevel > 20)) {
            errors.push('Invalid minFoodLevel (must be 0-20)');
        }

        if (config.telegramToken && typeof config.telegramToken !== 'string') {
            errors.push('Invalid telegramToken format');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Retry an async function with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} baseDelay - Base delay in ms
     * @returns {Promise} Result of function
     */
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, i);
                    await Utils.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Get random element from array
     * @param {Array} array - Array to select from
     * @returns {*} Random element
     */
    static randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Check if position is within range of another position
     * @param {Vec3} pos1 - First position
     * @param {Vec3} pos2 - Second position
     * @param {number} range - Range to check
     * @returns {boolean} True if within range
     */
    static withinRange(pos1, pos2, range) {
        return Utils.distance(pos1, pos2) <= range;
    }

    /**
     * Get timestamp in a readable format
     * @returns {string} Formatted timestamp
     */
    static timestamp() {
        return new Date().toISOString();
    }

    /**
     * Safe JSON parse with fallback
     * @param {string} str - JSON string to parse
     * @param {*} fallback - Fallback value if parse fails
     * @returns {*} Parsed object or fallback
     */
    static safeJsonParse(str, fallback = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            return fallback;
        }
    }

    /**
     * Debounce a function
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function} Debounced function
     */
    static debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * Format time duration in human readable format
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted duration
     */
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Calculate success rate from attempts and successes
     * @param {number} successes - Number of successes
     * @param {number} attempts - Total attempts
     * @returns {number} Success rate (0-1)
     */
    static successRate(successes, attempts) {
        return attempts > 0 ? successes / attempts : 0;
    }

    /**
     * Check if a string matches any pattern in array
     * @param {string} str - String to check
     * @param {Array<string>} patterns - Patterns to match
     * @returns {boolean} True if matches any pattern
     */
    static matchesAny(str, patterns) {
        return patterns.some(pattern => str.includes(pattern));
    }

    /**
     * Create a safe filename from a string
     * @param {string} str - String to convert
     * @returns {string} Safe filename
     */
    static safeFilename(str) {
        return str.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    }

    /**
     * Get material quality score
     * @param {string} materialName - Material name
     * @returns {number} Quality score (higher is better)
     */
    static getMaterialQuality(materialName) {
        const materials = {
            'netherite': 6,
            'diamond': 5,
            'iron': 4,
            'stone': 3,
            'wooden': 2,
            'golden': 1
        };
        
        for (const [material, score] of Object.entries(materials)) {
            if (materialName.includes(material)) {
                return score;
            }
        }
        
        return 0;
    }

    /**
     * Check if error is recoverable
     * @param {Error} error - Error to check
     * @returns {boolean} True if recoverable
     */
    static isRecoverableError(error) {
        const recoverableErrors = [
            'pathfinding',
            'timeout',
            'interrupted',
            'no path',
            'unreachable'
        ];
        
        return recoverableErrors.some(msg => 
            error.message?.toLowerCase().includes(msg)
        );
    }
}

module.exports = Utils;
