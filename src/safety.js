class SafetyMonitor {
    constructor(bot, minHealthPercent = 60, minFoodLevel = 10) {
        this.bot = bot;
        this.minHealthPercent = minHealthPercent;
        this.minFoodLevel = minFoodLevel;
    }

    isSafe() {
        const health = this.bot.health;
        const food = this.bot.food;
        const maxHealth = 20;

        const healthPercent = (health / maxHealth) * 100;
        const isHealthSafe = healthPercent >= this.minHealthPercent;
        const isFoodSafe = food >= this.minFoodLevel;

        return isHealthSafe && isFoodSafe;
    }

    getHealthPercent() {
        return (this.bot.health / 20) * 100;
    }

    needsFood() {
        return this.bot.food < this.minFoodLevel;
    }

    isLowHealth() {
        return this.getHealthPercent() < this.minHealthPercent;
    }

    async checkNearbyDangers() {
        const hostileMobs = Object.values(this.bot.entities).filter(entity => {
            if (!entity || !entity.position) return false;
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            const isHostile = this.isHostileMob(entity);
            
            return isHostile && distance < 16;
        });

        return hostileMobs;
    }

    isHostileMob(entity) {
        const hostileTypes = [
            'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
            'enderman', 'witch', 'phantom', 'blaze', 'ghast',
            'zombified_piglin', 'pillager', 'vindicator', 'evoker'
        ];
        
        return entity.name && hostileTypes.some(type => 
            entity.name.toLowerCase().includes(type)
        );
    }

    isInDanger(entity) {
        const pos = this.bot.entity.position;
        
        // Check for lava nearby
        const lavaCheck = this.checkBlocksAround(pos, ['lava', 'flowing_lava']);
        if (lavaCheck) return 'lava nearby';

        // Check if in fire
        if (this.bot.entity.isInLava || this.bot.entity.onFire) {
            return 'on fire';
        }

        // Check if drowning
        if (this.bot.entity.isInWater && this.bot.oxygenLevel < 5) {
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
