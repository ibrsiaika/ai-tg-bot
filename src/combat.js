const { goals } = require('mineflayer-pathfinder');

class CombatSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, safetyMonitor) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.safety = safetyMonitor;
        this.currentTarget = null;
        this.retreating = false;
    }

    async startCombatMonitoring() {
        setInterval(async () => {
            if (this.retreating) return;

            const threats = await this.safety.checkNearbyDangers();
            
            if (threats.length > 0 && this.safety.isSafe()) {
                await this.engageCombat(threats);
            } else if (threats.length > 0 && !this.safety.isSafe()) {
                await this.retreat();
            }
        }, 2000); // Check every 2 seconds
    }

    async engageCombat(threats) {
        if (!this.safety.isSafe()) {
            await this.retreat();
            return;
        }

        console.log(`Engaging ${threats.length} hostile mob(s)`);
        
        // Equip best weapon
        await this.inventory.equipBestWeapon();

        // Attack closest threat
        const closest = this.findClosestThreat(threats);
        if (!closest) return;

        this.currentTarget = closest;

        try {
            // Move towards enemy
            await this.bot.pathfinder.goto(new goals.GoalNear(
                closest.position.x,
                closest.position.y,
                closest.position.z,
                2
            ));

            // Attack
            await this.attackEntity(closest);
        } catch (error) {
            console.error('Error in combat:', error.message);
        } finally {
            this.currentTarget = null;
        }
    }

    async attackEntity(entity) {
        console.log(`Attacking ${entity.name || 'hostile mob'}`);
        
        let attackCount = 0;
        const maxAttacks = 20;

        while (entity.isValid && attackCount < maxAttacks) {
            // Check if we should retreat
            if (!this.safety.isSafe()) {
                console.log('Health too low, retreating');
                await this.retreat();
                return;
            }

            try {
                await this.bot.attack(entity);
                attackCount++;
                await this.sleep(500); // Attack cooldown
            } catch (error) {
                console.log('Entity defeated or out of range');
                break;
            }
        }

        console.log(`Combat ended after ${attackCount} attacks`);
    }

    findClosestThreat(threats) {
        if (threats.length === 0) return null;

        let closest = threats[0];
        let minDistance = this.bot.entity.position.distanceTo(closest.position);

        for (const threat of threats) {
            const distance = this.bot.entity.position.distanceTo(threat.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = threat;
            }
        }

        return closest;
    }

    async retreat() {
        if (this.retreating) return;
        
        this.retreating = true;
        console.log('Retreating from danger');

        const threats = await this.safety.checkNearbyDangers();
        const threatNames = threats.map(t => t.name || 'mob').join(', ');
        await this.notifier.notifyDanger(threatNames);

        try {
            // Run away from threats
            if (threats.length > 0) {
                const avgThreatPos = this.calculateAveragePosition(threats);
                const escapeDirection = this.bot.entity.position.minus(avgThreatPos).normalize();
                const escapePos = this.bot.entity.position.plus(escapeDirection.scaled(20));

                await this.bot.pathfinder.goto(new goals.GoalNear(
                    escapePos.x,
                    escapePos.y,
                    escapePos.z,
                    5
                ));
            }

            // Heal if possible
            await this.heal();

            console.log('Retreat completed');
        } catch (error) {
            console.error('Error during retreat:', error.message);
        } finally {
            this.retreating = false;
        }
    }

    calculateAveragePosition(entities) {
        let sumX = 0, sumY = 0, sumZ = 0;
        
        for (const entity of entities) {
            sumX += entity.position.x;
            sumY += entity.position.y;
            sumZ += entity.position.z;
        }

        const count = entities.length;
        return {
            x: sumX / count,
            y: sumY / count,
            z: sumZ / count
        };
    }

    async heal() {
        console.log('Attempting to heal');
        
        // Eat food
        if (this.safety.needsFood() || this.safety.isLowHealth()) {
            const ateFood = await this.inventory.eatFood();
            if (ateFood) {
                console.log('Healing with food');
                await this.sleep(2000); // Wait for healing
            }
        }

        // Wait for health regeneration
        let waitTime = 0;
        while (!this.safety.isSafe() && waitTime < 30000) {
            await this.sleep(1000);
            waitTime += 1000;
        }
    }

    async defendAgainstCreeper(creeper) {
        console.log('Creeper detected! Running away');
        
        // Run away quickly
        const escapeDirection = this.bot.entity.position.minus(creeper.position).normalize();
        const escapePos = this.bot.entity.position.plus(escapeDirection.scaled(15));

        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(
                escapePos.x,
                escapePos.y,
                escapePos.z,
                3
            ), { timeout: 3000 });
        } catch (error) {
            console.log('Creeper escape completed or interrupted');
        }
    }

    async equipShield() {
        const shield = await this.inventory.findItem('shield');
        if (shield) {
            try {
                await this.bot.equip(shield, 'off-hand');
                console.log('Shield equipped');
                return true;
            } catch (error) {
                console.error('Error equipping shield:', error.message);
            }
        }
        return false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CombatSystem;
