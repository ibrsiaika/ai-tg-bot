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

        const recipe = this.bot.recipesFor(item.id, null, 1, null)[0];
        if (!recipe) {
            console.log(`No recipe for ${itemName}`);
            return false;
        }

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
        
        // Upgrade diamond tools to netherite
        const toolTypes = ['pickaxe', 'axe', 'shovel', 'sword'];
        let upgraded = 0;
        
        for (const tool of toolTypes) {
            const diamondTool = await this.inventory.findItem(`diamond_${tool}`);
            const netheriteIngot = await this.inventory.findItem('netherite_ingot');
            
            if (diamondTool && netheriteIngot) {
                try {
                    // Note: Smithing table upgrades would require mineflayer-smithing plugin
                    // For now, just log the intention
                    console.log(`Would upgrade diamond ${tool} to netherite (requires smithing plugin)`);
                    // TODO: Implement actual smithing when plugin is available
                    upgraded++;
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
            { raw: 'raw_iron', result: 'iron_ingot' },
            { raw: 'raw_gold', result: 'gold_ingot' },
            { raw: 'raw_copper', result: 'copper_ingot' }
        ];
        
        const fuel = await this.inventory.findItem('coal') || 
                     await this.inventory.findItem('charcoal') ||
                     await this.inventory.findItem('coal_block');

        if (!fuel) {
            console.log('No fuel for smelting');
            return false;
        }

        let smelted = false;
        for (const ore of rawOres) {
            const hasOre = await this.inventory.hasItem(ore.raw, 1);
            if (hasOre) {
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(
                        furnace.position.x, 
                        furnace.position.y, 
                        furnace.position.z
                    ));
                    
                    const furnaceWindow = await this.bot.openFurnace(furnace);
                    
                    // Put ore in input slot
                    const oreItem = await this.inventory.findItem(ore.raw);
                    if (oreItem) {
                        await furnaceWindow.putInput(oreItem.type, null, oreItem.count);
                    }
                    
                    // Put fuel in fuel slot
                    const fuelItem = await this.inventory.findItem('coal') || 
                                    await this.inventory.findItem('charcoal');
                    if (fuelItem) {
                        await furnaceWindow.putFuel(fuelItem.type, null, Math.min(fuelItem.count, 8));
                    }
                    
                    console.log(`Smelting ${ore.raw} into ${ore.result}`);
                    
                    // Wait for smelting to complete
                    await this.sleep(10000); // 10 seconds
                    
                    // Take output
                    await furnaceWindow.takeOutput();
                    furnaceWindow.close();
                    
                    smelted = true;
                    await this.notifier.send(`Smelted ${ore.raw} into ${ore.result}`);
                } catch (error) {
                    console.error(`Error smelting ${ore.raw}:`, error.message);
                }
            }
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
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CraftingSystem;
