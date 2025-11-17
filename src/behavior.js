class BehaviorManager {
    constructor(bot, systems, notifier, safetyMonitor) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        this.safety = safetyMonitor;
        
        this.currentGoal = null;
        this.isActive = false;
        this.goalQueue = [];
        this.priorities = {
            CRITICAL: 100,
            HIGH: 75,
            MEDIUM: 50,
            LOW: 25
        };
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
                    continue;
                }

                // Check for environmental dangers
                const danger = this.safety.isInDanger();
                if (danger) {
                    await this.systems.combat.retreat();
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
        console.log('Choosing next autonomous goal');
        
        const goals = [];

        // Survival goals
        if (this.safety.needsFood()) {
            goals.push({
                name: 'find_food',
                priority: this.priorities.CRITICAL,
                action: async () => await this.findAndEatFood()
            });
        }

        if (this.safety.isLowHealth()) {
            goals.push({
                name: 'heal',
                priority: this.priorities.CRITICAL,
                action: async () => await this.systems.combat.heal()
            });
        }

        // Resource gathering goals
        const hasBasicTools = await this.systems.inventory.hasBasicTools();
        
        if (!hasBasicTools.hasPickaxe || !hasBasicTools.hasAxe) {
            goals.push({
                name: 'craft_basic_tools',
                priority: this.priorities.HIGH,
                action: async () => await this.craftBasicTools()
            });
        }

        // Mining goals
        if (Math.random() < 0.3) {
            goals.push({
                name: 'mine_resources',
                priority: this.priorities.MEDIUM,
                action: async () => await this.mineResources()
            });
        }

        // Farming goals
        if (Math.random() < 0.2) {
            goals.push({
                name: 'auto_farm',
                priority: this.priorities.MEDIUM,
                action: async () => await this.systems.farming.autoFarm()
            });
        }

        // Resource collection goals
        if (Math.random() < 0.4) {
            goals.push({
                name: 'collect_wood',
                priority: this.priorities.MEDIUM,
                action: async () => await this.systems.gathering.collectWood(20)
            });
        }

        // Building goals
        if (Math.random() < 0.15) {
            goals.push({
                name: 'expand_base',
                priority: this.priorities.LOW,
                action: async () => await this.expandBase()
            });
        }

        // Exploration goals
        if (Math.random() < 0.25) {
            goals.push({
                name: 'explore',
                priority: this.priorities.LOW,
                action: async () => await this.explore()
            });
        }

        // Inventory management
        if (this.systems.inventory.isInventoryFull()) {
            goals.push({
                name: 'manage_inventory',
                priority: this.priorities.HIGH,
                action: async () => await this.manageInventory()
            });
        }

        // Sort by priority
        goals.sort((a, b) => b.priority - a.priority);

        return goals[0] || {
            name: 'idle_explore',
            priority: this.priorities.LOW,
            action: async () => await this.explore()
        };
    }

    async executeGoal(goal) {
        try {
            console.log(`Starting: ${goal.name}`);
            await goal.action();
            console.log(`Completed: ${goal.name}`);
        } catch (error) {
            console.error(`Error executing ${goal.name}:`, error.message);
        }
    }

    async handleSafetyIssue() {
        console.log('Handling safety issue');
        
        if (this.safety.needsFood()) {
            await this.systems.inventory.eatFood();
        }

        if (this.safety.isLowHealth()) {
            await this.systems.combat.retreat();
            await this.systems.combat.heal();
        }

        const threats = await this.safety.checkNearbyDangers();
        if (threats.length > 0) {
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
        
        // Gather wood if needed
        const hasWood = await this.systems.inventory.hasItem('log', 4);
        if (!hasWood) {
            await this.systems.gathering.collectWood(10);
        }

        // Craft planks
        await this.systems.crafting.craftPlanks();
        
        // Craft sticks
        await this.systems.crafting.craftSticks();
        
        // Craft tools
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
        
        // Move in random direction
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
