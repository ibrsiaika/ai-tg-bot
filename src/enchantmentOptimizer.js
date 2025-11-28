/**
 * Enchantment Optimizer System - v4.2.0
 * 
 * Advanced enchantment management and optimization
 * Features:
 * - Optimal enchantment prediction
 * - Enchantment book tracking and combining
 * - XP level management
 * - Auto-enchant based on tool usage
 * - Anvil operation optimization
 * 
 * Memory optimized for 512MB RAM environments
 */

const EventBus = require('./eventBus');

// Memory-efficient constants
const MAX_ENCHANTMENT_BOOKS = 100;
const MAX_ENCHANT_HISTORY = 50;
const XP_CHECK_INTERVAL = 10000;
const MIN_ENCHANT_LEVEL = 30;

/**
 * Enchantment categories
 */
const EnchantmentCategory = {
    TOOL: 'tool',
    WEAPON: 'weapon',
    ARMOR: 'armor',
    BOW: 'bow',
    TRIDENT: 'trident',
    FISHING: 'fishing',
    UNIVERSAL: 'universal'
};

/**
 * Enchantment data with max levels and compatibility
 */
const EnchantmentData = {
    // Universal
    unbreaking: { maxLevel: 3, category: EnchantmentCategory.UNIVERSAL, priority: 100, xpCost: 3 },
    mending: { maxLevel: 1, category: EnchantmentCategory.UNIVERSAL, priority: 95, xpCost: 4 },

    // Tools
    efficiency: { maxLevel: 5, category: EnchantmentCategory.TOOL, priority: 90, xpCost: 3 },
    fortune: { maxLevel: 3, category: EnchantmentCategory.TOOL, priority: 85, xpCost: 4 },
    silk_touch: { maxLevel: 1, category: EnchantmentCategory.TOOL, priority: 75, xpCost: 4 },

    // Weapons
    sharpness: { maxLevel: 5, category: EnchantmentCategory.WEAPON, priority: 95, xpCost: 3 },
    smite: { maxLevel: 5, category: EnchantmentCategory.WEAPON, priority: 70, xpCost: 2 },
    bane_of_arthropods: { maxLevel: 5, category: EnchantmentCategory.WEAPON, priority: 65, xpCost: 2 },
    looting: { maxLevel: 3, category: EnchantmentCategory.WEAPON, priority: 80, xpCost: 4 },
    fire_aspect: { maxLevel: 2, category: EnchantmentCategory.WEAPON, priority: 75, xpCost: 3 },
    knockback: { maxLevel: 2, category: EnchantmentCategory.WEAPON, priority: 60, xpCost: 2 },
    sweeping_edge: { maxLevel: 3, category: EnchantmentCategory.WEAPON, priority: 70, xpCost: 3 },

    // Armor
    protection: { maxLevel: 4, category: EnchantmentCategory.ARMOR, priority: 100, xpCost: 3 },
    fire_protection: { maxLevel: 4, category: EnchantmentCategory.ARMOR, priority: 75, xpCost: 2 },
    blast_protection: { maxLevel: 4, category: EnchantmentCategory.ARMOR, priority: 70, xpCost: 2 },
    projectile_protection: { maxLevel: 4, category: EnchantmentCategory.ARMOR, priority: 70, xpCost: 2 },
    thorns: { maxLevel: 3, category: EnchantmentCategory.ARMOR, priority: 50, xpCost: 4 },

    // Boots
    feather_falling: { maxLevel: 4, category: EnchantmentCategory.ARMOR, priority: 90, xpCost: 2, slot: 'boots' },
    depth_strider: { maxLevel: 3, category: EnchantmentCategory.ARMOR, priority: 65, xpCost: 3, slot: 'boots' },
    frost_walker: { maxLevel: 2, category: EnchantmentCategory.ARMOR, priority: 55, xpCost: 3, slot: 'boots' },
    soul_speed: { maxLevel: 3, category: EnchantmentCategory.ARMOR, priority: 60, xpCost: 4, slot: 'boots' },

    // Helmet
    respiration: { maxLevel: 3, category: EnchantmentCategory.ARMOR, priority: 70, xpCost: 3, slot: 'helmet' },
    aqua_affinity: { maxLevel: 1, category: EnchantmentCategory.ARMOR, priority: 65, xpCost: 3, slot: 'helmet' },

    // Bow
    power: { maxLevel: 5, category: EnchantmentCategory.BOW, priority: 95, xpCost: 3 },
    punch: { maxLevel: 2, category: EnchantmentCategory.BOW, priority: 60, xpCost: 2 },
    flame: { maxLevel: 1, category: EnchantmentCategory.BOW, priority: 75, xpCost: 3 },
    infinity: { maxLevel: 1, category: EnchantmentCategory.BOW, priority: 80, xpCost: 4 },

    // Fishing rod
    luck_of_the_sea: { maxLevel: 3, category: EnchantmentCategory.FISHING, priority: 85, xpCost: 3 },
    lure: { maxLevel: 3, category: EnchantmentCategory.FISHING, priority: 80, xpCost: 3 }
};

/**
 * Item type to category mapping
 */
const ItemCategoryMap = {
    'diamond_pickaxe': EnchantmentCategory.TOOL,
    'iron_pickaxe': EnchantmentCategory.TOOL,
    'netherite_pickaxe': EnchantmentCategory.TOOL,
    'diamond_axe': EnchantmentCategory.TOOL,
    'diamond_shovel': EnchantmentCategory.TOOL,
    'diamond_sword': EnchantmentCategory.WEAPON,
    'netherite_sword': EnchantmentCategory.WEAPON,
    'diamond_helmet': EnchantmentCategory.ARMOR,
    'diamond_chestplate': EnchantmentCategory.ARMOR,
    'diamond_leggings': EnchantmentCategory.ARMOR,
    'diamond_boots': EnchantmentCategory.ARMOR,
    'netherite_helmet': EnchantmentCategory.ARMOR,
    'netherite_chestplate': EnchantmentCategory.ARMOR,
    'netherite_leggings': EnchantmentCategory.ARMOR,
    'netherite_boots': EnchantmentCategory.ARMOR,
    'bow': EnchantmentCategory.BOW,
    'fishing_rod': EnchantmentCategory.FISHING
};

/**
 * Enchantment conflicts (mutually exclusive)
 */
const EnchantmentConflicts = {
    fortune: ['silk_touch'],
    silk_touch: ['fortune'],
    sharpness: ['smite', 'bane_of_arthropods'],
    smite: ['sharpness', 'bane_of_arthropods'],
    bane_of_arthropods: ['sharpness', 'smite'],
    protection: ['fire_protection', 'blast_protection', 'projectile_protection'],
    fire_protection: ['protection', 'blast_protection', 'projectile_protection'],
    blast_protection: ['protection', 'fire_protection', 'projectile_protection'],
    projectile_protection: ['protection', 'fire_protection', 'blast_protection'],
    depth_strider: ['frost_walker'],
    frost_walker: ['depth_strider'],
    infinity: ['mending'],
    mending: ['infinity']
};

class EnchantmentOptimizer {
    constructor(bot, pathfinder, notifier, inventory, options = {}) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventory;
        this.enabled = process.env.ENCHANTMENT_OPTIMIZER_ENABLED !== 'false';

        // Enchanting table and anvil locations
        this.enchantingTable = null;
        this.anvilLocation = null;

        // Enchantment book storage
        this.enchantmentBooks = new Map();

        // XP tracking
        this.currentXPLevel = 0;
        this.targetXPLevel = MIN_ENCHANT_LEVEL;

        // Enchant history
        this.enchantHistory = [];

        // Item tracking
        this.trackedItems = new Map();

        // Statistics
        this.stats = {
            itemsEnchanted: 0,
            booksCombined: 0,
            xpSpent: 0,
            optimalEnchantsAchieved: 0
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize enchantment optimizer
     */
    initialize() {
        console.log('[Enchantment Optimizer] Initializing...');

        this.setupEventListeners();
        this.startXPMonitoring();

        console.log('[Enchantment Optimizer] ✓ System initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on('item:equipped', (data) => this.analyzeEquippedItem(data));
        EventBus.on('tool:durability:low', (data) => this.checkEnchantmentNeeds(data));
    }

    /**
     * Start XP level monitoring
     */
    startXPMonitoring() {
        setInterval(() => {
            this.updateXPLevel();
        }, XP_CHECK_INTERVAL);
    }

    /**
     * Update current XP level
     */
    updateXPLevel() {
        if (this.bot?.experience?.level !== undefined) {
            this.currentXPLevel = this.bot.experience.level;
        }
    }

    /**
     * Find enchanting table
     */
    async findEnchantingTable(searchRadius = 32) {
        const table = this.bot.findBlock({
            matching: block => block.name === 'enchanting_table',
            maxDistance: searchRadius
        });

        if (table) {
            this.enchantingTable = table.position.clone();
            console.log(`[Enchantment Optimizer] Found enchanting table at ${this.enchantingTable}`);
        }

        return this.enchantingTable;
    }

    /**
     * Find anvil
     */
    async findAnvil(searchRadius = 32) {
        const anvil = this.bot.findBlock({
            matching: block => block.name === 'anvil' || block.name === 'chipped_anvil' || block.name === 'damaged_anvil',
            maxDistance: searchRadius
        });

        if (anvil) {
            this.anvilLocation = anvil.position.clone();
            console.log(`[Enchantment Optimizer] Found anvil at ${this.anvilLocation}`);
        }

        return this.anvilLocation;
    }

    /**
     * Get optimal enchantments for item type
     */
    getOptimalEnchantments(itemName) {
        const category = ItemCategoryMap[itemName];
        if (!category) {
            console.log(`[Enchantment Optimizer] Unknown item type: ${itemName}`);
            return [];
        }

        const optimal = [];

        // Get enchantments for this category + universal
        for (const [enchantName, data] of Object.entries(EnchantmentData)) {
            if (data.category === category || data.category === EnchantmentCategory.UNIVERSAL) {
                // Check slot requirements for armor
                if (data.slot) {
                    if (!itemName.includes(data.slot)) continue;
                }

                optimal.push({
                    name: enchantName,
                    maxLevel: data.maxLevel,
                    priority: data.priority,
                    xpCost: data.xpCost
                });
            }
        }

        // Sort by priority
        optimal.sort((a, b) => b.priority - a.priority);

        return optimal;
    }

    /**
     * Calculate enchantment score for an item
     */
    calculateEnchantmentScore(item) {
        if (!item.enchants || item.enchants.length === 0) {
            return 0;
        }

        let score = 0;
        const optimal = this.getOptimalEnchantments(item.name);
        const optimalMap = new Map(optimal.map(e => [e.name, e]));

        for (const enchant of item.enchants) {
            const enchantData = optimalMap.get(enchant.name);
            if (enchantData) {
                // Score based on priority and level
                const levelRatio = enchant.lvl / enchantData.maxLevel;
                score += enchantData.priority * levelRatio;
            }
        }

        // Normalize to 0-100
        const maxPossibleScore = optimal.slice(0, 5).reduce((sum, e) => sum + e.priority, 0);
        return maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
    }

    /**
     * Predict optimal enchantments from enchanting table
     */
    predictEnchantments(itemName, xpLevel) {
        const category = ItemCategoryMap[itemName];
        if (!category) return null;

        const predictions = [];

        // Higher level = better enchantments
        const levelMultiplier = Math.min(xpLevel / 30, 1);

        for (const [enchantName, data] of Object.entries(EnchantmentData)) {
            if (data.category !== category && data.category !== EnchantmentCategory.UNIVERSAL) continue;

            // Calculate probability based on XP level
            const probability = Math.min(0.9, levelMultiplier * (data.priority / 100));
            const expectedLevel = Math.max(1, Math.round(data.maxLevel * levelMultiplier));

            predictions.push({
                enchantment: enchantName,
                expectedLevel,
                probability,
                priority: data.priority
            });
        }

        predictions.sort((a, b) => b.probability - a.probability);

        return {
            item: itemName,
            xpLevel,
            predictions: predictions.slice(0, 5),
            recommendedLevel: MIN_ENCHANT_LEVEL
        };
    }

    /**
     * Track enchantment book
     */
    trackEnchantmentBook(bookData) {
        const { enchantment, level } = bookData;
        const key = `${enchantment}:${level}`;

        if (!this.enchantmentBooks.has(key)) {
            this.enchantmentBooks.set(key, []);
        }

        this.enchantmentBooks.get(key).push({
            ...bookData,
            trackedAt: Date.now()
        });

        // Limit storage
        if (this.enchantmentBooks.size > MAX_ENCHANTMENT_BOOKS) {
            const firstKey = this.enchantmentBooks.keys().next().value;
            this.enchantmentBooks.delete(firstKey);
        }

        console.log(`[Enchantment Optimizer] Tracked book: ${enchantment} ${level}`);
    }

    /**
     * Find matching books for combining
     */
    findMatchingBooks(enchantment, level) {
        const key = `${enchantment}:${level}`;
        const books = this.enchantmentBooks.get(key) || [];

        return books.filter(b => !b.used);
    }

    /**
     * Calculate anvil combination cost
     */
    calculateAnvilCost(item, book) {
        let baseCost = 0;

        // Prior work penalty
        const itemPenalty = item.priorWork || 0;
        const bookPenalty = book.priorWork || 0;
        baseCost += Math.pow(2, itemPenalty) - 1;
        baseCost += Math.pow(2, bookPenalty) - 1;

        // Enchantment cost
        const enchantData = EnchantmentData[book.enchantment];
        if (enchantData) {
            baseCost += enchantData.xpCost * book.level;
        }

        return Math.min(baseCost, 39); // Max 39 levels
    }

    /**
     * Check for enchantment conflicts
     */
    hasConflict(existingEnchants, newEnchant) {
        const conflicts = EnchantmentConflicts[newEnchant] || [];

        for (const existing of existingEnchants) {
            if (conflicts.includes(existing.name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get recommended next enchantment
     */
    getRecommendedEnchantment(item) {
        const optimal = this.getOptimalEnchantments(item.name);
        const existingEnchants = item.enchants || [];
        const existingNames = new Set(existingEnchants.map(e => e.name));

        for (const opt of optimal) {
            // Skip if already has it at max level
            const existing = existingEnchants.find(e => e.name === opt.name);
            if (existing && existing.lvl >= opt.maxLevel) continue;

            // Skip if conflicts
            if (this.hasConflict(existingEnchants, opt.name)) continue;

            return {
                enchantment: opt.name,
                targetLevel: opt.maxLevel,
                currentLevel: existing?.lvl || 0,
                priority: opt.priority,
                xpCost: opt.xpCost
            };
        }

        return null; // Fully enchanted
    }

    /**
     * Analyze equipped item
     */
    analyzeEquippedItem(data) {
        const { item } = data;
        if (!item) return;

        const score = this.calculateEnchantmentScore(item);
        const recommendation = this.getRecommendedEnchantment(item);

        this.trackedItems.set(item.name, {
            score,
            lastAnalyzed: Date.now(),
            recommendation
        });

        if (recommendation && score < 80) {
            console.log(`[Enchantment Optimizer] ${item.name} could use ${recommendation.enchantment}`);
        }
    }

    /**
     * Check enchantment needs for tool
     */
    checkEnchantmentNeeds(data) {
        const { item } = data;
        if (!item) return;

        // If tool durability is low, check if it has mending
        const hasMending = item.enchants?.some(e => e.name === 'mending');

        if (!hasMending) {
            EventBus.emit('enchantment:needed', {
                item: item.name,
                enchantment: 'mending',
                reason: 'low_durability_no_mending'
            });
        }
    }

    /**
     * Calculate XP needed for target level
     */
    calculateXPNeeded(targetLevel) {
        if (this.currentXPLevel >= targetLevel) return 0;

        // Simplified XP calculation
        let xpNeeded = 0;
        for (let level = this.currentXPLevel + 1; level <= targetLevel; level++) {
            if (level <= 16) {
                xpNeeded += 2 * level + 7;
            } else if (level <= 31) {
                xpNeeded += 5 * level - 38;
            } else {
                xpNeeded += 9 * level - 158;
            }
        }

        return xpNeeded;
    }

    /**
     * Get enchantment status summary
     */
    getEnchantmentSummary() {
        const items = [];

        for (const [itemName, data] of this.trackedItems.entries()) {
            items.push({
                item: itemName,
                score: data.score,
                recommendation: data.recommendation
            });
        }

        return {
            trackedItems: items,
            currentXP: this.currentXPLevel,
            booksAvailable: this.enchantmentBooks.size,
            hasEnchantingTable: this.enchantingTable !== null,
            hasAnvil: this.anvilLocation !== null
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            currentXPLevel: this.currentXPLevel,
            trackedItemsCount: this.trackedItems.size,
            booksTracked: this.enchantmentBooks.size
        };
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.enchantmentBooks.clear();
        this.trackedItems.clear();
        console.log('[Enchantment Optimizer] Cleanup complete');
    }
}

// Export
module.exports = EnchantmentOptimizer;
module.exports.EnchantmentCategory = EnchantmentCategory;
module.exports.EnchantmentData = EnchantmentData;
module.exports.EnchantmentConflicts = EnchantmentConflicts;
module.exports.ItemCategoryMap = ItemCategoryMap;
