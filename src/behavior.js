class BehaviorManager {
    constructor(bot, systems, notifier, safetyMonitor) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        this.safety = safetyMonitor;
        this.intelligence = systems.intelligence; // Link to intelligence system
        
        this.currentGoal = null;
        this.isActive = false;
        this.goalQueue = [];
        this.priorities = {
            CRITICAL: 100,
            HIGH: 75,
            MEDIUM: 50,
            LOW: 25
        };
        
        // Enhanced intelligence tracking
        this.performanceMetrics = {
            resourcesGathered: 0,
            structuresBuilt: 0,
            mobsDefeated: 0,
            areasExplored: 0,
            toolsUpgraded: 0,
            deathCount: 0
        };
        
        this.adaptiveBehavior = {
            explorationPreference: 0.3,
            miningPreference: 0.4,
            buildingPreference: 0.2,
            farmingPreference: 0.15
        };
        
        // Decision tracking
        this.lastDecisionTime = Date.now();
        this.decisionCount = 0;
    }

    async start() {
        console.log('Behavior manager started - operating autonomously');
        this.isActive = true;
        
        await this.notifier.notifyStatus('Bot activated - autonomous mode');
        
        // Start autonomous decision loop
        this.autonomousLoop();
    }

    async autonomousLoop() {
        while (this.isActive) {
            try {
                // Safety checks first
                if (!this.safety.isSafe()) {
                    await this.handleSafetyIssue();
                    await this.sleep(3000); // Wait after handling safety issue
                    continue;
                }

                // Check for environmental dangers
                const danger = this.safety.isInDanger();
                if (danger && this.systems.combat.canRetreat()) {
                    await this.systems.combat.retreat();
                    await this.sleep(3000); // Wait after retreat
                    continue;
                }

                // Execute or choose next goal
                if (!this.currentGoal) {
                    this.currentGoal = await this.chooseNextGoal();
                }

                if (this.currentGoal) {
                    console.log(`Executing goal: ${this.currentGoal.name}`);
                    await this.executeGoal(this.currentGoal);
                    this.currentGoal = null;
                }

                await this.sleep(5000); // Wait between goals
            } catch (error) {
                console.error('Error in autonomous loop:', error.message);
                await this.sleep(10000); // Wait longer on error
            }
        }
    }

    async chooseNextGoal() {
        console.log('Choosing next autonomous goal (Enhanced AI with Intelligence System)');
        
        // Update intelligence system with current inventory
        if (this.intelligence) {
            this.intelligence.updateResourceStatus(this.systems.inventory);
        }
        
        const goals = [];
        const timeOfDay = this.bot.time.timeOfDay;
        const isNight = timeOfDay > 13000 && timeOfDay < 23000;

        // CRITICAL: Survival goals
        if (this.safety.needsFood()) {
            goals.push({
                name: 'find_food',
                type: 'survival',
                priority: this.priorities.CRITICAL,
                expectedReward: 10,
                action: async () => await this.findAndEatFood()
            });
        }

        if (this.safety.isLowHealth()) {
            goals.push({
                name: 'heal',
                type: 'survival',
                priority: this.priorities.CRITICAL,
                expectedReward: 10,
                action: async () => await this.systems.combat.heal()
            });
        }

        // HIGH: Essential tools
        const hasBasicTools = await this.systems.inventory.hasBasicTools();
        
        if (!hasBasicTools.hasPickaxe || !hasBasicTools.hasAxe) {
            goals.push({
                name: 'craft_basic_tools',
                type: 'crafting',
                priority: this.priorities.HIGH,
                expectedReward: 8,
                action: async () => await this.craftBasicTools()
            });
        }

        // Use intelligence system to determine resource priorities
        if (this.intelligence) {
            const mostNeeded = this.intelligence.getMostNeededResource();
            
            if (mostNeeded.priority > 0.5) {
                goals.push({
                    name: `gather_${mostNeeded.resource}`,
                    type: 'gathering',
                    priority: this.priorities.HIGH,
                    expectedReward: mostNeeded.priority * 10,
                    action: async () => await this.gatherSpecificResource(mostNeeded.resource)
                });
            }
        }

        // Adaptive behavior based on time of day
        if (isNight) {
            // Night activities: indoor tasks, mining, crafting
            if (Math.random() < this.adaptiveBehavior.miningPreference * 1.5) {
                goals.push({
                    name: 'night_mining',
                    type: 'mining',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 7,
                    action: async () => await this.mineResources()
                });
            }
            
            if (Math.random() < 0.3) {
                goals.push({
                    name: 'craft_items',
                    type: 'crafting',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 5,
                    action: async () => await this.craftingSession()
                });
            }
        } else {
            // Day activities: exploration, gathering, building
            if (Math.random() < this.adaptiveBehavior.explorationPreference) {
                goals.push({
                    name: 'explore_world',
                    type: 'explore',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 6,
                    action: async () => await this.intelligentExploration()
                });
            }
            
            if (Math.random() < 0.5) {
                goals.push({
                    name: 'gather_resources',
                    type: 'gathering',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 6,
                    action: async () => await this.gatherResourcesIntelligently()
                });
            }
            
            if (Math.random() < this.adaptiveBehavior.buildingPreference) {
                goals.push({
                    name: 'build_structures',
                    type: 'building',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 5,
                    action: async () => await this.buildIntelligently()
                });
            }
        }

        // MEDIUM: Regular activities
        if (Math.random() < this.adaptiveBehavior.miningPreference) {
            goals.push({
                name: 'mine_resources',
                type: 'mining',
                priority: this.priorities.MEDIUM,
                expectedReward: 6,
                action: async () => await this.mineResources()
            });
        }

        if (Math.random() < this.adaptiveBehavior.farmingPreference) {
            goals.push({
                name: 'auto_farm',
                type: 'farming',
                priority: this.priorities.MEDIUM,
                expectedReward: 5,
                action: async () => await this.systems.farming.autoFarm()
            });
        }

        // Tool upgrading check
        if (Math.random() < 0.2) {
            goals.push({
                name: 'upgrade_tools',
                type: 'crafting',
                priority: this.priorities.MEDIUM,
                expectedReward: 8,
                action: async () => await this.upgradeEquipment()
            });
        }

        // Tool maintenance check
        if (this.systems.toolDurability) {
            const maintenancePriority = this.systems.toolDurability.getMaintenancePriority();
            if (maintenancePriority > 0.5) {
                goals.push({
                    name: 'tool_maintenance',
                    type: 'maintenance',
                    priority: this.priorities.HIGH,
                    expectedReward: maintenancePriority * 10,
                    action: async () => await this.systems.toolDurability.performMaintenance()
                });
            }
        }

        // Advanced base building
        if (Math.random() < 0.1 && this.systems.advancedBase) {
            goals.push({
                name: 'advanced_base',
                type: 'building',
                priority: this.priorities.LOW,
                expectedReward: 10,
                targetPosition: this.bot.entity.position,
                action: async () => await this.systems.advancedBase.buildAdvancedBase(this.bot.entity.position)
            });
        }

        // HIGH: Inventory management
        if (this.systems.inventory.isInventoryFull()) {
            goals.push({
                name: 'manage_inventory',
                type: 'inventory',
                priority: this.priorities.HIGH,
                expectedReward: 4,
                action: async () => await this.manageInventory()
            });
        }

        // Use intelligence system to optimize decision if available
        let selectedGoal;
        if (this.intelligence && goals.length > 1) {
            selectedGoal = this.intelligence.optimizeDecision(goals);
            console.log(`Intelligence system selected: ${selectedGoal.name} (score: ${selectedGoal.score.toFixed(2)})`);
        } else {
            // Sort by priority and return highest
            goals.sort((a, b) => b.priority - a.priority);
            selectedGoal = goals[0];
        }

        this.decisionCount++;
        
        // Periodic intelligence report (every 50 decisions)
        if (this.intelligence && this.decisionCount % 50 === 0) {
            await this.intelligence.generateReport();
        }

        return selectedGoal || {
            name: 'idle_explore',
            type: 'explore',
            priority: this.priorities.LOW,
            expectedReward: 3,
            action: async () => await this.explore()
        };
    }

    async executeGoal(goal) {
        const startTime = Date.now();
        let success = false;
        
        try {
            console.log(`Starting: ${goal.name}`);
            await goal.action();
            console.log(`Completed: ${goal.name}`);
            success = true;
        } catch (error) {
            console.error(`Error executing ${goal.name}:`, error.message);
        }
        
        // Record action in intelligence system
        if (this.intelligence) {
            const duration = Date.now() - startTime;
            const reward = success ? (goal.expectedReward || 5) : 0;
            this.intelligence.recordAction(goal.name, success, reward);
        }
    }

    async handleSafetyIssue() {
        console.log('Handling safety issue');
        
        if (this.safety.needsFood()) {
            await this.systems.inventory.eatFood();
        }

        if (this.safety.isLowHealth() && this.systems.combat.canRetreat()) {
            await this.systems.combat.retreat();
            await this.systems.combat.heal();
        }

        const threats = await this.safety.checkNearbyDangers();
        if (threats.length > 0 && this.systems.combat.canRetreat()) {
            await this.systems.combat.retreat();
        }
    }

    async findAndEatFood() {
        console.log('Finding and eating food');
        
        const hasFood = await this.systems.inventory.findFood();
        
        if (hasFood) {
            await this.systems.inventory.eatFood();
        } else {
            // Try to find food sources
            await this.systems.farming.autoFarm();
        }
    }

    async craftBasicTools() {
        console.log('Crafting basic tools');
        
        // Gather enough wood for crafting table + planks for tools and sticks
        // Need: 4 planks (table) + 2 planks (sticks) + 7 planks (3 tools) = 13 planks minimum
        // 13 planks = ~4 logs (each log makes 4 planks)
        const hasWood = await this.systems.inventory.hasItem('log', 4);
        if (!hasWood) {
            await this.systems.gathering.collectWood(10);
        }

        // Craft planks (multiple times to get enough)
        await this.systems.crafting.craftPlanks();
        await this.systems.crafting.craftPlanks();
        await this.systems.crafting.craftPlanks();
        await this.systems.crafting.craftPlanks();
        
        // Craft sticks
        await this.systems.crafting.craftSticks();
        
        // Craft tools (this will ensure crafting table is available)
        await this.systems.crafting.craftBasicTools();
    }

    async mineResources() {
        console.log('Mining resources');
        
        const activity = Math.random();
        
        if (activity < 0.3) {
            // Mine stone
            await this.systems.gathering.mineStone(32);
        } else if (activity < 0.6) {
            // Mine coal
            await this.systems.gathering.collectCoal(16);
        } else {
            // Search for valuable ores
            await this.systems.gathering.searchForValuableOres();
        }
    }

    async expandBase() {
        console.log('Expanding base');
        
        const pos = this.bot.entity.position;
        const expansionType = Math.random();
        
        if (expansionType < 0.5) {
            await this.systems.building.buildFarm(pos.offset(10, 0, 10), 9, 9);
        } else {
            await this.systems.building.buildStorageRoom(pos.offset(15, 0, 0));
        }
    }

    async explore() {
        console.log('Exploring the world');
        
        // Use exploration system if available
        if (this.systems.exploration) {
            await this.systems.exploration.smartExplore(300, 120000);
            this.performanceMetrics.areasExplored++;
        } else {
            // Fallback to basic exploration
            const randomX = (Math.random() - 0.5) * 200;
            const randomZ = (Math.random() - 0.5) * 200;
            const targetPos = this.bot.entity.position.offset(randomX, 0, randomZ);

            try {
                const { goals } = require('mineflayer-pathfinder');
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    targetPos.x,
                    targetPos.y,
                    targetPos.z,
                    10
                ));
                
                // Look for interesting things
                await this.systems.gathering.searchForValuableOres();
            } catch (error) {
                console.log('Exploration completed or interrupted');
            }
        }
    }

    async intelligentExploration() {
        console.log('Intelligent exploration with mapping');
        
        if (this.systems.exploration) {
            const discoveries = await this.systems.exploration.smartExplore(400, 180000);
            this.performanceMetrics.areasExplored += discoveries;
            
            if (discoveries > 0) {
                await this.notifier.send(`Exploration yielded ${discoveries} discoveries!`);
            }
        }
    }

    async gatherResourcesIntelligently() {
        console.log('Intelligent resource gathering');
        
        // Prioritize based on what we need
        const inventory = this.bot.inventory.items();
        const woodCount = inventory.filter(i => i.name.includes('log')).length;
        const stoneCount = inventory.filter(i => i.name.includes('stone')).length;
        
        if (woodCount < 20) {
            await this.systems.gathering.collectWood(32);
            this.performanceMetrics.resourcesGathered += 32;
        } else if (stoneCount < 64) {
            await this.systems.gathering.mineStone(64);
            this.performanceMetrics.resourcesGathered += 64;
        } else {
            // Look for valuable ores
            await this.systems.gathering.searchForValuableOres();
        }
    }

    async gatherSpecificResource(resourceType) {
        console.log(`Gathering specific resource: ${resourceType}`);
        
        switch (resourceType) {
            case 'wood':
                await this.systems.gathering.collectWood(64);
                this.performanceMetrics.resourcesGathered += 64;
                break;
            case 'stone':
                await this.systems.gathering.mineStone(128);
                this.performanceMetrics.resourcesGathered += 128;
                break;
            case 'iron':
                await this.systems.gathering.mineOre('iron', 64);
                break;
            case 'diamond':
                await this.systems.gathering.mineOre('diamond', 64);
                break;
            case 'coal':
                await this.systems.gathering.collectCoal(64);
                break;
            case 'food':
                await this.systems.farming.autoFarm();
                break;
            default:
                await this.gatherResourcesIntelligently();
        }
    }

    async buildIntelligently() {
        console.log('Intelligent building decision');
        
        // Check if we have advanced base system
        if (this.systems.advancedBase && Math.random() < 0.3) {
            const pos = this.bot.entity.position;
            await this.systems.advancedBase.buildAdvancedBase(pos);
            this.performanceMetrics.structuresBuilt++;
        } else {
            await this.expandBase();
        }
    }

    async craftingSession() {
        console.log('Dedicated crafting session');
        
        // Craft multiple items in sequence
        await this.systems.crafting.craftTorches();
        await this.systems.crafting.craftBasicTools();
        await this.sleep(1000);
    }

    async upgradeEquipment() {
        console.log('Upgrading equipment');
        
        // Try to upgrade to better materials
        const hasDiamond = await this.systems.inventory.hasItem('diamond', 3);
        const hasIron = await this.systems.inventory.hasItem('iron_ingot', 3);
        
        if (hasDiamond) {
            await this.systems.crafting.upgradeTools('diamond');
            this.performanceMetrics.toolsUpgraded++;
            await this.notifier.send('Upgraded to diamond tools!');
        } else if (hasIron) {
            await this.systems.crafting.upgradeTools('iron');
            this.performanceMetrics.toolsUpgraded++;
            await this.notifier.send('Upgraded to iron tools!');
        }
    }

    async reportPerformance() {
        const stats = `Performance Report:
Resources: ${this.performanceMetrics.resourcesGathered}
Structures: ${this.performanceMetrics.structuresBuilt}
Mobs Defeated: ${this.performanceMetrics.mobsDefeated}
Areas Explored: ${this.performanceMetrics.areasExplored}
Tools Upgraded: ${this.performanceMetrics.toolsUpgraded}`;
        
        await this.notifier.send(stats);
    }

    adaptBehavior() {
        // Adapt behavior based on performance
        if (this.performanceMetrics.resourcesGathered < 100) {
            this.adaptiveBehavior.miningPreference += 0.1;
        }
        
        if (this.performanceMetrics.structuresBuilt < 5) {
            this.adaptiveBehavior.buildingPreference += 0.05;
        }
        
        console.log('Behavior adapted based on performance');
    }

    async manageInventory() {
        console.log('Managing inventory');
        
        // Toss junk items
        await this.systems.inventory.tossJunk();
        
        // Try to store items in nearby chests
        const chest = this.bot.findBlock({
            matching: block => block.name === 'chest',
            maxDistance: 32
        });

        if (chest) {
            await this.storeItemsInChest(chest);
        }

        // Craft useful items
        await this.systems.crafting.craftTorches();
    }

    async storeItemsInChest(chest) {
        try {
            const { goals } = require('mineflayer-pathfinder');
            await this.bot.pathfinder.goto(new goals.GoalBlock(
                chest.position.x,
                chest.position.y,
                chest.position.z
            ));

            const chestWindow = await this.bot.openContainer(chest);
            
            // Store valuable items
            const valuableItems = this.bot.inventory.items().filter(item =>
                item.name.includes('diamond') ||
                item.name.includes('iron') ||
                item.name.includes('gold') ||
                item.name.includes('emerald')
            );

            for (const item of valuableItems) {
                try {
                    await chestWindow.deposit(item.type, null, item.count);
                    await this.sleep(200);
                } catch (error) {
                    // Chest might be full
                }
            }

            chestWindow.close();
            console.log('Items stored in chest');
        } catch (error) {
            console.error('Error storing items:', error.message);
        }
    }

    stop() {
        console.log('Stopping autonomous behavior');
        this.isActive = false;
        this.notifier.notifyStatus('Bot deactivated');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BehaviorManager;
