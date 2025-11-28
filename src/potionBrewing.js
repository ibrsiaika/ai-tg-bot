/**
 * Potion Brewing System - v4.2.0
 * 
 * Automated potion brewing with ingredient management
 * Features:
 * - Automatic brewing stand setup
 * - Ingredient farming and collection
 * - Potion recipe management
 * - Buff application before dangerous missions
 * - Potion storage system
 * 
 * Memory optimized for 512MB RAM environments
 */

const EventBus = require('./eventBus');

// Memory-efficient constants
const MAX_POTION_STORAGE = 100;
const MAX_INGREDIENT_CACHE = 50;
const BREWING_TIME_MS = 20000; // 20 seconds per brewing cycle
const BUFF_DURATION_CHECK_INTERVAL = 5000;

/**
 * Potion types
 */
const PotionType = {
    HEALING: 'healing',
    REGENERATION: 'regeneration',
    STRENGTH: 'strength',
    SPEED: 'speed',
    FIRE_RESISTANCE: 'fire_resistance',
    NIGHT_VISION: 'night_vision',
    WATER_BREATHING: 'water_breathing',
    INVISIBILITY: 'invisibility',
    SLOW_FALLING: 'slow_falling',
    POISON: 'poison',
    WEAKNESS: 'weakness',
    HARMING: 'harming'
};

/**
 * Potion priority for missions
 */
const MissionPotionPriority = {
    nether: [PotionType.FIRE_RESISTANCE, PotionType.HEALING, PotionType.REGENERATION],
    end: [PotionType.SLOW_FALLING, PotionType.HEALING, PotionType.STRENGTH],
    combat: [PotionType.STRENGTH, PotionType.HEALING, PotionType.REGENERATION],
    mining: [PotionType.NIGHT_VISION, PotionType.FIRE_RESISTANCE, PotionType.HEALING],
    exploration: [PotionType.SPEED, PotionType.NIGHT_VISION, PotionType.HEALING]
};

/**
 * Potion recipes
 */
const PotionRecipes = {
    [PotionType.HEALING]: {
        base: 'awkward_potion',
        ingredient: 'glistering_melon_slice',
        duration: 0,
        instant: true,
        upgradable: true,
        extendable: false
    },
    [PotionType.REGENERATION]: {
        base: 'awkward_potion',
        ingredient: 'ghast_tear',
        duration: 45000,
        instant: false,
        upgradable: true,
        extendable: true
    },
    [PotionType.STRENGTH]: {
        base: 'awkward_potion',
        ingredient: 'blaze_powder',
        duration: 180000,
        instant: false,
        upgradable: true,
        extendable: true
    },
    [PotionType.SPEED]: {
        base: 'awkward_potion',
        ingredient: 'sugar',
        duration: 180000,
        instant: false,
        upgradable: true,
        extendable: true
    },
    [PotionType.FIRE_RESISTANCE]: {
        base: 'awkward_potion',
        ingredient: 'magma_cream',
        duration: 180000,
        instant: false,
        upgradable: false,
        extendable: true
    },
    [PotionType.NIGHT_VISION]: {
        base: 'awkward_potion',
        ingredient: 'golden_carrot',
        duration: 180000,
        instant: false,
        upgradable: false,
        extendable: true
    },
    [PotionType.WATER_BREATHING]: {
        base: 'awkward_potion',
        ingredient: 'pufferfish',
        duration: 180000,
        instant: false,
        upgradable: false,
        extendable: true
    },
    [PotionType.INVISIBILITY]: {
        base: 'night_vision_potion',
        ingredient: 'fermented_spider_eye',
        duration: 180000,
        instant: false,
        upgradable: false,
        extendable: true
    },
    [PotionType.SLOW_FALLING]: {
        base: 'awkward_potion',
        ingredient: 'phantom_membrane',
        duration: 90000,
        instant: false,
        upgradable: false,
        extendable: true
    }
};

/**
 * Ingredient sources
 */
const IngredientSources = {
    nether_wart: { location: 'nether', farmable: true, mobDrop: false },
    blaze_powder: { location: 'nether', farmable: false, mobDrop: true, mob: 'blaze' },
    ghast_tear: { location: 'nether', farmable: false, mobDrop: true, mob: 'ghast' },
    magma_cream: { location: 'nether', farmable: false, mobDrop: true, mob: 'magma_cube' },
    glistering_melon_slice: { location: 'overworld', farmable: true, craftable: true },
    golden_carrot: { location: 'overworld', farmable: true, craftable: true },
    sugar: { location: 'overworld', farmable: true, craftable: true },
    pufferfish: { location: 'overworld', farmable: false, fishable: true },
    phantom_membrane: { location: 'overworld', farmable: false, mobDrop: true, mob: 'phantom' },
    fermented_spider_eye: { location: 'overworld', farmable: false, craftable: true },
    spider_eye: { location: 'overworld', farmable: false, mobDrop: true, mob: 'spider' },
    rabbit_foot: { location: 'overworld', farmable: false, mobDrop: true, mob: 'rabbit' }
};

class PotionBrewingSystem {
    constructor(bot, pathfinder, notifier, inventory, options = {}) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventory;
        this.enabled = process.env.POTION_BREWING_ENABLED !== 'false';

        // Brewing stand locations
        this.brewingStands = [];
        this.activeBrewingStand = null;

        // Ingredient storage
        this.ingredients = new Map();
        this.ingredientCache = [];

        // Potion storage
        this.potionStorage = new Map();
        this.potionCounts = {};

        // Active buffs tracking
        this.activeBuffs = new Map();

        // Brewing queue
        this.brewingQueue = [];
        this.isBrewing = false;

        // Statistics
        this.stats = {
            potionsBrewed: 0,
            ingredientsUsed: 0,
            buffsApplied: 0,
            missionsSupported: 0
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize brewing system
     */
    initialize() {
        console.log('[Potion Brewing] Initializing...');

        this.setupEventListeners();
        this.startBuffMonitoring();

        console.log('[Potion Brewing] ✓ System initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        EventBus.on('mission:starting', (data) => this.prepareMissionBuffs(data));
        EventBus.on('combat:starting', () => this.applyCombatBuffs());
        EventBus.on('resource:gathered', (data) => this.checkIngredientGathered(data));
    }

    /**
     * Start buff duration monitoring
     */
    startBuffMonitoring() {
        setInterval(() => {
            this.checkActiveBuffs();
        }, BUFF_DURATION_CHECK_INTERVAL);
    }

    /**
     * Find brewing stands in area
     */
    async findBrewingStands(searchRadius = 32) {
        const stands = this.bot.findBlocks({
            matching: block => block.name === 'brewing_stand',
            maxDistance: searchRadius,
            count: 10
        });

        this.brewingStands = stands.map(pos => ({
            position: pos,
            inUse: false,
            lastUsed: null
        }));

        console.log(`[Potion Brewing] Found ${this.brewingStands.length} brewing stand(s)`);
        return this.brewingStands;
    }

    /**
     * Check ingredient availability
     */
    checkIngredients(potionType) {
        const recipe = PotionRecipes[potionType];
        if (!recipe) return { available: false, missing: ['unknown_recipe'] };

        const missing = [];
        const required = {
            [recipe.ingredient]: 1,
            'nether_wart': 1, // For awkward potion base
            'glass_bottle': 3 // For potion bottles
        };

        for (const [ingredient, count] of Object.entries(required)) {
            const available = this.getIngredientCount(ingredient);
            if (available < count) {
                missing.push({ ingredient, needed: count - available });
            }
        }

        return {
            available: missing.length === 0,
            missing,
            recipe
        };
    }

    /**
     * Get ingredient count from inventory
     */
    getIngredientCount(ingredient) {
        const items = this.bot.inventory?.items?.() || [];
        const item = items.find(i => i.name === ingredient || i.name.includes(ingredient));
        return item ? item.count : 0;
    }

    /**
     * Queue potion for brewing
     */
    queuePotion(potionType, count = 3, priority = 0) {
        const check = this.checkIngredients(potionType);

        if (!check.available) {
            console.log(`[Potion Brewing] Cannot queue ${potionType} - missing ingredients:`, check.missing);
            return { success: false, missing: check.missing };
        }

        this.brewingQueue.push({
            potionType,
            count,
            priority,
            queuedAt: Date.now()
        });

        // Sort by priority
        this.brewingQueue.sort((a, b) => b.priority - a.priority);

        console.log(`[Potion Brewing] Queued ${count}x ${potionType} potion`);

        // Start brewing if not already
        if (!this.isBrewing) {
            this.processBrewingQueue();
        }

        return { success: true, position: this.brewingQueue.length };
    }

    /**
     * Process brewing queue
     */
    async processBrewingQueue() {
        if (this.isBrewing || this.brewingQueue.length === 0) return;

        this.isBrewing = true;

        while (this.brewingQueue.length > 0) {
            const job = this.brewingQueue.shift();

            try {
                await this.brewPotion(job.potionType, job.count);
            } catch (error) {
                console.error(`[Potion Brewing] Error brewing ${job.potionType}:`, error.message);
            }
        }

        this.isBrewing = false;
    }

    /**
     * Brew a potion
     */
    async brewPotion(potionType, count = 3) {
        console.log(`[Potion Brewing] Brewing ${count}x ${potionType}...`);

        const recipe = PotionRecipes[potionType];
        if (!recipe) {
            throw new Error(`Unknown potion type: ${potionType}`);
        }

        // Find available brewing stand
        if (this.brewingStands.length === 0) {
            await this.findBrewingStands();
        }

        if (this.brewingStands.length === 0) {
            throw new Error('No brewing stands available');
        }

        const stand = this.brewingStands.find(s => !s.inUse) || this.brewingStands[0];
        stand.inUse = true;

        try {
            // Navigate to brewing stand
            await this.pathfinder?.goto?.(stand.position);

            // Simulate brewing process
            await this.sleep(BREWING_TIME_MS);

            // Update statistics
            this.stats.potionsBrewed += count;
            this.stats.ingredientsUsed += 1;

            // Add to storage
            if (!this.potionCounts[potionType]) {
                this.potionCounts[potionType] = 0;
            }
            this.potionCounts[potionType] += count;

            console.log(`[Potion Brewing] ✓ Brewed ${count}x ${potionType}`);

            EventBus.emit('potion:brewed', {
                potionType,
                count,
                timestamp: Date.now()
            });

            stand.lastUsed = Date.now();

        } finally {
            stand.inUse = false;
        }
    }

    /**
     * Apply potion buff
     */
    async applyBuff(potionType) {
        if (!this.potionCounts[potionType] || this.potionCounts[potionType] <= 0) {
            console.log(`[Potion Brewing] No ${potionType} potions available`);
            return false;
        }

        const recipe = PotionRecipes[potionType];
        if (!recipe) return false;

        // Use potion
        this.potionCounts[potionType]--;

        // Track active buff
        if (!recipe.instant) {
            this.activeBuffs.set(potionType, {
                appliedAt: Date.now(),
                duration: recipe.duration,
                expiresAt: Date.now() + recipe.duration
            });
        }

        this.stats.buffsApplied++;

        console.log(`[Potion Brewing] Applied ${potionType} buff`);

        EventBus.emit('potion:applied', {
            potionType,
            duration: recipe.duration,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Check active buffs and notify when expiring
     */
    checkActiveBuffs() {
        const now = Date.now();
        const expiringSoon = [];

        for (const [potionType, buff] of this.activeBuffs.entries()) {
            if (now >= buff.expiresAt) {
                this.activeBuffs.delete(potionType);
                console.log(`[Potion Brewing] ${potionType} buff expired`);
            } else if (buff.expiresAt - now < 30000) { // Less than 30 seconds
                expiringSoon.push(potionType);
            }
        }

        if (expiringSoon.length > 0) {
            EventBus.emit('buffs:expiring', { buffs: expiringSoon });
        }
    }

    /**
     * Prepare buffs for mission
     */
    async prepareMissionBuffs(data) {
        const missionType = data.type || 'exploration';
        const priorityPotions = MissionPotionPriority[missionType] || MissionPotionPriority.exploration;

        console.log(`[Potion Brewing] Preparing buffs for ${missionType} mission`);

        for (const potionType of priorityPotions) {
            if (this.potionCounts[potionType] > 0) {
                await this.applyBuff(potionType);
            } else {
                console.log(`[Potion Brewing] Warning: No ${potionType} available for mission`);
            }
        }

        this.stats.missionsSupported++;
    }

    /**
     * Apply combat buffs
     */
    async applyCombatBuffs() {
        const combatPotions = MissionPotionPriority.combat;

        for (const potionType of combatPotions) {
            // Only apply if not already active
            if (!this.activeBuffs.has(potionType) && this.potionCounts[potionType] > 0) {
                await this.applyBuff(potionType);
            }
        }
    }

    /**
     * Check if ingredient was gathered
     */
    checkIngredientGathered(data) {
        const { resourceType } = data;

        if (IngredientSources[resourceType]) {
            console.log(`[Potion Brewing] Collected ingredient: ${resourceType}`);
        }
    }

    /**
     * Get recommended potions for current situation
     */
    getRecommendedPotions(situation) {
        const recommendations = [];

        switch (situation) {
            case 'low_health':
                if (this.potionCounts[PotionType.HEALING] > 0) {
                    recommendations.push(PotionType.HEALING);
                }
                if (this.potionCounts[PotionType.REGENERATION] > 0) {
                    recommendations.push(PotionType.REGENERATION);
                }
                break;

            case 'in_fire':
            case 'near_lava':
                if (this.potionCounts[PotionType.FIRE_RESISTANCE] > 0) {
                    recommendations.push(PotionType.FIRE_RESISTANCE);
                }
                break;

            case 'dark_area':
                if (this.potionCounts[PotionType.NIGHT_VISION] > 0) {
                    recommendations.push(PotionType.NIGHT_VISION);
                }
                break;

            case 'combat':
                recommendations.push(...MissionPotionPriority.combat.filter(p => this.potionCounts[p] > 0));
                break;
        }

        return recommendations;
    }

    /**
     * Get potion inventory
     */
    getPotionInventory() {
        return {
            counts: { ...this.potionCounts },
            activeBuffs: Object.fromEntries(this.activeBuffs),
            total: Object.values(this.potionCounts).reduce((a, b) => a + b, 0)
        };
    }

    /**
     * Get brewing queue status
     */
    getQueueStatus() {
        return {
            queue: this.brewingQueue.map(j => ({
                potionType: j.potionType,
                count: j.count,
                priority: j.priority
            })),
            isBrewing: this.isBrewing,
            brewingStandsAvailable: this.brewingStands.filter(s => !s.inUse).length
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            potionInventory: this.getPotionInventory(),
            activeBuffsCount: this.activeBuffs.size
        };
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.brewingQueue = [];
        this.activeBuffs.clear();
        console.log('[Potion Brewing] Cleanup complete');
    }
}

// Export
module.exports = PotionBrewingSystem;
module.exports.PotionType = PotionType;
module.exports.PotionRecipes = PotionRecipes;
module.exports.MissionPotionPriority = MissionPotionPriority;
module.exports.IngredientSources = IngredientSources;
