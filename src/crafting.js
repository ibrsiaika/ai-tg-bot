const { goals } = require('mineflayer-pathfinder');
const CONSTANTS = require('./constants');

class CraftingSystem {
    constructor(bot, notifier, inventoryManager) {
        this.bot = bot;
        this.notifier = notifier;
        this.inventory = inventoryManager;
    }

    /**
     * Helper to check if we have any type of planks
     * @param {number} count - Minimum count needed
     * @returns {Promise<string|null>} Plank type found or null
     */
    async findAvailablePlanks(count) {
        for (const plankType of CONSTANTS.PLANK_TYPES) {
            const hasPlanks = await this.inventory.hasItem(plankType, count);
            if (hasPlanks) {
                return plankType;
            }
        }
        return null;
    }

    /**
     * Get plank type from log type
     * @param {string} logName - Log item name
     * @returns {string} Corresponding plank type
     */
    getPlankTypeFromLog(logName) {
        const logToPlanks = {
            'oak': 'oak_planks',
            'spruce': 'spruce_planks',
            'birch': 'birch_planks',
            'jungle': 'jungle_planks',
            'acacia': 'acacia_planks',
            'dark_oak': 'dark_oak_planks',
            'mangrove': 'mangrove_planks',
            'cherry': 'cherry_planks',
            'bamboo': 'bamboo_planks',
            'crimson': 'crimson_planks',
            'warped': 'warped_planks'
        };
        
        for (const [key, value] of Object.entries(logToPlanks)) {
            if (logName.includes(key)) {
                return value;
            }
        }
        
        return 'oak_planks'; // default fallback
    }

    async craftItem(itemName, count = 1) {
        const item = this.bot.registry.itemsByName[itemName];
        if (!item) {
            console.log(`Unknown item: ${itemName}`);
            return false;
        }

        const recipes = this.bot.recipesFor(item.id, null, 1, null);
        if (!recipes || recipes.length === 0) {
            console.log(`No recipe for ${itemName}`);
            return false;
        }

        const recipe = recipes[0];
        try {
            await this.bot.craft(recipe, count, null);
            console.log(`Crafted ${count} ${itemName}`);
            return true;
        } catch (error) {
            console.error(`Error crafting ${itemName}:`, error.message);
            return false;
        }
    }

    async craftBasicTools() {
        console.log('Checking and crafting basic tools');
        
        const toolChecks = await this.inventory.hasBasicTools();
        
        // Ensure we have a crafting table nearby for tool crafting
        await this.ensureCraftingTable();
        
        // Craft pickaxe if missing
        if (!toolChecks.hasPickaxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_pickaxe');
                await this.notifier.notifyToolUpgrade('stone pickaxe');
            } else if (await this.findAvailablePlanks(3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_pickaxe');
            }
        }

        // Craft axe if missing
        if (!toolChecks.hasAxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_axe');
            } else if (await this.findAvailablePlanks(3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_axe');
            }
        }

        // Craft shovel if missing
        if (!toolChecks.hasShovel) {
            if (await this.inventory.hasItem('cobblestone', 1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_shovel');
            } else if (await this.findAvailablePlanks(1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_shovel');
            }
        }
    }

    async craftSticks() {
        const plankType = await this.findAvailablePlanks(2);
        if (plankType) {
            await this.craftItem('stick', 4);
            console.log('Crafted sticks');
            return true;
        }
        return false;
    }

    async craftPlanks() {
        // Find any log in inventory
        const logs = this.bot.inventory.items().find(item => 
            item.name.includes('log') || item.name.includes('stem')
        );
        
        if (logs) {
            const plankType = this.getPlankTypeFromLog(logs.name);
            await this.craftItem(plankType, 4);
            console.log(`Crafted ${plankType} from ${logs.name}`);
            return true;
        }
        return false;
    }

    async upgradeTools(material) {
        console.log(`Upgrading tools to ${material}`);
        
        // Netherite tools require smithing table upgrade from diamond
        if (material === 'netherite') {
            return await this.upgradeToNetherite();
        }
        
        const toolTypes = ['pickaxe', 'axe', 'shovel', 'sword'];
        let upgraded = 0;

        for (const tool of toolTypes) {
            const itemName = `${material}_${tool}`;
            const hasResources = await this.checkResourcesForTool(material, tool);
            
            if (hasResources) {
                const success = await this.craftItem(itemName);
                if (success) {
                    upgraded++;
                    await this.notifier.notifyToolUpgrade(`${material} ${tool}`);
                }
            }
        }

        return upgraded > 0;
    }

    async upgradeToNetherite() {
        console.log('Upgrading diamond tools to netherite');
        
        // Check if we have netherite ingots
        const hasNetherite = await this.inventory.hasItem('netherite_ingot', 1);
        if (!hasNetherite) {
            console.log('No netherite ingots available for upgrading');
            return false;
        }
        
        // Find smithing table
        const smithingTable = this.bot.findBlock({
            matching: block => block.name === 'smithing_table',
            maxDistance: 32
        });
        
        if (!smithingTable) {
            console.log('No smithing table nearby. Need to craft and place one.');
            // Try to craft smithing table (needs 4 planks + 2 iron ingots)
            const hasIron = await this.inventory.hasItem('iron_ingot', 2);
            const hasPlanks = await this.findAvailablePlanks(4);
            
            if (hasIron && hasPlanks) {
                await this.craftItem('smithing_table');
                console.log('Crafted smithing table, need to place it');
            }
            return false;
        }
        
        // Netherite upgrade process
        // Note: Smithing table upgrades require the mineflayer-smithing plugin
        // Since this plugin may not be available, we provide a graceful fallback
        // For production use, install: npm install mineflayer-smithing
        
        const toolTypes = ['pickaxe', 'axe', 'shovel', 'sword', 'helmet', 'chestplate', 'leggings', 'boots'];
        let upgraded = 0;
        
        for (const tool of toolTypes) {
            const diamondTool = await this.inventory.findItem(`diamond_${tool}`);
            const netheriteIngot = await this.inventory.findItem('netherite_ingot');
            
            if (diamondTool && netheriteIngot) {
                try {
                    // Check if smithing plugin is available
                    if (this.bot.smithing) {
                        // Use plugin if available
                        await this.bot.smithing.upgrade(diamondTool, netheriteIngot, smithingTable);
                        console.log(`Upgraded diamond ${tool} to netherite`);
                        upgraded++;
                    } else {
                        // Fallback: Manual smithing table interaction
                        // This requires the smithing plugin or manual window handling
                        console.log(`Smithing plugin not available. Cannot upgrade ${tool} automatically.`);
                        console.log(`Install mineflayer-smithing: npm install mineflayer-smithing`);
                        console.log(`Then add to bot: bot.loadPlugin(require('mineflayer-smithing').plugin)`);
                        // Return false to indicate upgrade not possible without plugin
                        return false;
                    }
                } catch (error) {
                    console.error(`Error upgrading ${tool} to netherite:`, error.message);
                }
            }
        }
        
        if (upgraded > 0) {
            await this.notifier.send(`⚒️ Upgraded ${upgraded} tools to netherite!`);
        }
        
        return upgraded > 0;
    }

    async checkResourcesForTool(material, tool) {
        const requirements = {
            pickaxe: { amount: 3, sticks: 2 },
            axe: { amount: 3, sticks: 2 },
            shovel: { amount: 1, sticks: 2 },
            sword: { amount: 2, sticks: 1 }
        };

        const req = requirements[tool];
        if (!req) return false;

        const hasSticks = await this.inventory.hasItem('stick', req.sticks);
        const hasMaterial = await this.inventory.hasItem(material, req.amount);

        return hasSticks && hasMaterial;
    }

    async craftTorches() {
        const hasCoal = await this.inventory.hasItem('coal', 1);
        const hasSticks = await this.inventory.hasItem('stick', 1);

        if (hasCoal && hasSticks) {
            await this.craftItem('torch', 4);
            console.log('Crafted torches');
            return true;
        }
        return false;
    }

    async craftFurnace() {
        const hasCobblestone = await this.inventory.hasItem('cobblestone', 8);
        if (hasCobblestone) {
            await this.craftItem('furnace');
            console.log('Crafted furnace');
            return true;
        }
        return false;
    }

    async craftChest() {
        const plankType = await this.findAvailablePlanks(8);
        if (plankType) {
            await this.craftItem('chest');
            console.log('Crafted chest');
            return true;
        }
        return false;
    }

    async craftCraftingTable() {
        const plankType = await this.findAvailablePlanks(4);
        if (plankType) {
            await this.craftItem('crafting_table');
            console.log('Crafted crafting table');
            return true;
        }
        return false;
    }

    async craftBed() {
        // Need 3 planks and 3 wool
        const hasWool = await this.inventory.hasItem('wool', 3);
        
        if (!hasWool) {
            console.log('Need 3 wool to craft bed');
            return false;
        }
        
        const plankType = await this.findAvailablePlanks(3);
        if (plankType) {
            // Determine bed color based on wool color
            const woolTypes = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 
                              'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 
                              'blue', 'brown', 'green', 'red', 'black'];
            
            let bedType = 'red_bed'; // default
            for (const color of woolTypes) {
                const hasColorWool = await this.inventory.hasItem(`${color}_wool`, 3);
                if (hasColorWool) {
                    bedType = `${color}_bed`;
                    break;
                }
            }
            
            await this.craftItem(bedType);
            console.log(`Crafted ${bedType}`);
            return true;
        }
        
        console.log('Need 3 planks to craft bed');
        return false;
    }

    async ensureCraftingTable() {
        // Check if there's a crafting table nearby
        const craftingTable = this.bot.findBlock({
            matching: block => block.name === 'crafting_table',
            maxDistance: 32
        });

        if (craftingTable) {
            console.log('Crafting table found nearby');
            return true;
        }

        // Check if we have a crafting table in inventory
        const tableItem = await this.inventory.findItem('crafting_table');
        if (tableItem) {
            console.log('Crafting table in inventory, placing it');
            await this.placeCraftingTable();
            return true;
        }

        // Try to craft a crafting table
        console.log('No crafting table found, attempting to craft one');
        const crafted = await this.craftCraftingTable();
        
        if (crafted) {
            await this.placeCraftingTable();
            return true;
        }

        console.log('Unable to create crafting table - need 4 planks');
        return false;
    }

    async placeCraftingTable() {
        const tableItem = await this.inventory.findItem('crafting_table');
        if (!tableItem) {
            console.log('No crafting table to place');
            return false;
        }

        try {
            const Vec3 = require('vec3');
            await this.bot.equip(tableItem, 'hand');
            
            // Find a suitable spot to place the crafting table (on the ground next to bot)
            const referenceBlock = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0));
            
            if (referenceBlock && referenceBlock.name !== 'air') {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                console.log('Placed crafting table');
                return true;
            }
        } catch (error) {
            console.error('Error placing crafting table:', error.message);
        }

        return false;
    }

    async smeltOre() {
        let furnace = this.bot.findBlock({
            matching: block => block.name === 'furnace' || block.name === 'blast_furnace',
            maxDistance: 32
        });

        if (!furnace) {
            console.log('No furnace nearby');
            
            // Check if we have a furnace in inventory to place
            const furnaceItem = await this.inventory.findItem('furnace');
            if (furnaceItem) {
                console.log('Have furnace in inventory, need to place it');
                // Let the building system handle placement (will be done by autonomous system)
                return false;
            }
            
            // Try to craft a furnace
            const hasCobblestone = await this.inventory.hasItem('cobblestone', 8);
            if (hasCobblestone) {
                console.log('Crafting furnace for smelting');
                const crafted = await this.craftFurnace();
                if (crafted) {
                    console.log('Furnace crafted, need to place it in base');
                    // Let the building system handle placement
                    return false;
                }
            } else {
                console.log('Need 8 cobblestone to craft furnace');
            }
            
            return false;
        }

        const rawOres = [
            { raw: 'raw_iron', result: 'iron_ingot', priority: 3 },      // Highest priority
            { raw: 'raw_gold', result: 'gold_ingot', priority: 2 },
            { raw: 'raw_copper', result: 'copper_ingot', priority: 1 }
        ];
        
        const fuel = await this.inventory.findItem('coal') || 
                     await this.inventory.findItem('charcoal') ||
                     await this.inventory.findItem('coal_block');

        if (!fuel) {
            console.log('No fuel for smelting');
            return false;
        }

        // Sort ores by priority (iron first, it's most useful)
        rawOres.sort((a, b) => b.priority - a.priority);
        
        let smelted = false;
        let totalSmelted = 0;
        
        for (const ore of rawOres) {
            const oreItem = await this.inventory.findItem(ore.raw);
            if (oreItem && oreItem.count > 0) {
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(
                        furnace.position.x, 
                        furnace.position.y, 
                        furnace.position.z
                    ));
                    
                    const furnaceWindow = await this.bot.openFurnace(furnace);
                    
                    // Calculate how many we can smelt (max 64 at a time)
                    const smeltCount = Math.min(oreItem.count, 64);
                    const fuelNeeded = Math.ceil(smeltCount / 8); // 1 coal smelts 8 items
                    
                    // Put ore in input slot
                    await furnaceWindow.putInput(oreItem.type, null, smeltCount);
                    
                    // Put appropriate amount of fuel
                    const fuelItem = await this.inventory.findItem('coal') || 
                                    await this.inventory.findItem('charcoal');
                    if (fuelItem) {
                        const fuelToUse = Math.min(fuelItem.count, fuelNeeded);
                        await furnaceWindow.putFuel(fuelItem.type, null, fuelToUse);
                    }
                    
                    console.log(`Batch smelting ${smeltCount}x ${ore.raw} into ${ore.result} (${fuelNeeded} coal needed)`);
                    
                    // Wait for smelting to complete (10 seconds per item, but max 10 seconds for small batches)
                    const smeltTime = Math.min(smeltCount * 10000, 30000); // Max 30 seconds wait
                    await this.sleep(smeltTime);
                    
                    // Take output
                    await furnaceWindow.takeOutput();
                    furnaceWindow.close();
                    
                    smelted = true;
                    totalSmelted += smeltCount;
                    
                    if (smeltCount > 1) {
                        await this.notifier.send(`⚒️ Batch smelted ${smeltCount}x ${ore.raw} into ${ore.result}!`);
                    } else {
                        await this.notifier.send(`Smelted ${ore.raw} into ${ore.result}`);
                    }
                } catch (error) {
                    console.error(`Error smelting ${ore.raw}:`, error.message);
                }
            }
        }
        
        if (totalSmelted > 0) {
            console.log(`Total items smelted this session: ${totalSmelted}`);
        }
        
        return smelted;
    }

    async cookFood() {
        console.log('Checking for raw food to cook');
        
        const furnace = this.bot.findBlock({
            matching: block => block.name === 'furnace' || block.name === 'smoker',
            maxDistance: 32
        });

        if (!furnace) {
            console.log('No furnace/smoker nearby for cooking');
            return false;
        }

        const rawFoods = [
            { raw: 'raw_beef', cooked: 'cooked_beef' },
            { raw: 'raw_porkchop', cooked: 'cooked_porkchop' },
            { raw: 'raw_chicken', cooked: 'cooked_chicken' },
            { raw: 'raw_mutton', cooked: 'cooked_mutton' },
            { raw: 'raw_rabbit', cooked: 'cooked_rabbit' },
            { raw: 'raw_cod', cooked: 'cooked_cod' },
            { raw: 'raw_salmon', cooked: 'cooked_salmon' },
            { raw: 'potato', cooked: 'baked_potato' },
            { raw: 'kelp', cooked: 'dried_kelp' }
        ];

        const fuel = await this.inventory.findItem('coal') || 
                     await this.inventory.findItem('charcoal') ||
                     await this.inventory.findItem('coal_block');

        if (!fuel) {
            console.log('No fuel for cooking');
            return false;
        }

        let cooked = false;
        for (const food of rawFoods) {
            const hasFood = await this.inventory.hasItem(food.raw, 1);
            if (hasFood) {
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(
                        furnace.position.x, 
                        furnace.position.y, 
                        furnace.position.z
                    ));
                    
                    const furnaceWindow = await this.bot.openFurnace(furnace);
                    
                    // Put raw food in input slot
                    const foodItem = await this.inventory.findItem(food.raw);
                    if (foodItem) {
                        await furnaceWindow.putInput(foodItem.type, null, Math.min(foodItem.count, 8));
                    }
                    
                    // Put fuel in fuel slot
                    const fuelItem = await this.inventory.findItem('coal') || 
                                    await this.inventory.findItem('charcoal');
                    if (fuelItem) {
                        await furnaceWindow.putFuel(fuelItem.type, null, 2); // Less fuel for cooking
                    }
                    
                    console.log(`Cooking ${food.raw} into ${food.cooked}`);
                    
                    // Wait for cooking to complete
                    await this.sleep(8000); // 8 seconds
                    
                    // Take output
                    await furnaceWindow.takeOutput();
                    furnaceWindow.close();
                    
                    cooked = true;
                    console.log(`Cooked ${food.raw} into ${food.cooked}`);
                } catch (error) {
                    console.error(`Error cooking ${food.raw}:`, error.message);
                }
            }
        }
        
        return cooked;
    }

    async craftDoor(count = 1) {
        console.log(`Crafting ${count} door(s)...`);
        
        // Check if we have enough planks (6 planks = 3 doors)
        const plankTypes = ['oak_planks', 'birch_planks', 'spruce_planks', 'jungle_planks', 
                           'acacia_planks', 'dark_oak_planks'];
        
        let selectedPlank = null;
        for (const plankType of plankTypes) {
            if (await this.inventory.hasItem(plankType, 2)) {
                selectedPlank = plankType;
                break;
            }
        }

        if (!selectedPlank) {
            // Try to craft planks from logs
            console.log('Not enough planks, attempting to craft from wood');
            const hasWood = await this.craftPlanks();
            if (!hasWood) {
                console.log('Need wood to craft doors');
                return false;
            }
            
            // Re-check for planks
            for (const plankType of plankTypes) {
                if (await this.inventory.hasItem(plankType, 2)) {
                    selectedPlank = plankType;
                    break;
                }
            }
        }

        if (!selectedPlank) {
            console.log('Still not enough planks for door');
            return false;
        }

        // Craft doors (2 planks = 1 door for most types, but recipe varies)
        const doorType = selectedPlank.replace('_planks', '_door');
        
        try {
            for (let i = 0; i < count; i++) {
                await this.craftItem(doorType, 1);
                console.log(`Crafted ${doorType}`);
            }
            await this.notifier.send(`🚪 Crafted ${count} door(s)`);
            return true;
        } catch (error) {
            console.error('Error crafting door:', error.message);
            return false;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ ADVANCED CRAFTING RECIPES (NEW) ============

    /**
     * Craft a beacon for advanced base features
     */
    async craftBeacon() {
        console.log('Crafting beacon...');
        
        // Requires 5 glass, 3 obsidian, 1 nether star
        const hasGlass = await this.inventory.hasItem('glass', 5);
        const hasObsidian = await this.inventory.hasItem('obsidian', 3);
        const hasNetherStar = await this.inventory.hasItem('nether_star', 1);
        
        if (!hasGlass || !hasObsidian || !hasNetherStar) {
            console.log('Missing materials for beacon (5 glass, 3 obsidian, 1 nether star)');
            return false;
        }
        
        const success = await this.craftItem('beacon', 1);
        if (success) {
            await this.notifier.send('🔮 Crafted beacon!');
        }
        return success;
    }

    /**
     * Craft an anvil for tool repair
     */
    async craftAnvil() {
        console.log('Crafting anvil...');
        
        // Requires 3 iron blocks (27 iron ingots) + 4 iron ingots = 31 iron total
        const hasIron = await this.inventory.hasItem('iron_ingot', 31);
        
        if (!hasIron) {
            console.log('Need 31 iron ingots to craft anvil');
            return false;
        }
        
        // First craft iron blocks
        for (let i = 0; i < 3; i++) {
            await this.craftItem('iron_block', 1);
        }
        
        const success = await this.craftItem('anvil', 1);
        if (success) {
            await this.notifier.send('⚒️ Crafted anvil for tool repair!');
        }
        return success;
    }

    /**
     * Craft brewing stand
     */
    async craftBrewingStand() {
        console.log('Crafting brewing stand...');
        
        const hasBlazeRod = await this.inventory.hasItem('blaze_rod', 1);
        const hasCobblestone = await this.inventory.hasItem('cobblestone', 3);
        
        if (!hasBlazeRod || !hasCobblestone) {
            console.log('Need 1 blaze rod and 3 cobblestone for brewing stand');
            return false;
        }
        
        const success = await this.craftItem('brewing_stand', 1);
        if (success) {
            await this.notifier.send('🧪 Crafted brewing stand!');
        }
        return success;
    }

    /**
     * Craft enchantment table
     */
    async craftEnchantmentTable() {
        console.log('Crafting enchantment table...');
        
        const hasBook = await this.inventory.hasItem('book', 1);
        const hasDiamond = await this.inventory.hasItem('diamond', 2);
        const hasObsidian = await this.inventory.hasItem('obsidian', 4);
        
        if (!hasBook || !hasDiamond || !hasObsidian) {
            console.log('Need 1 book, 2 diamonds, 4 obsidian for enchantment table');
            return false;
        }
        
        const success = await this.craftItem('enchanting_table', 1);
        if (success) {
            await this.notifier.send('✨ Crafted enchantment table!');
        }
        return success;
    }

    /**
     * Craft hopper for automated item collection
     */
    async craftHopper() {
        console.log('Crafting hopper...');
        
        const hasIron = await this.inventory.hasItem('iron_ingot', 5);
        const hasChest = await this.inventory.hasItem('chest', 1);
        
        if (!hasIron || !hasChest) {
            console.log('Need 5 iron ingots and 1 chest for hopper');
            return false;
        }
        
        const success = await this.craftItem('hopper', 1);
        if (success) {
            console.log('Crafted hopper');
        }
        return success;
    }

    /**
     * Craft fence for base protection
     */
    async craftFence(count = 16) {
        console.log(`Crafting ${count} fence pieces...`);
        
        const plankType = await this.findAvailablePlanks(4);
        const hasSticks = await this.inventory.hasItem('stick', 2);
        
        if (!plankType || !hasSticks) {
            console.log('Need 4 planks and 2 sticks per fence set');
            return false;
        }
        
        // Each craft makes 3 fences
        const craftCount = Math.ceil(count / 3);
        let crafted = 0;
        
        for (let i = 0; i < craftCount; i++) {
            const fenceType = plankType.replace('_planks', '_fence');
            if (await this.craftItem(fenceType, 1)) {
                crafted += 3;
            }
        }
        
        if (crafted > 0) {
            console.log(`Crafted ${crafted} fence pieces`);
        }
        return crafted >= count;
    }

    /**
     * Craft fence gate
     */
    async craftFenceGate(count = 1) {
        console.log(`Crafting ${count} fence gate(s)...`);
        
        const plankType = await this.findAvailablePlanks(2);
        const hasSticks = await this.inventory.hasItem('stick', 4);
        
        if (!plankType || !hasSticks) {
            console.log('Need 2 planks and 4 sticks for fence gate');
            return false;
        }
        
        const gateType = plankType.replace('_planks', '_fence_gate');
        const success = await this.craftItem(gateType, count);
        
        if (success) {
            console.log(`Crafted ${count} fence gate(s)`);
        }
        return success;
    }

    /**
     * Craft ladder for vertical access
     */
    async craftLadder(count = 3) {
        console.log(`Crafting ${count} ladder sets...`);
        
        const hasSticks = await this.inventory.hasItem('stick', 7 * count);
        
        if (!hasSticks) {
            console.log(`Need ${7 * count} sticks for ${count} ladder sets`);
            return false;
        }
        
        const success = await this.craftItem('ladder', count);
        if (success) {
            console.log(`Crafted ${count * 3} ladders`);
        }
        return success;
    }

    /**
     * Craft scaffolding for building
     */
    async craftScaffolding(count = 6) {
        console.log(`Crafting ${count} scaffolding sets...`);
        
        const hasBamboo = await this.inventory.hasItem('bamboo', 6);
        const hasString = await this.inventory.hasItem('string', 1);
        
        if (!hasBamboo || !hasString) {
            console.log('Need 6 bamboo and 1 string for scaffolding');
            return false;
        }
        
        const success = await this.craftItem('scaffolding', count);
        if (success) {
            console.log(`Crafted ${count * 6} scaffolding blocks`);
        }
        return success;
    }

    /**
     * Craft bookshelf for enchanting setup
     */
    async craftBookshelf(count = 15) {
        console.log(`Crafting ${count} bookshelf/bookshelves...`);
        
        const plankType = await this.findAvailablePlanks(6 * count);
        const hasBooks = await this.inventory.hasItem('book', 3 * count);
        
        if (!plankType || !hasBooks) {
            console.log(`Need ${6 * count} planks and ${3 * count} books`);
            return false;
        }
        
        let crafted = 0;
        for (let i = 0; i < count; i++) {
            if (await this.craftItem('bookshelf', 1)) {
                crafted++;
            }
        }
        
        if (crafted > 0) {
            await this.notifier.send(`📚 Crafted ${crafted} bookshelf/bookshelves for enchanting!`);
        }
        return crafted >= count;
    }

    /**
     * Craft blast furnace for faster ore smelting
     */
    async craftBlastFurnace() {
        console.log('Crafting blast furnace...');
        
        const hasIron = await this.inventory.hasItem('iron_ingot', 5);
        const hasFurnace = await this.inventory.hasItem('furnace', 1);
        const hasSmoothStone = await this.inventory.hasItem('smooth_stone', 3);
        
        if (!hasIron || !hasFurnace) {
            console.log('Need 5 iron ingots and 1 furnace for blast furnace');
            return false;
        }
        
        if (!hasSmoothStone) {
            // Try to craft smooth stone
            const hasStone = await this.inventory.hasItem('stone', 3);
            if (!hasStone) {
                console.log('Also need 3 smooth stone (smelt regular stone)');
                return false;
            }
        }
        
        const success = await this.craftItem('blast_furnace', 1);
        if (success) {
            await this.notifier.send('🔥 Crafted blast furnace for faster smelting!');
        }
        return success;
    }

    /**
     * Craft smoker for faster food cooking
     */
    async craftSmoker() {
        console.log('Crafting smoker...');
        
        const hasFurnace = await this.inventory.hasItem('furnace', 1);
        const hasLogs = this.bot.inventory.items().find(item => 
            item.name.includes('log') || item.name.includes('stem')
        );
        
        if (!hasFurnace || !hasLogs || hasLogs.count < 4) {
            console.log('Need 1 furnace and 4 logs for smoker');
            return false;
        }
        
        const success = await this.craftItem('smoker', 1);
        if (success) {
            await this.notifier.send('🍖 Crafted smoker for faster cooking!');
        }
        return success;
    }

    /**
     * Craft composter for efficient bone meal production
     */
    async craftComposter() {
        console.log('Crafting composter...');
        
        const plankType = await this.findAvailablePlanks(7);
        
        if (!plankType) {
            console.log('Need 7 planks for composter');
            return false;
        }
        
        const success = await this.craftItem('composter', 1);
        if (success) {
            console.log('Crafted composter');
        }
        return success;
    }

    /**
     * Craft lectern for enchanting setup
     */
    async craftLectern() {
        console.log('Crafting lectern...');
        
        const plankType = await this.findAvailablePlanks(4);
        const hasBookshelf = await this.inventory.hasItem('bookshelf', 1);
        
        if (!plankType || !hasBookshelf) {
            console.log('Need 4 planks and 1 bookshelf for lectern');
            return false;
        }
        
        const success = await this.craftItem('lectern', 1);
        if (success) {
            console.log('Crafted lectern');
        }
        return success;
    }

    /**
     * Craft grindstone for removing enchantments
     */
    async craftGrindstone() {
        console.log('Crafting grindstone...');
        
        const hasStick = await this.inventory.hasItem('stick', 2);
        const hasStone = await this.inventory.hasItem('stone', 2);
        const plankType = await this.findAvailablePlanks(2);
        
        if (!hasStick || !hasStone || !plankType) {
            console.log('Need 2 sticks, 2 stone, 2 planks for grindstone');
            return false;
        }
        
        const success = await this.craftItem('grindstone', 1);
        if (success) {
            console.log('Crafted grindstone');
        }
        return success;
    }

    /**
     * Craft cartography table for map making
     */
    async craftCartographyTable() {
        console.log('Crafting cartography table...');
        
        const hasPaper = await this.inventory.hasItem('paper', 2);
        const plankType = await this.findAvailablePlanks(4);
        
        if (!hasPaper || !plankType) {
            console.log('Need 2 paper and 4 planks for cartography table');
            return false;
        }
        
        const success = await this.craftItem('cartography_table', 1);
        if (success) {
            console.log('Crafted cartography table');
        }
        return success;
    }
}

module.exports = CraftingSystem;
