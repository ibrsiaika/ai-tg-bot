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
        this.lastRetreatTime = 0;
        this.retreatCooldown = 15000; // 15 seconds cooldown between retreats
        this.mobThreatAI = null; // Will be set after initialization
        
        // v4.2.0: PvP Combat System
        this.pvpEnabled = process.env.PVP_ENABLED === 'true';
        this.combatStance = process.env.PVP_DEFAULT_STANCE || 'balanced'; // aggressive, defensive, balanced
        this.autoEat = process.env.PVP_AUTO_EAT !== 'false';
        this.autoPotion = process.env.PVP_AUTO_POTION !== 'false';
        this.escapeHealthThreshold = parseInt(process.env.PVP_ESCAPE_HEALTH) || 4; // Hearts
        this.allies = new Set(); // Players we won't attack
        this.priorityTargets = new Set(); // Players to prioritize
        this.lastShieldUse = 0;
        this.shieldCooldown = 500; // ms between shield uses
        this.comboCounter = 0;
        this.lastAttackTime = 0;
        this.attackCooldown = 600; // ms - Minecraft attack cooldown
        
        // Combat statistics
        this.combatStats = {
            kills: 0,
            deaths: 0,
            damageDealt: 0,
            damageTaken: 0,
            combatsWon: 0,
            combatsLost: 0
        };
    }

    /**
     * Set the Mob Threat AI system (called after initialization)
     */
    setMobThreatAI(mobThreatAI) {
        this.mobThreatAI = mobThreatAI;
        console.log('✓ Mob Threat AI linked to combat system');
    }

    async startCombatMonitoring() {
        setInterval(async () => {
            if (this.retreating) return;

            // Use Mob Threat AI if available for better threat assessment
            if (this.mobThreatAI) {
                const situation = this.mobThreatAI.assessThreatSituation();
                
                // Check for preemptive retreat
                if (this.mobThreatAI.shouldPreemptivelyRetreat(this.bot.health)) {
                    console.log('Preemptive retreat triggered by Mob Threat AI');
                    await this.mobThreatAI.executeRetreat();
                    return;
                }
                
                // Engage if we can fight
                if (situation.canFight && situation.immediate.length > 0) {
                    await this.engageCombatAdvanced(situation);
                }
            } else {
                // Fallback to original logic
                const threats = await this.safety.checkNearbyDangers();
                
                if (threats.length > 0 && this.safety.isSafe()) {
                    await this.engageCombat(threats);
                } else if (threats.length > 0 && !this.safety.isSafe() && this.canRetreat()) {
                    await this.retreat();
                }
            }
        }, 3000); // Check every 3 seconds for more responsive combat (changed from 5)
    }

    /**
     * Advanced combat engagement using Mob Threat AI
     */
    async engageCombatAdvanced(situation) {
        if (!this.safety.isSafe() && this.canRetreat()) {
            await this.mobThreatAI.executeRetreat();
            return;
        }

        const target = situation.mostDangerous;
        if (!target || !target.entity) return;

        // Verify target is still valid
        if (!target.entity.isValid) {
            console.log('Target is no longer valid, skipping advanced combat');
            return;
        }

        console.log(`Engaging ${target.type} (danger score: ${target.dangerScore})`);
        
        // Equip best weapon
        await this.inventory.equipBestWeapon();
        
        // Try to equip shield for defense
        await this.equipShield();

        this.currentTarget = target.entity;

        try {
            // Move towards enemy
            await this.bot.pathfinder.goto(new goals.GoalNear(
                target.position.x,
                target.position.y,
                target.position.z,
                2
            ), { timeout: 5000 }); // Add timeout to prevent getting stuck

            // Attack
            await this.attackEntity(target.entity);
            
            // Record outcome
            this.mobThreatAI.recordThreatEncounter(target, 'defeated');
        } catch (error) {
            // Suppress PartialReadError - these are non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                // Silently ignore protocol errors during combat
                return;
            }
            // Suppress "goal was changed" errors - these occur when retreating during combat
            if (error.message?.includes('goal was changed')) {
                // Silently ignore - expected when priorities shift
                return;
            }
            // Suppress timeout errors
            if (error.message?.includes('timeout')) {
                console.log('Could not reach target in time');
                if (this.mobThreatAI && target) {
                    this.mobThreatAI.recordThreatEncounter(target, 'retreated');
                }
                return;
            }
            console.error('Error in advanced combat:', error.message);
            
            // Record failed encounter
            if (this.mobThreatAI && target) {
                this.mobThreatAI.recordThreatEncounter(target, 'retreated');
            }
        } finally {
            this.currentTarget = null;
        }
    }

    async engageCombat(threats) {
        if (!this.safety.isSafe() && this.canRetreat()) {
            await this.retreat();
            return;
        }

        console.log(`Engaging ${threats.length} hostile mob(s)`);
        
        // Equip best weapon (prioritize sword)
        await this.inventory.equipBestWeapon();
        
        // Try to equip shield for defense
        await this.equipShield();

        // Attack closest threat
        const closest = this.findClosestThreat(threats);
        if (!closest) return;

        // Verify threat is still valid before engaging
        if (!closest.isValid) {
            console.log('Target is no longer valid, skipping');
            return;
        }

        this.currentTarget = closest;

        try {
            // Determine optimal combat distance based on mob type
            const combatDistance = this.getOptimalCombatDistance(closest);
            
            // Move towards enemy at optimal distance
            await this.bot.pathfinder.goto(new goals.GoalNear(
                closest.position.x,
                closest.position.y,
                closest.position.z,
                combatDistance
            ), { timeout: 5000 }); // Add timeout to prevent getting stuck

            // Attack
            await this.attackEntity(closest);
        } catch (error) {
            // Suppress PartialReadError - these are non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                // Silently ignore protocol errors during combat
                return;
            }
            // Suppress "goal was changed" errors - these occur when retreating during combat
            if (error.message?.includes('goal was changed')) {
                // Silently ignore - expected when priorities shift
                return;
            }
            // Suppress timeout errors - just means we took too long to reach target
            if (error.message?.includes('timeout')) {
                console.log('Could not reach target in time, continuing');
                return;
            }
            console.error('Error in combat:', error.message);
        } finally {
            this.currentTarget = null;
        }
    }

    async attackEntity(entity) {
        console.log(`Attacking ${entity.name || 'hostile mob'}`);
        
        const entityPosition = entity.position.clone(); // Remember position for loot collection
        let attackCount = 0;
        const maxAttacks = 20;
        const attackRange = 4; // Maximum attack range

        while (entity.isValid && attackCount < maxAttacks) {
            // Check if entity is still alive (has health property)
            if (entity.health !== undefined && entity.health <= 0) {
                console.log('Entity defeated');
                break;
            }

            // Check if we should retreat
            if (!this.safety.isSafe() && this.canRetreat()) {
                console.log('Health too low, retreating');
                await this.retreat();
                return;
            }

            // Verify entity is still in range
            const distance = this.bot.entity.position.distanceTo(entity.position);
            if (distance > attackRange) {
                console.log(`Entity out of range (${distance.toFixed(1)} blocks), moving closer`);
                try {
                    await this.bot.pathfinder.goto(new goals.GoalNear(
                        entity.position.x,
                        entity.position.y,
                        entity.position.z,
                        2
                    ), { timeout: 2000 });
                } catch (error) {
                    // If can't reach, stop attacking
                    if (!error.message?.includes('goal was changed')) {
                        console.log('Cannot reach entity, ending combat');
                        break;
                    }
                }
                continue; // Try again after moving
            }

            try {
                await this.bot.attack(entity);
                attackCount++;
                await this.sleep(500); // Attack cooldown
            } catch (error) {
                // Suppress PartialReadError - non-fatal protocol errors
                if (error.name === 'PartialReadError' || 
                    error.message?.includes('PartialReadError') ||
                    error.message?.includes('Read error')) {
                    continue; // Try attacking again
                }
                console.log('Entity defeated or out of range');
                break;
            }
        }

        console.log(`Combat ended after ${attackCount} attacks`);
        
        // Collect dropped items after defeating the mob
        if (!entity.isValid || (entity.health !== undefined && entity.health <= 0)) {
            await this.collectNearbyItems(entityPosition);
        }
    }

    async collectNearbyItems(position, radius = 8) {
        console.log('Collecting nearby items from defeated mob');
        
        try {
            // Wait a moment for items to drop
            await this.sleep(1000);
            
            // Find nearby items on the ground
            const droppedItems = Object.values(this.bot.entities).filter(entity => 
                entity.type === 'object' && 
                entity.objectType === 'Item' &&
                entity.position.distanceTo(position) < radius
            );

            if (droppedItems.length === 0) {
                console.log('No items to collect');
                return;
            }

            console.log(`Found ${droppedItems.length} dropped items`);

            for (const item of droppedItems) {
                try {
                    // Navigate to item
                    await this.bot.pathfinder.goto(new goals.GoalBlock(
                        Math.floor(item.position.x),
                        Math.floor(item.position.y),
                        Math.floor(item.position.z)
                    ));
                    
                    // Wait for auto-pickup
                    await this.sleep(500);
                } catch (error) {
                    // Suppress PartialReadError - non-fatal protocol errors
                    if (error.name === 'PartialReadError' || 
                        error.message?.includes('PartialReadError') ||
                        error.message?.includes('Read error')) {
                        continue; // Skip this item and try next one
                    }
                    console.log('Could not reach item:', error.message);
                }
            }

            console.log('Item collection completed');
        } catch (error) {
            // Suppress PartialReadError - non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                return; // Exit silently
            }
            console.error('Error collecting items:', error.message);
        }
    }

    async collectRaidLoot() {
        console.log('Collecting raid loot');
        
        // Find all nearby items (raid drops)
        const items = Object.values(this.bot.entities).filter(entity => 
            entity.type === 'object' && 
            entity.objectType === 'Item'
        );

        if (items.length === 0) {
            console.log('No raid loot found');
            return false;
        }

        console.log(`Found ${items.length} items to collect from raid`);

        for (const item of items) {
            if (this.inventory.isInventoryFull()) {
                console.log('Inventory full, stopping loot collection');
                await this.notifier.notifyInventoryFull();
                break;
            }

            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(
                    Math.floor(item.position.x),
                    Math.floor(item.position.y),
                    Math.floor(item.position.z)
                ));
                
                await this.sleep(500);
            } catch (error) {
                // Suppress PartialReadError - non-fatal protocol errors
                if (error.name === 'PartialReadError' || 
                    error.message?.includes('PartialReadError') ||
                    error.message?.includes('Read error')) {
                    continue; // Skip to next item
                }
                console.log('Could not reach item');
            }
        }

        await this.notifier.send('Raid loot collected');
        console.log('Raid loot collection completed');
        return true;
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
        // Check if already retreating or on cooldown
        const now = Date.now();
        if (this.retreating) {
            return;
        }
        
        if (now - this.lastRetreatTime < this.retreatCooldown) {
            console.log(`Retreat on cooldown (${Math.ceil((this.retreatCooldown - (now - this.lastRetreatTime)) / 1000)}s remaining)`);
            return;
        }
        
        this.retreating = true;
        this.lastRetreatTime = now;
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
                ), { timeout: 8000 }); // Add timeout to prevent getting stuck during retreat
            }

            // Heal if possible
            await this.heal();

            console.log('Retreat completed');
        } catch (error) {
            // Suppress PartialReadError - non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                // Continue with retreat completion
            } else if (error.message?.includes('timeout')) {
                console.log('Retreat timeout - continuing anyway');
            } else {
                console.error('Error during retreat:', error.message);
            }
        } finally {
            // Keep retreating flag set for a bit longer to prevent immediate re-trigger
            setTimeout(() => {
                this.retreating = false;
            }, 5000); // Keep flag for 5 seconds after retreat completes
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

    canRetreat() {
        const now = Date.now();
        return !this.retreating && (now - this.lastRetreatTime >= this.retreatCooldown);
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
            // Suppress PartialReadError - non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                return; // Exit silently
            }
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
                // Suppress PartialReadError - non-fatal protocol errors
                if (error.name === 'PartialReadError' || 
                    error.message?.includes('PartialReadError') ||
                    error.message?.includes('Read error')) {
                    return false; // Exit silently
                }
                console.error('Error equipping shield:', error.message);
            }
        } else {
            // Try to craft a shield if we don't have one
            await this.craftShield();
        }
        return false;
    }

    async craftShield() {
        // Check if we have materials: 6 planks + 1 iron ingot
        let hasIron = await this.inventory.hasItem('iron_ingot', 1);
        
        // Check for any type of planks (not just generic 'planks')
        const PLANK_TYPES = [
            'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
            'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
            'bamboo_planks', 'crimson_planks', 'warped_planks'
        ];
        
        let hasPlanks = false;
        for (const plankType of PLANK_TYPES) {
            if (await this.inventory.hasItem(plankType, 6)) {
                hasPlanks = true;
                break;
            }
        }
        
        // If no iron ingot but have raw iron and coal, try to smelt it
        if (!hasIron) {
            const hasRawIron = await this.inventory.hasItem('raw_iron', 1);
            const hasCoal = await this.inventory.hasItem('coal', 1) || 
                           await this.inventory.hasItem('charcoal', 1);
            
            if (hasRawIron && hasCoal) {
                console.log('No iron ingot available, but have raw iron. Need to smelt first.');
                console.log('Will wait for autonomous system to smelt raw iron');
                return false;
            } else if (hasRawIron && !hasCoal) {
                console.log('Have raw iron but no fuel for smelting');
                return false;
            } else {
                console.log('Insufficient materials for shield (need: 6 planks + 1 iron ingot or raw iron with fuel)');
                return false;
            }
        }
        
        if (hasIron && hasPlanks) {
            console.log('Crafting shield for defense');
            try {
                // Get the shield item and recipe
                const shieldItem = this.bot.registry.itemsByName.shield;
                if (!shieldItem) {
                    console.log('Shield item not found in registry');
                    return false;
                }
                
                const recipes = this.bot.recipesFor(shieldItem.id, null, 1, null);
                if (!recipes || recipes.length === 0) {
                    console.log('No recipe found for shield');
                    return false;
                }
                
                const recipe = recipes[0];
                await this.bot.craft(recipe, 1, null);
                await this.notifier.send('🛡️ Shield crafted for combat defense!');
                console.log('Shield crafted successfully');
                return true;
            } catch (error) {
                // Suppress PartialReadError - non-fatal protocol errors
                if (error.name === 'PartialReadError' || 
                    error.message?.includes('PartialReadError') ||
                    error.message?.includes('Read error')) {
                    return false; // Exit silently
                }
                console.error('Error crafting shield:', error.message);
            }
        } else {
            console.log('Insufficient materials for shield (need: 6 planks + 1 iron ingot)');
        }
        return false;
    }
    
    /**
     * Returns the optimal combat distance based on mob type
     * Ranged mobs need distance, melee mobs can be fought up close
     */
    getOptimalCombatDistance(entity) {
        const mobType = entity.name || entity.type;
        
        // Ranged mobs - keep distance
        const rangedMobs = ['skeleton', 'stray', 'witch', 'pillager', 'illusioner'];
        if (rangedMobs.some(mob => mobType && mobType.toLowerCase().includes(mob))) {
            console.log(`Ranged mob detected (${mobType}), maintaining distance`);
            return 4; // Stay 4 blocks away for safety while still able to hit
        }
        
        // Flying mobs - medium distance
        const flyingMobs = ['phantom', 'vex'];
        if (flyingMobs.some(mob => mobType && mobType.toLowerCase().includes(mob))) {
            return 3;
        }
        
        // Explosive mobs - maximum safe distance
        if (mobType && mobType.toLowerCase().includes('creeper')) {
            console.log('Creeper detected, using hit-and-run tactics');
            return 5; // Stay outside blast radius
        }
        
        // Melee mobs - close combat
        return 2; // Standard melee range
    }
    
    // ==================== v4.2.0 PvP Combat Methods ====================
    
    /**
     * Set combat stance
     * @param {string} stance - 'aggressive', 'defensive', or 'balanced'
     */
    setStance(stance) {
        const validStances = ['aggressive', 'defensive', 'balanced'];
        if (validStances.includes(stance)) {
            this.combatStance = stance;
            console.log(`Combat stance set to: ${stance}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get combat stance parameters
     * @returns {Object} Stance-specific combat parameters
     */
    getStanceParameters() {
        switch (this.combatStance) {
            case 'aggressive':
                return {
                    attackRange: 3.5,
                    retreatHealth: 3, // Lower retreat threshold
                    pursuitDistance: 15,
                    blockChance: 0.2, // Less blocking
                    criticalAttackWeight: 1.5 // More critical attacks
                };
            case 'defensive':
                return {
                    attackRange: 2.5,
                    retreatHealth: 8, // Higher retreat threshold
                    pursuitDistance: 8,
                    blockChance: 0.7, // More blocking
                    criticalAttackWeight: 0.8
                };
            case 'balanced':
            default:
                return {
                    attackRange: 3,
                    retreatHealth: 5,
                    pursuitDistance: 12,
                    blockChance: 0.4,
                    criticalAttackWeight: 1.0
                };
        }
    }
    
    /**
     * Add player to ally list
     * @param {string} playerName - Player username
     */
    addAlly(playerName) {
        this.allies.add(playerName.toLowerCase());
        console.log(`Added ${playerName} to allies list`);
    }
    
    /**
     * Remove player from ally list
     * @param {string} playerName - Player username
     */
    removeAlly(playerName) {
        this.allies.delete(playerName.toLowerCase());
        console.log(`Removed ${playerName} from allies list`);
    }
    
    /**
     * Check if player is an ally
     * @param {string} playerName - Player username
     * @returns {boolean}
     */
    isAlly(playerName) {
        return this.allies.has(playerName.toLowerCase());
    }
    
    /**
     * Set priority target
     * @param {string} playerName - Player username to prioritize
     */
    setPriorityTarget(playerName) {
        this.priorityTargets.add(playerName.toLowerCase());
        console.log(`Set ${playerName} as priority target`);
    }
    
    /**
     * Attempt to block with shield
     * @returns {boolean} Whether block was successful
     */
    async useShield() {
        const now = Date.now();
        if (now - this.lastShieldUse < this.shieldCooldown) {
            return false;
        }
        
        // Check if we have a shield equipped
        const offHand = this.bot.inventory.slots[45]; // Off-hand slot
        if (!offHand || !offHand.name.includes('shield')) {
            return false;
        }
        
        try {
            // Activate shield by sneaking
            this.bot.setControlState('sneak', true);
            this.lastShieldUse = now;
            
            // Hold for a short duration
            await this.sleep(300);
            this.bot.setControlState('sneak', false);
            
            return true;
        } catch (error) {
            this.bot.setControlState('sneak', false);
            return false;
        }
    }
    
    /**
     * Execute a critical attack (jumping attack)
     * @param {Entity} entity - Target entity
     * @returns {boolean} Whether critical attack was successful
     */
    async criticalAttack(entity) {
        if (!entity || !entity.isValid) {
            return false;
        }
        
        const now = Date.now();
        if (now - this.lastAttackTime < this.attackCooldown) {
            return false;
        }
        
        try {
            // Jump and attack while falling for critical hit
            this.bot.setControlState('jump', true);
            await this.sleep(150); // Wait to reach apex
            this.bot.setControlState('jump', false);
            
            // Attack while falling
            await this.sleep(100);
            await this.bot.attack(entity);
            
            this.lastAttackTime = now;
            this.comboCounter++;
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Execute attack with proper cooldown timing
     * @param {Entity} entity - Target entity
     * @returns {boolean} Whether attack was successful
     */
    async timedAttack(entity) {
        if (!entity || !entity.isValid) {
            return false;
        }
        
        const now = Date.now();
        const timeSinceLastAttack = now - this.lastAttackTime;
        
        // Wait for attack cooldown if needed
        if (timeSinceLastAttack < this.attackCooldown) {
            await this.sleep(this.attackCooldown - timeSinceLastAttack);
        }
        
        try {
            await this.bot.attack(entity);
            this.lastAttackTime = Date.now();
            this.comboCounter++;
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Use combat potions if available
     * @returns {boolean} Whether potion was used
     */
    async useCombatPotion() {
        if (!this.autoPotion) {
            return false;
        }
        
        // Find beneficial potions
        const potionTypes = [
            'potion', 'splash_potion'
        ];
        
        const healthPotions = ['healing', 'regeneration'];
        const strengthPotions = ['strength', 'swiftness'];
        
        try {
            // Check if we need healing
            const healthPercent = (this.bot.health / 20) * 100;
            
            // Use health potion if below 50% health
            if (healthPercent < 50) {
                for (const potionType of potionTypes) {
                    const potion = this.bot.inventory.items().find(item => 
                        item.name.includes(potionType) && 
                        healthPotions.some(hp => item.nbt?.value?.Potion?.value?.includes(hp))
                    );
                    
                    if (potion) {
                        await this.bot.equip(potion, 'hand');
                        this.bot.activateItem();
                        await this.sleep(500);
                        console.log('Used healing potion');
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get combat statistics
     * @returns {Object} Combat stats
     */
    getCombatStats() {
        return {
            ...this.combatStats,
            pvpEnabled: this.pvpEnabled,
            currentStance: this.combatStance,
            alliesCount: this.allies.size,
            priorityTargetsCount: this.priorityTargets.size
        };
    }
    
    /**
     * Reset combo counter (call when target changes or after timeout)
     */
    resetCombo() {
        this.comboCounter = 0;
    }
    
    /**
     * Check if we should escape based on stance and health
     * @returns {boolean}
     */
    shouldEscape() {
        const params = this.getStanceParameters();
        // Health is 0-20, convert threshold from hearts (each heart = 2 health)
        const healthThreshold = params.retreatHealth * 2;
        return this.bot.health <= healthThreshold;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CombatSystem;
