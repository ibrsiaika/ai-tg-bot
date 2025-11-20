const CONSTANTS = require('./constants');
const Utils = require('./utils');

class SafetyMonitor {
    constructor(bot, minHealthPercent = CONSTANTS.SAFETY.DEFAULT_MIN_HEALTH_PERCENT, minFoodLevel = CONSTANTS.SAFETY.DEFAULT_MIN_FOOD_LEVEL) {
        this.bot = bot;
        this.minHealthPercent = minHealthPercent;
        this.minFoodLevel = minFoodLevel;
        this.lastHealTime = 0;
    }

    isSafe() {
        const health = this.bot.health;
        const food = this.bot.food;
        const maxHealth = CONSTANTS.SAFETY.MAX_HEALTH;

        const healthPercent = (health / maxHealth) * 100;
        const isHealthSafe = healthPercent >= this.minHealthPercent;
        const isFoodSafe = food >= this.minFoodLevel;

        return isHealthSafe && isFoodSafe;
    }

    getHealthPercent() {
        return (this.bot.health / CONSTANTS.SAFETY.MAX_HEALTH) * 100;
    }

    needsFood() {
        return this.bot.food < this.minFoodLevel;
    }

    isLowHealth() {
        return this.getHealthPercent() < this.minHealthPercent;
    }

    isCriticalHealth() {
        return this.getHealthPercent() < CONSTANTS.SAFETY.CRITICAL_HEALTH_THRESHOLD;
    }

    /**
     * Heal the bot by eating food and waiting
     * Food regenerates health when food level is high enough
     */
    async healBot(inventoryManager) {
        console.log('Attempting to heal bot');
        
        // Prevent heal spam
        const now = Date.now();
        if (now - this.lastHealTime < CONSTANTS.DELAYS.HEAL_DELAY_MS) {
            console.log('Heal on cooldown');
            return false;
        }
        
        // Eat food to get saturation up for regeneration
        if (this.bot.food < CONSTANTS.SAFETY.MAX_FOOD - 2) {
            const food = await inventoryManager.findFood();
            if (food) {
                await inventoryManager.eatFood();
                console.log('Consumed food to boost regeneration');
            }
        }
        
        // Wait for natural regeneration (requires food level >= 18)
        if (this.bot.food >= 18) {
            console.log('Resting for health regeneration...');
            const initialHealth = this.bot.health;
            const maxWaitTime = 30000; // 30 seconds max
            const startTime = Date.now();
            
            while (this.bot.health < CONSTANTS.SAFETY.MAX_HEALTH && 
                   Date.now() - startTime < maxWaitTime) {
                await Utils.sleep(1000);
                
                // If health is regenerating, continue waiting
                if (this.bot.health > initialHealth) {
                    console.log(`Health regenerating: ${this.bot.health}/${CONSTANTS.SAFETY.MAX_HEALTH}`);
                }
            }
            
            this.lastHealTime = Date.now();
            console.log(`Healing complete. Health: ${this.bot.health}/${CONSTANTS.SAFETY.MAX_HEALTH}`);
            return true;
        } else {
            console.log('Food level too low for regeneration');
            return false;
        }
    }

    async checkNearbyDangers() {
        const hostileMobs = Object.values(this.bot.entities).filter(entity => {
            if (!entity || !entity.position) return false;
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            const isHostile = this.isHostileMob(entity);
            
            return isHostile && distance < CONSTANTS.COMBAT.HOSTILE_MOB_RANGE;
        });

        return hostileMobs;
    }

    isHostileMob(entity) {
        if (!entity || !entity.name) return false;
        return CONSTANTS.HOSTILE_MOBS.some(type => 
            entity.name.toLowerCase().includes(type)
        );
    }

    isInDanger(entity) {
        const pos = this.bot.entity.position;
        
        // Check for lava nearby
        const lavaCheck = this.checkBlocksAround(pos, CONSTANTS.DANGEROUS_BLOCKS);
        if (lavaCheck) return 'lava nearby';

        // Check if in fire
        if (this.bot.entity.isInLava || this.bot.entity.onFire) {
            return 'on fire';
        }

        // Check if drowning
        if (this.bot.entity.isInWater && this.bot.oxygenLevel < CONSTANTS.SAFETY.OXYGEN_CRITICAL) {
            return 'drowning';
        }

        // Check for fall damage risk
        const blockBelow = this.bot.blockAt(pos.offset(0, -1, 0));
        if (!blockBelow || blockBelow.name === 'air') {
            const fallDistance = this.checkFallDistance(pos);
            if (fallDistance > 3) {
                return 'fall risk';
            }
        }

        return null;
    }

    checkBlocksAround(pos, blockNames) {
        const radius = 3;
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const block = this.bot.blockAt(pos.offset(x, y, z));
                    if (block && blockNames.includes(block.name)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkFallDistance(pos) {
        let distance = 0;
        for (let y = pos.y - 1; y >= pos.y - 20; y--) {
            const block = this.bot.blockAt(pos.offset(0, y - pos.y, 0));
            if (!block || block.name === 'air') {
                distance++;
            } else {
                break;
            }
        }
        return distance;
    }
}

module.exports = SafetyMonitor;
