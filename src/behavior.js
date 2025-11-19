const CONSTANTS = require('./constants');

class BehaviorManager {
    constructor(bot, systems, notifier, safetyMonitor) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        this.safety = safetyMonitor;
        this.intelligence = systems.intelligence; // Link to intelligence system
        this.geminiAI = systems.geminiAI; // Link to Gemini AI (NEW)
        this.aiOrchestrator = null; // Will be set after initialization (NEW)
        
        // Configuration constants
        this.INTELLIGENCE_REPORT_INTERVAL = 50; // Generate report every N decisions
        this.MAX_CONSECUTIVE_FAILURES = 2; // Maximum attempts before skipping goal
        this.AI_DECISION_INTERVAL = 10; // Use AI every N decisions
        this.ORCHESTRATOR_DECISION_INTERVAL = 5; // Use orchestrator more frequently
        
        this.currentGoal = null;
        this.isActive = false;
        this.goalQueue = [];
        this.priorities = {
            CRITICAL: 100,
            HIGH: 75,
            MEDIUM: 50,
            LOW: 25
        };
        
        // Track consecutive failures per goal
        this.goalFailures = new Map(); // goal_name -> consecutive_failure_count
        
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
        
        // Base return tracking
        this.lastBaseReturn = Date.now();
        this.BASE_RETURN_INTERVAL = 10 * 60 * 1000; // Return to base every 10 minutes
    }

    async start() {
        console.log('Behavior manager started - operating autonomously');
        this.isActive = true;
        
        // Link to AI Orchestrator after all systems initialized
        if (this.systems.aiOrchestrator) {
            this.aiOrchestrator = this.systems.aiOrchestrator;
            console.log('✓ Behavior linked to AI Orchestrator');
        }
        
        await this.notifier.notifyStatus('Bot activated - autonomous mode');
        
        // Start periodic activity summary reporting
        this.startActivityReporting();
        
        // Start autonomous decision loop
        this.autonomousLoop();
    }
    
    /**
     * Starts periodic activity summary reporting
     * Reports bot activity every 15 minutes
     */
    startActivityReporting() {
        const REPORT_INTERVAL = 15 * 60 * 1000; // 15 minutes
        
        setInterval(async () => {
            await this.reportActivitySummary();
        }, REPORT_INTERVAL);
        
        // Also start periodic tool durability checks (every 5 minutes)
        const TOOL_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
        setInterval(() => {
            if (this.systems.toolDurability) {
                this.systems.toolDurability.displayToolReport();
            }
        }, TOOL_CHECK_INTERVAL);
    }
    
    /**
     * Reports a summary of recent bot activities
     */
    async reportActivitySummary() {
        const inventory = this.bot.inventory.items();
        const pos = this.bot.entity.position;
        
        // Count key resources
        const resources = {
            wood: inventory.filter(i => i.name.includes('log')).reduce((sum, item) => sum + item.count, 0),
            stone: inventory.filter(i => i.name.includes('stone') || i.name.includes('cobblestone')).reduce((sum, item) => sum + item.count, 0),
            coal: inventory.filter(i => i.name === 'coal').reduce((sum, item) => sum + item.count, 0),
            iron: inventory.filter(i => i.name === 'iron_ingot' || i.name === 'raw_iron').reduce((sum, item) => sum + item.count, 0),
            diamond: inventory.filter(i => i.name === 'diamond').reduce((sum, item) => sum + item.count, 0),
            food: inventory.filter(i => i.name.includes('beef') || i.name.includes('porkchop') || i.name.includes('bread') || i.name.includes('carrot')).reduce((sum, item) => sum + item.count, 0)
        };
        
        const summary = `📊 Activity Summary:
🎯 Position: Y=${Math.floor(pos.y)}
💚 Health: ${this.bot.health}/20 | Food: ${this.bot.food}/20
📦 Resources: Wood:${resources.wood} Stone:${resources.stone} Coal:${resources.coal} Iron:${resources.iron} Diamond:${resources.diamond}
🍖 Food: ${resources.food} items`;
        
        console.log('\n' + summary);
        
        // Only send to telegram if configured and we have meaningful activity
        if (resources.diamond > 0 || resources.iron > 10 || this.bot.health < 15) {
            await this.notifier.send(summary);
        }
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
                // Suppress PartialReadError - non-fatal protocol errors
                if (error.name === 'PartialReadError' || 
                    error.message?.includes('PartialReadError') ||
                    error.message?.includes('Read error')) {
                    await this.sleep(5000); // Continue normally on protocol errors
                } else {
                    console.error('Error in autonomous loop:', error.message);
                    await this.sleep(10000); // Wait longer on error
                }
            }
        }
    }

    async chooseNextGoal() {
        console.log('Choosing next autonomous goal (Enhanced AI with Intelligence System + Gemini AI)');
        
        // Increment decision counter
        this.decisionCount++;
        
        // Use AI Orchestrator for strategic decisions if available
        if (this.aiOrchestrator && this.decisionCount % this.ORCHESTRATOR_DECISION_INTERVAL === 0) {
            const decision = await this.getOrchestratorDecision();
            if (decision) {
                console.log(`🎯 Orchestrator: ${decision.action} (${decision.source})`);
            }
        }
        // Fallback: Get AI suggestion periodically if Gemini is enabled
        else if (this.geminiAI && this.geminiAI.isReady() && this.decisionCount % this.AI_DECISION_INTERVAL === 0) {
            await this.getAIDecisionSuggestion();
        }
        
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
        
        // Proactive food management - eat before getting too hungry
        // This prevents starvation during long activities like mining
        const foodLevel = this.bot.food;
        if (foodLevel < 16 && foodLevel >= 10) { // Between 50-80% hunger
            const hasFood = await this.systems.inventory.findFood();
            if (hasFood && Math.random() < 0.4) { // 40% chance to eat proactively
                goals.push({
                    name: 'proactive_eating',
                    type: 'survival',
                    priority: this.priorities.HIGH,
                    expectedReward: 7,
                    action: async () => {
                        console.log(`Proactive eating - food level at ${foodLevel}/20`);
                        return await this.findAndEatFood();
                    }
                });
            }
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

        // Mine discovered ores (higher priority than random mining)
        if (this.systems.exploration && this.systems.exploration.knownOreLocations && 
            this.systems.exploration.knownOreLocations.size > 0) {
            goals.push({
                name: 'mine_discovered_ores',
                type: 'mining',
                priority: this.priorities.HIGH,
                expectedReward: 9,
                action: async () => await this.systems.gathering.mineDiscoveredOres()
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

        // Fishing for food - especially useful when low on food
        if (this.systems.fishing && Math.random() < 0.15) {
            const foodCount = this.bot.inventory.items()
                .filter(i => i.name.includes('fish') || i.name.includes('salmon') || i.name.includes('cod'))
                .reduce((sum, i) => sum + i.count, 0);
            
            if (foodCount < 16) {
                goals.push({
                    name: 'auto_fish',
                    type: 'fishing',
                    priority: this.priorities.MEDIUM,
                    expectedReward: 6,
                    action: async () => await this.systems.fishing.autoFish(180000, 16)
                });
            }
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

        // Smelting check - smelt raw ores when available (prioritized for iron)
        const hasRawIron = await this.systems.inventory.hasItem('raw_iron', 1);
        const hasRawOres = hasRawIron ||
                          await this.systems.inventory.hasItem('raw_gold', 1) ||
                          await this.systems.inventory.hasItem('raw_copper', 1);
        
        // Higher priority for raw iron (needed for tools and shields), check more frequently
        if (hasRawOres) {
            const chance = hasRawIron ? 0.6 : 0.3; // 60% chance for iron, 30% for others
            const priority = hasRawIron ? this.priorities.HIGH : this.priorities.MEDIUM;
            
            if (Math.random() < chance) {
                goals.push({
                    name: 'smelt_ores',
                    type: 'crafting',
                    priority: priority,
                    expectedReward: hasRawIron ? 10 : 7,
                    action: async () => await this.systems.crafting.smeltOre()
                });
            }
        }

        // Food cooking check - cook raw food when available
        const hasRawFood = await this.systems.inventory.hasItem('raw_beef', 1) ||
                          await this.systems.inventory.hasItem('raw_porkchop', 1) ||
                          await this.systems.inventory.hasItem('raw_chicken', 1) ||
                          await this.systems.inventory.hasItem('raw_mutton', 1);
        
        if (hasRawFood && Math.random() < 0.2) {
            goals.push({
                name: 'cook_food',
                type: 'crafting',
                priority: this.priorities.MEDIUM,
                expectedReward: 5,
                action: async () => await this.systems.crafting.cookFood()
            });
        }

        // Death recovery - high priority if we died recently
        if (this.systems.exploration.lastDeathPosition && Math.random() < 0.5) {
            goals.push({
                name: 'recover_death_items',
                type: 'recovery',
                priority: this.priorities.HIGH,
                expectedReward: 9,
                action: async () => await this.systems.exploration.recoverDeathItems()
            });
        }

        // Bed crafting check - craft bed if we don't have one
        const hasBed = await this.systems.inventory.findItem('bed');
        const hasWool = await this.systems.inventory.hasItem('wool', 3);
        
        if (!hasBed && hasWool && Math.random() < 0.2) {
            goals.push({
                name: 'craft_bed',
                type: 'crafting',
                priority: this.priorities.MEDIUM,
                expectedReward: 6,
                action: async () => await this.craftBed()
            });
        } else if (hasBed && Math.random() < 0.1) {
            // Place bed in base if we have one
            goals.push({
                name: 'place_bed',
                type: 'building',
                priority: this.priorities.LOW,
                expectedReward: 5,
                action: async () => await this.systems.building.placeBed(this.bot.entity.position)
            });
        }

        // Raid loot collection - check for nearby items after combat
        const nearbyItems = Object.values(this.bot.entities).filter(entity => 
            entity.type === 'object' && 
            entity.objectType === 'Item'
        );
        
        if (nearbyItems.length > 5 && Math.random() < 0.4) {
            goals.push({
                name: 'collect_raid_loot',
                type: 'combat',
                priority: this.priorities.MEDIUM,
                expectedReward: 7,
                action: async () => await this.systems.combat.collectRaidLoot()
            });
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

        // MEDIUM: Return to base periodically (every 10 minutes)
        const timeSinceLastReturn = Date.now() - this.lastBaseReturn;
        if (timeSinceLastReturn > this.BASE_RETURN_INTERVAL) {
            goals.push({
                name: 'return_to_base',
                type: 'navigation',
                priority: this.priorities.MEDIUM,
                expectedReward: 6,
                action: async () => {
                    const success = await this.systems.exploration.goToHomeBase();
                    if (success) {
                        this.lastBaseReturn = Date.now();
                        await this.notifier.send('🏠 Returned to base for restocking and maintenance');
                        // Store items if inventory is getting full
                        if (this.systems.inventory.getInventoryUsage() > 0.7) {
                            await this.storeItems();
                        }
                    }
                    return success;
                }
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

        // Filter out goals that have failed too many times consecutively
        const availableGoals = goals.filter(goal => {
            const failures = this.goalFailures.get(goal.name) || 0;
            if (failures >= this.MAX_CONSECUTIVE_FAILURES) {
                console.log(`Skipping ${goal.name} - already failed ${failures} times consecutively`);
                return false;
            }
            return true;
        });
        
        // If all goals are blocked, reset failure counts and try again
        if (availableGoals.length === 0 && goals.length > 0) {
            console.log('All goals have failed repeatedly. Resetting failure counts...');
            this.goalFailures.clear();
            return this.chooseNextGoal(); // Recursive call with reset counts
        }
        
        // Use intelligence system to optimize decision if available
        let selectedGoal;
        if (this.intelligence && availableGoals.length > 1) {
            selectedGoal = this.intelligence.optimizeDecision(availableGoals);
            console.log(`Intelligence system selected: ${selectedGoal.name} (score: ${selectedGoal.score.toFixed(2)})`);
        } else {
            // Sort by priority and return highest
            availableGoals.sort((a, b) => b.priority - a.priority);
            selectedGoal = availableGoals[0];
        }

        this.decisionCount++;
        
        // Periodic intelligence report
        if (this.intelligence && this.decisionCount % this.INTELLIGENCE_REPORT_INTERVAL === 0) {
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
        let actionResult = false;
        
        try {
            console.log(`Starting: ${goal.name}`);
            actionResult = await goal.action();
            console.log(`Completed: ${goal.name}`);
            
            // Consider it successful if action returns true or undefined (no explicit failure)
            success = (actionResult !== false);
        } catch (error) {
            // Suppress PartialReadError - non-fatal protocol errors
            if (error.name === 'PartialReadError' || 
                error.message?.includes('PartialReadError') ||
                error.message?.includes('Read error')) {
                // Consider it a success, just with protocol noise
                success = true;
            } else {
                console.error(`Error executing ${goal.name}:`, error.message);
            }
        }
        
        // Track consecutive failures
        if (success) {
            // Reset failure count on success
            this.goalFailures.delete(goal.name);
        } else {
            // Increment failure count
            const currentFailures = this.goalFailures.get(goal.name) || 0;
            this.goalFailures.set(goal.name, currentFailures + 1);
            console.log(`Goal ${goal.name} failed. Consecutive failures: ${currentFailures + 1}`);
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

        if (this.safety.isLowHealth()) {
            // Use enhanced healing system
            await this.safety.healBot(this.systems.inventory);
            
            // If still critical, retreat
            if (this.safety.isCriticalHealth() && this.systems.combat.canRetreat()) {
                await this.systems.combat.retreat();
            }
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
            // Use protected eating if available
            if (this.systems.itemProtection && this.systems.itemProtection.canSafelyEat()) {
                await this.systems.itemProtection.safelyEatFood();
            } else if (this.systems.itemProtection) {
                console.log('⚠️ Not safe to eat right now (threats nearby)');
                // Wait a bit and retry
                await this.sleep(2000);
                if (this.systems.itemProtection.canSafelyEat()) {
                    await this.systems.itemProtection.safelyEatFood();
                }
            } else {
                // Fallback to normal eating if protection system not available
                await this.systems.inventory.eatFood();
            }
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
        
        // Ensure we have torches before mining
        await this.ensureTorches();
        
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
    
    /**
     * Ensures the bot has torches before going mining
     * Crafts torches if needed and possible
     */
    async ensureTorches() {
        const torchCount = this.bot.inventory.items().filter(i => i.name === 'torch').reduce((sum, item) => sum + item.count, 0);
        
        // If we have less than 8 torches, try to craft more
        if (torchCount < 8) {
            console.log(`Low on torches (${torchCount}), attempting to craft more`);
            
            // Check if we have materials: coal/charcoal + sticks
            const hasCoal = await this.systems.inventory.hasItem('coal', 1) || await this.systems.inventory.hasItem('charcoal', 1);
            const hasSticks = await this.systems.inventory.hasItem('stick', 1);
            
            if (hasCoal && hasSticks) {
                // Craft torches
                await this.systems.crafting.craftTorches();
                const newTorchCount = this.bot.inventory.items().filter(i => i.name === 'torch').reduce((sum, item) => sum + item.count, 0);
                console.log(`Crafted torches. Now have: ${newTorchCount}`);
            } else if (!hasCoal && torchCount > 0) {
                console.log(`No coal/charcoal available, but have ${torchCount} torches. Will proceed with caution.`);
            } else if (torchCount === 0) {
                console.log('⚠️ No torches and cannot craft! Mining will be dark.');
            }
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
        
        let result;
        switch (resourceType) {
            case 'wood':
                result = await this.systems.gathering.collectWood(64);
                if (result) this.performanceMetrics.resourcesGathered += 64;
                return result;
            case 'stone':
                result = await this.systems.gathering.mineStone(128);
                if (result) this.performanceMetrics.resourcesGathered += 128;
                return result;
            case 'iron':
                return await this.systems.gathering.mineOre('iron', 64);
            case 'diamond':
                return await this.systems.gathering.mineOre('diamond', 64);
            case 'coal':
                return await this.systems.gathering.collectCoal(64);
            case 'food':
                return await this.systems.farming.autoFarm();
            default:
                await this.gatherResourcesIntelligently();
                return true; // Default case assumed successful
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
        
        // Try to craft chest if we have materials
        await this.systems.crafting.craftChest();
        
        await this.sleep(1000);
    }

    async craftBed() {
        console.log('Attempting to craft bed');
        
        const success = await this.systems.crafting.craftBed();
        if (success) {
            await this.notifier.send('Crafted a bed for sleeping');
        }
        return success;
    }

    async upgradeEquipment() {
        console.log('Upgrading equipment');
        
        // Try to upgrade to better materials - prioritize netherite, then diamond, then iron
        const hasNetherite = await this.systems.inventory.hasItem('netherite_ingot', 1);
        const hasDiamond = await this.systems.inventory.hasItem('diamond', 3);
        const hasIron = await this.systems.inventory.hasItem('iron_ingot', 3);
        
        if (hasNetherite) {
            // Check if we have diamond tools to upgrade
            const hasDiamondTool = await this.systems.inventory.hasItem('diamond_pickaxe', 1) ||
                                  await this.systems.inventory.hasItem('diamond_axe', 1) ||
                                  await this.systems.inventory.hasItem('diamond_shovel', 1) ||
                                  await this.systems.inventory.hasItem('diamond_sword', 1);
            
            if (hasDiamondTool) {
                await this.systems.crafting.upgradeTools('netherite');
                this.performanceMetrics.toolsUpgraded++;
                await this.notifier.send('⚒️ Upgrading to netherite tools!');
            } else {
                console.log('Have netherite but need diamond tools first');
            }
        } else if (hasDiamond) {
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
            
            // Store valuable items first - prioritize diamond, gold, iron, emerald
            const valuableItems = this.bot.inventory.items().filter(item =>
                item.name.includes('diamond') ||
                item.name.includes('emerald') ||
                item.name.includes('gold') ||
                item.name.includes('iron') ||
                item.name.includes('netherite') ||
                item.name.includes('lapis') ||
                item.name.includes('redstone') ||
                item.name.includes('enchanted')
            );

            for (const item of valuableItems) {
                try {
                    // Keep at least 1 of each valuable item in inventory
                    const depositCount = item.count > 1 ? item.count - 1 : 0;
                    if (depositCount > 0) {
                        await chestWindow.deposit(item.type, null, depositCount);
                        await this.sleep(200);
                    }
                } catch (error) {
                    // Chest might be full
                }
            }
            
            // Then store excess building materials
            const buildingMaterials = this.bot.inventory.items().filter(item =>
                item.name.includes('planks') ||
                item.name.includes('log') ||
                item.name.includes('cobblestone') ||
                item.name.includes('stone')
            );
            
            for (const item of buildingMaterials) {
                try {
                    // Keep 64 of each building material max
                    const depositCount = item.count > 64 ? item.count - 64 : 0;
                    if (depositCount > 0) {
                        await chestWindow.deposit(item.type, null, depositCount);
                        await this.sleep(200);
                    }
                } catch (error) {
                    // Chest might be full
                }
            }

            chestWindow.close();
            console.log('Items stored in chest (prioritizing valuables)');
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

    /**
     * Get decision from AI Orchestrator (hybrid intelligence)
     */
    async getOrchestratorDecision() {
        if (!this.aiOrchestrator) return null;
        
        try {
            const context = {
                type: 'strategic',
                complexity: 0.7,
                urgency: this.safety.isCriticalHealth() ? 0.9 : 0.3,
                stateSnapshot: {
                    health: this.bot.health,
                    food: this.bot.food,
                    timeOfDay: this.bot.time.timeOfDay,
                    position: this.bot.entity.position,
                    threats: this.getNearbyThreats(),
                    inventoryFull: this.systems.inventory.isInventoryFull(),
                    tools: await this.getToolStatus()
                }
            };
            
            const decision = await this.aiOrchestrator.routeDecision(context);
            
            // Log to Telegram occasionally
            if (this.decisionCount % 25 === 0 && decision.source !== 'cache') {
                await this.notifier.send(
                    `🎯 ${decision.source.toUpperCase()}: ${decision.action}\n` +
                    `${decision.reasoning || 'Optimized decision'}`
                );
            }
            
            return decision;
        } catch (error) {
            console.error('Orchestrator decision failed:', error.message);
            return null;
        }
    }

    /**
     * Get AI decision suggestion from Gemini AI
     */
    async getAIDecisionSuggestion() {
        try {
            const gameState = {
                health: this.bot.health,
                food: this.bot.food,
                timeOfDay: this.bot.time.timeOfDay,
                position: this.bot.entity.position,
                threats: this.getNearbyThreats(),
                inventoryFull: this.systems.inventory.isInventoryFull(),
                tools: await this.getToolStatus()
            };

            const aiDecision = await this.geminiAI.getDecision(gameState);
            
            if (aiDecision && aiDecision.action) {
                console.log(`🤖 Gemini AI suggests: ${aiDecision.action} (${aiDecision.priority}) - ${aiDecision.reasoning}`);
                
                // Log to Telegram occasionally
                if (this.decisionCount % 20 === 0) {
                    await this.notifier.send(`🤖 AI: ${aiDecision.action} - ${aiDecision.reasoning}`);
                }
            }
        } catch (error) {
            console.error('Error getting AI suggestion:', error.message);
        }
    }

    /**
     * Get nearby threats for AI context
     */
    getNearbyThreats() {
        const hostileMobs = Object.values(this.bot.entities).filter(entity => {
            if (!entity || !entity.position) return false;
            const distance = this.bot.entity.position.distanceTo(entity.position);
            const mobName = entity.name?.toLowerCase();
            return entity.type === 'mob' && mobName && CONSTANTS.HOSTILE_MOBS.includes(mobName) && distance < 16;
        });
        return hostileMobs.length;
    }

    /**
     * Get tool status for AI context
     */
    async getToolStatus() {
        const tools = await this.systems.inventory.hasBasicTools();
        return {
            hasPickaxe: tools.hasPickaxe,
            hasAxe: tools.hasAxe,
            hasShovel: tools.hasShovel,
            hasSword: tools.hasSword
        };
    }
}

module.exports = BehaviorManager;
