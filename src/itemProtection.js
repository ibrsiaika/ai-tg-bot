const CONSTANTS = require('./constants');
const Vec3 = require('vec3');

/**
 * Item Protection System
 * Protects bot's food and valuable items from other players and mobs
 */
class ItemProtection {
    constructor(bot, notifier, inventoryManager) {
        this.bot = bot;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        
        // Protected chest locations
        this.protectedChests = new Map();
        
        // Players to monitor
        this.nearbyPlayers = new Set();
        
        // Configuration
        this.PLAYER_DANGER_RADIUS = 16;
        this.CHEST_PROTECTION_RADIUS = 3;
        this.CHECK_INTERVAL = 5000; // Check every 5 seconds
        
        // Track last food consumption time
        this.lastFoodConsumption = 0;
        this.FOOD_CONSUMPTION_COOLDOWN = 3000;
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Start monitoring for threats to items
     */
    startMonitoring() {
        console.log('Item protection system activated');
        
        // Monitor player proximity
        setInterval(() => {
            this.checkNearbyPlayers();
        }, this.CHECK_INTERVAL);
        
        // Listen for entity spawn events
        this.bot.on('entitySpawn', (entity) => {
            if (entity.type === 'player' && entity !== this.bot.entity) {
                this.onPlayerNearby(entity);
            }
        });
    }

    /**
     * Check for nearby players
     */
    checkNearbyPlayers() {
        const players = Object.values(this.bot.entities).filter(entity => {
            if (!entity || entity === this.bot.entity) return false;
            if (entity.type !== 'player') return false;
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            return distance < this.PLAYER_DANGER_RADIUS;
        });
        
        // Update nearby players set
        this.nearbyPlayers.clear();
        players.forEach(player => {
            this.nearbyPlayers.add(player.username);
        });
        
        // Alert if new players detected
        if (players.length > 0 && players.length > this.nearbyPlayers.size) {
            console.log(`⚠️ ${players.length} player(s) nearby - protecting items`);
        }
    }

    /**
     * Handle player nearby event
     */
    onPlayerNearby(player) {
        if (!this.nearbyPlayers.has(player.username)) {
            this.nearbyPlayers.add(player.username);
            console.log(`⚠️ Player detected: ${player.username}`);
            
            // Notify about player presence
            this.notifier.send(`⚠️ Player nearby: ${player.username}. Protecting items.`);
        }
    }

    /**
     * Check if it's safe to consume food
     * Only eat when not in danger from players or mobs
     */
    canSafelyEat() {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastFoodConsumption < this.FOOD_CONSUMPTION_COOLDOWN) {
            return false;
        }
        
        // Don't eat if players are nearby (they might see and attack)
        if (this.nearbyPlayers.size > 0) {
            console.log('⚠️ Players nearby - delaying food consumption for safety');
            return false;
        }
        
        // Don't eat if hostile mobs are nearby
        const hostileMobs = this.getNearbyHostileMobs();
        if (hostileMobs.length > 0) {
            console.log('⚠️ Hostile mobs nearby - not safe to eat');
            return false;
        }
        
        // Check if bot is in combat
        if (this.isInCombat()) {
            console.log('⚠️ In combat - not safe to eat');
            return false;
        }
        
        return true;
    }

    /**
     * Safely consume food with protection checks
     */
    async safelyEatFood() {
        if (!this.canSafelyEat()) {
            return false;
        }
        
        try {
            const food = await this.inventory.findFood();
            if (!food) {
                return false;
            }
            
            // Eat food
            await this.inventory.eatFood();
            this.lastFoodConsumption = Date.now();
            
            console.log(`Safely consumed ${food.name}`);
            return true;
        } catch (error) {
            console.error('Error eating food safely:', error.message);
            return false;
        }
    }

    /**
     * Get nearby hostile mobs
     */
    getNearbyHostileMobs() {
        return Object.values(this.bot.entities).filter(entity => {
            if (!entity || !entity.position) return false;
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            const isHostile = CONSTANTS.HOSTILE_MOBS.includes(entity.name);
            
            return isHostile && distance < CONSTANTS.COMBAT.HOSTILE_MOB_RANGE;
        });
    }

    /**
     * Check if bot is currently in combat
     */
    isInCombat() {
        // Check if recently took damage
        const recentDamageTime = 5000; // 5 seconds
        const lastDamage = this.bot.entity.metadata?.[9] || 0; // Last hurt time
        
        return (Date.now() - lastDamage) < recentDamageTime;
    }

    /**
     * Register a chest as protected
     */
    registerProtectedChest(position, type = 'storage') {
        const key = `${position.x},${position.y},${position.z}`;
        this.protectedChests.set(key, {
            position,
            type,
            registeredAt: Date.now()
        });
        
        console.log(`Protected chest registered at ${key} (${type})`);
    }

    /**
     * Check if a chest is protected
     */
    isChestProtected(position) {
        const key = `${position.x},${position.y},${position.z}`;
        return this.protectedChests.has(key);
    }

    /**
     * Store valuable items in protected chests
     */
    async storeValuableItems() {
        console.log('Storing valuable items in protected location');
        
        // Find protected chest
        const chest = this.findNearestProtectedChest();
        if (!chest) {
            console.log('No protected chest available');
            return false;
        }
        
        try {
            // Move to chest
            const { goals } = require('mineflayer-pathfinder');
            await this.bot.pathfinder.goto(new goals.GoalBlock(
                chest.position.x,
                chest.position.y,
                chest.position.z
            ));
            
            // Open chest
            const chestBlock = this.bot.blockAt(chest.position);
            const chestWindow = await this.bot.openChest(chestBlock);
            
            // Store valuable items
            const valuableItems = this.getValuableItems();
            for (const item of valuableItems) {
                try {
                    await chestWindow.deposit(item.type, null, item.count);
                    console.log(`Stored ${item.count} ${item.name} in protected chest`);
                } catch (error) {
                    // Continue with next item
                }
            }
            
            chestWindow.close();
            return true;
        } catch (error) {
            console.error('Error storing valuable items:', error.message);
            return false;
        }
    }

    /**
     * Find nearest protected chest
     */
    findNearestProtectedChest() {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const [key, chestData] of this.protectedChests.entries()) {
            const distance = this.bot.entity.position.distanceTo(chestData.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = chestData;
            }
        }
        
        return nearest;
    }

    /**
     * Get list of valuable items from inventory
     */
    getValuableItems() {
        const valuables = [
            'diamond', 'diamond_ore', 'diamond_block',
            'emerald', 'emerald_ore', 'emerald_block',
            'gold_ingot', 'gold_ore', 'gold_block',
            'iron_ingot', 'iron_ore', 'iron_block',
            'netherite_ingot', 'netherite_scrap',
            'enchanted_book', 'enchanted_golden_apple'
        ];
        
        return this.bot.inventory.items().filter(item => 
            valuables.some(valuable => item.name.includes(valuable))
        );
    }

    /**
     * Check if area around position is safe from players
     */
    isAreaSafeFromPlayers(position, radius = 16) {
        const players = Object.values(this.bot.entities).filter(entity => {
            if (!entity || entity === this.bot.entity) return false;
            if (entity.type !== 'player') return false;
            
            const distance = position.distanceTo(entity.position);
            return distance < radius;
        });
        
        return players.length === 0;
    }

    /**
     * Protect food specifically - prevent mobs from eating dropped food
     */
    async protectFoodFromMobs() {
        // Pick up any dropped food items nearby
        const droppedFood = Object.values(this.bot.entities).filter(entity => {
            if (!entity || entity.type !== 'object') return false;
            if (!entity.metadata || !entity.metadata[8]) return false; // Item entity
            
            const itemType = entity.metadata[8];
            const isFoodItem = CONSTANTS.FOOD_ITEMS.some(food => 
                itemType.itemId === this.bot.registry.itemsByName[food]?.id
            );
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            return isFoodItem && distance < 16;
        });
        
        if (droppedFood.length > 0) {
            console.log(`Found ${droppedFood.length} dropped food items - collecting for protection`);
            // The collectblock plugin will handle pickup automatically
            return true;
        }
        
        return false;
    }

    /**
     * Get protection status report
     */
    getProtectionStatus() {
        return {
            nearbyPlayers: this.nearbyPlayers.size,
            protectedChests: this.protectedChests.size,
            safeToEat: this.canSafelyEat(),
            nearbyHostiles: this.getNearbyHostileMobs().length,
            inCombat: this.isInCombat()
        };
    }
}

module.exports = ItemProtection;
