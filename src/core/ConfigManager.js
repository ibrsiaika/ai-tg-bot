/**
 * Centralized Configuration Manager
 * Provides type-safe configuration with validation and defaults
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.defaults = {};
        this.validators = {};
        this.loaded = false;
    }

    /**
     * Define configuration schema with defaults and validators
     * @param {Object} schema - Configuration schema
     */
    defineSchema(schema) {
        for (const [key, definition] of Object.entries(schema)) {
            this.defaults[key] = definition.default;
            if (definition.validator) {
                this.validators[key] = definition.validator;
            }
        }
    }

    /**
     * Load configuration from environment and options
     * @param {Object} options - Override options
     */
    load(options = {}) {
        // Start with defaults
        this.config = { ...this.defaults };

        // Apply environment variables
        this._loadFromEnv();

        // Apply override options
        for (const [key, value] of Object.entries(options)) {
            if (value !== undefined) {
                this.config[key] = value;
            }
        }

        // Validate all values
        this._validateAll();

        this.loaded = true;
        return this.config;
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default if not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = undefined) {
        if (key in this.config) {
            return this.config[key];
        }
        if (key in this.defaults) {
            return this.defaults[key];
        }
        return defaultValue;
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Value to set
     */
    set(key, value) {
        // Validate if validator exists
        if (this.validators[key]) {
            const validation = this.validators[key](value);
            if (validation !== true) {
                throw new Error(`Invalid value for ${key}: ${validation}`);
            }
        }
        this.config[key] = value;
    }

    /**
     * Get all configuration as object
     * @returns {Object}
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Check if configuration is valid
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];
        
        for (const [key, validator] of Object.entries(this.validators)) {
            const value = this.config[key];
            const result = validator(value);
            if (result !== true) {
                errors.push({ key, error: result });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Load values from environment variables
     * @private
     */
    _loadFromEnv() {
        const envMappings = {
            // Minecraft connection
            host: 'MINECRAFT_HOST',
            port: 'MINECRAFT_PORT',
            username: 'MINECRAFT_USERNAME',
            version: 'MINECRAFT_VERSION',
            
            // Telegram
            telegramToken: 'TELEGRAM_BOT_TOKEN',
            telegramChatId: 'TELEGRAM_CHAT_ID',
            
            // Gemini AI
            geminiApiKey: 'GEMINI_API_KEY',
            
            // Safety settings
            minHealthPercent: 'MIN_HEALTH_PERCENT',
            minFoodLevel: 'MIN_FOOD_LEVEL',
            
            // Dashboard
            enableDashboard: 'ENABLE_DASHBOARD',
            dashboardPort: 'DASHBOARD_PORT',
            
            // ML settings
            mlEnabled: 'ML_ENABLED',
            
            // PvP settings
            pvpEnabled: 'PVP_ENABLED',
            pvpDefaultStance: 'PVP_DEFAULT_STANCE',
            pvpAutoEat: 'PVP_AUTO_EAT',
            pvpAutoPotion: 'PVP_AUTO_POTION',
            pvpEscapeHealth: 'PVP_ESCAPE_HEALTH',
            
            // Pathfinding
            pathfindingTerrainCosts: 'PATHFINDING_TERRAIN_COSTS',
            pathfindingSmoothPaths: 'PATHFINDING_SMOOTH_PATHS'
        };

        for (const [configKey, envKey] of Object.entries(envMappings)) {
            const envValue = process.env[envKey];
            if (envValue !== undefined) {
                this.config[configKey] = this._parseEnvValue(envValue, this.defaults[configKey]);
            }
        }
    }

    /**
     * Parse environment variable value to appropriate type
     * @private
     */
    _parseEnvValue(value, defaultValue) {
        if (value === undefined || value === null) {
            return defaultValue;
        }

        // Determine type from default value
        const type = typeof defaultValue;

        switch (type) {
            case 'number':
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? defaultValue : parsed;
            
            case 'boolean':
                return value === 'true' || value === '1';
            
            default:
                return value;
        }
    }

    /**
     * Validate all configuration values
     * @private
     */
    _validateAll() {
        for (const [key, validator] of Object.entries(this.validators)) {
            const value = this.config[key];
            const result = validator(value);
            if (result !== true) {
                console.warn(`Configuration warning: ${key} - ${result}`);
            }
        }
    }
}

// Default configuration schema
const defaultSchema = {
    // Minecraft connection
    host: {
        default: 'localhost',
        validator: (v) => typeof v === 'string' && v.length > 0 || 'Must be a non-empty string'
    },
    port: {
        default: 25565,
        validator: (v) => Number.isInteger(v) && v > 0 && v < 65536 || 'Must be valid port number'
    },
    username: {
        default: 'AutoBot',
        validator: (v) => typeof v === 'string' && v.length > 0 || 'Must be a non-empty string'
    },
    version: {
        default: false,
        validator: () => true
    },
    
    // Telegram
    telegramToken: {
        default: null,
        validator: () => true
    },
    telegramChatId: {
        default: null,
        validator: () => true
    },
    
    // Gemini AI
    geminiApiKey: {
        default: null,
        validator: () => true
    },
    
    // Safety settings
    minHealthPercent: {
        default: 60,
        validator: (v) => Number.isInteger(v) && v >= 0 && v <= 100 || 'Must be 0-100'
    },
    minFoodLevel: {
        default: 10,
        validator: (v) => Number.isInteger(v) && v >= 0 && v <= 20 || 'Must be 0-20'
    },
    
    // Dashboard
    enableDashboard: {
        default: true,
        validator: () => true
    },
    dashboardPort: {
        default: 3001,
        validator: (v) => Number.isInteger(v) && v > 0 && v < 65536 || 'Must be valid port'
    },
    
    // ML
    mlEnabled: {
        default: false,
        validator: () => true
    },
    
    // PvP
    pvpEnabled: {
        default: false,
        validator: () => true
    },
    pvpDefaultStance: {
        default: 'balanced',
        validator: (v) => ['aggressive', 'defensive', 'balanced'].includes(v) || 'Invalid stance'
    },
    pvpEscapeHealth: {
        default: 4,
        validator: (v) => Number.isInteger(v) && v >= 0 || 'Must be non-negative integer'
    }
};

// Create singleton instance
const configManager = new ConfigManager();
configManager.defineSchema(defaultSchema);

module.exports = ConfigManager;
module.exports.configManager = configManager;
module.exports.defaultSchema = defaultSchema;
