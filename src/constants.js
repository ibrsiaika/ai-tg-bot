/**
 * Centralized Constants for Autonomous Minecraft Bot
 * All magic numbers and configuration values should be defined here
 */

module.exports = {
    // Inventory Constants
    INVENTORY: {
        TOTAL_SLOTS: 36,
        FULL_THRESHOLD: 3, // Consider inventory full when this many slots remain
        MAX_STACK_SIZE: 64
    },

    // Health & Safety Constants
    SAFETY: {
        DEFAULT_MIN_HEALTH_PERCENT: 60,
        DEFAULT_MIN_FOOD_LEVEL: 10,
        CRITICAL_HEALTH_THRESHOLD: 30,
        MAX_HEALTH: 20,
        MAX_FOOD: 20,
        OXYGEN_CRITICAL: 5
    },

    // Tool Durability Constants
    TOOL_DURABILITY: {
        REPLACE_THRESHOLD: 0.2, // Replace when below 20% durability
        WARN_THRESHOLD: 0.3,    // Warn when below 30%
        CHECK_INTERVAL_MS: 30000 // Check every 30 seconds
    },

    // Exploration Constants
    EXPLORATION: {
        CHUNK_SIZE: 16,
        MAX_TREE_LOCATIONS: 100,
        TREE_LOCATION_EXPIRY_MS: 300000, // 5 minutes
        MIN_TREE_DISTANCE: 5,
        MAX_EXPLORATION_DISTANCE: 500,
        DEFAULT_EXPLORATION_TIME: 120000, // 2 minutes
        MAX_SEARCH_ATTEMPTS: 10
    },

    // Intelligence System Constants
    INTELLIGENCE: {
        MAX_RESOURCE_LOCATIONS: 50,
        MAX_ACTION_HISTORY: 1000,
        DANGER_ZONE_EXPIRY_MS: 600000, // 10 minutes
        NEUTRAL_CONFIDENCE_SCORE: 0.5,
        REWARD_NORMALIZER: 10,
        REPORT_INTERVAL: 50 // Generate report every N decisions
    },

    // Combat Constants
    COMBAT: {
        HOSTILE_MOB_RANGE: 16,
        SAFE_RETREAT_DISTANCE: 32,
        ATTACK_RANGE: 4,
        HEAL_DELAY_MS: 5000
    },

    // Mining Constants
    MINING: {
        OPTIMAL_DIAMOND_LEVEL: 11,
        OPTIMAL_IRON_LEVEL: 15,
        BRANCH_MINE_LENGTH: 50,
        TORCH_SPACING: 8,
        MAX_MINE_DEPTH: 256
    },

    // Building Constants
    BUILDING: {
        DEFAULT_WALL_HEIGHT: 4,
        WATCHTOWER_HEIGHT: 8,
        FARM_SIZE: 9,
        STORAGE_ROOM_SIZE: 7,
        LIGHT_LEVEL_SAFE: 8
    },

    // Crafting Constants
    CRAFTING: {
        PLANKS_PER_LOG: 4,
        STICKS_PER_PLANK_SET: 4,
        TORCHES_PER_CRAFT: 4,
        DEFAULT_CRAFT_TIMEOUT: 5000
    },

    // Priority Levels
    PRIORITY: {
        CRITICAL: 100,
        HIGH: 75,
        MEDIUM: 50,
        LOW: 25
    },

    // Resource Targets
    RESOURCE_TARGETS: {
        WOOD: { MIN: 64, PRIORITY: 0.8 },
        STONE: { MIN: 128, PRIORITY: 0.7 },
        IRON: { MIN: 32, PRIORITY: 0.9 },
        DIAMOND: { MIN: 3, PRIORITY: 1.0 },
        FOOD: { MIN: 32, PRIORITY: 0.95 },
        COAL: { MIN: 64, PRIORITY: 0.6 }
    },

    // Time Constants
    TIME: {
        DAY_START: 0,
        DAY_END: 13000,
        NIGHT_START: 13000,
        NIGHT_END: 23000,
        FULL_DAY: 24000
    },

    // Pathfinding Constants
    PATHFINDING: {
        MAX_DISTANCE: 256,
        GOAL_NEAR_DISTANCE: 2,
        MOVEMENT_TIMEOUT: 60000 // 1 minute
    },

    // Default State Values
    STATE: {
        DEFAULT_SPAWN_POSITION: { x: 0, y: 64, z: 0 },
        DEFAULT_HEALTH: 20,
        DEFAULT_FOOD: 20
    },

    // Delay Constants (in milliseconds)
    DELAYS: {
        BETWEEN_GOALS: 5000,
        AFTER_SAFETY_ISSUE: 3000,
        ON_ERROR: 10000,
        ITEM_PICKUP: 500,
        CHEST_OPERATION: 200,
        SMELTING: 10000,
        COOKING: 8000,
        RECONNECT: 5000
    },

    // Wood Types
    WOOD_TYPES: [
        'oak_log', 'birch_log', 'spruce_log', 'jungle_log',
        'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'
    ],

    // Plank Types
    PLANK_TYPES: [
        'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
        'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
        'bamboo_planks', 'crimson_planks', 'warped_planks'
    ],

    // Food Items
    FOOD_ITEMS: [
        'bread', 'apple', 'golden_apple', 'carrot', 'potato', 'baked_potato',
        'beetroot', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton',
        'cooked_chicken', 'cooked_rabbit', 'cooked_cod', 'cooked_salmon',
        'pumpkin_pie', 'mushroom_stew', 'suspicious_stew', 'rabbit_stew',
        'cake', 'cookie', 'melon_slice', 'sweet_berries', 'glow_berries'
    ],

    // Hostile Mobs
    HOSTILE_MOBS: [
        'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
        'enderman', 'witch', 'phantom', 'blaze', 'ghast',
        'zombified_piglin', 'pillager', 'vindicator', 'evoker',
        'hoglin', 'piglin_brute', 'wither_skeleton', 'ender_dragon',
        'wither', 'slime', 'magma_cube', 'silverfish', 'guardian',
        'elder_guardian', 'shulker', 'vex', 'ravager'
    ],

    // Tool Material Priority (best to worst)
    TOOL_MATERIALS: ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'golden'],

    // Dangerous Blocks
    DANGEROUS_BLOCKS: ['lava', 'flowing_lava', 'fire', 'soul_fire', 'magma_block'],

    // Memory File
    MEMORY_FILE: '.bot-memory.json'
};
