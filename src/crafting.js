const { goals } = require('mineflayer-pathfinder');

class CraftingSystem {
    constructor(bot, notifier, inventoryManager) {
        this.bot = bot;
        this.notifier = notifier;
        this.inventory = inventoryManager;
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
        
        // Helper to check if we have any type of planks
        const hasAnyPlanks = async (count) => {
            const plankTypes = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 
                               'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
                               'bamboo_planks', 'crimson_planks', 'warped_planks'];
            for (const type of plankTypes) {
                if (await this.inventory.countItem(type) >= count) {
                    return true;
                }
            }
            return false;
        };
        
        // Craft pickaxe if missing
        if (!toolChecks.hasPickaxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_pickaxe');
                await this.notifier.notifyToolUpgrade('stone pickaxe');
            } else if (await hasAnyPlanks(3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_pickaxe');
            }
        }

        // Craft axe if missing
        if (!toolChecks.hasAxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_axe');
            } else if (await hasAnyPlanks(3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_axe');
            }
        }

        // Craft shovel if missing
        if (!toolChecks.hasShovel) {
            if (await this.inventory.hasItem('cobblestone', 1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_shovel');
            } else if (await hasAnyPlanks(1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_shovel');
            }
        }
    }

    async craftSticks() {
        // Check for any type of planks
        const plankTypes = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 
                           'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
                           'bamboo_planks', 'crimson_planks', 'warped_planks'];
        
        for (const plankType of plankTypes) {
            const hasPlanks = await this.inventory.hasItem(plankType, 2);
            if (hasPlanks) {
                await this.craftItem('stick', 4);
                console.log('Crafted sticks');
                return true;
            }
        }
        return false;
    }

    async craftPlanks() {
        // Find any log in inventory
        const logs = this.bot.inventory.items().find(item => item.name.includes('log') || item.name.includes('stem'));
        if (logs) {
            // Determine the corresponding plank type based on log type
            let plankType = 'oak_planks'; // default
            
            if (logs.name.includes('oak')) plankType = 'oak_planks';
            else if (logs.name.includes('spruce')) plankType = 'spruce_planks';
            else if (logs.name.includes('birch')) plankType = 'birch_planks';
            else if (logs.name.includes('jungle')) plankType = 'jungle_planks';
            else if (logs.name.includes('acacia')) plankType = 'acacia_planks';
            else if (logs.name.includes('dark_oak')) plankType = 'dark_oak_planks';
            else if (logs.name.includes('mangrove')) plankType = 'mangrove_planks';
            else if (logs.name.includes('cherry')) plankType = 'cherry_planks';
            else if (logs.name.includes('bamboo')) plankType = 'bamboo_planks';
            else if (logs.name.includes('crimson')) plankType = 'crimson_planks';
            else if (logs.name.includes('warped')) plankType = 'warped_planks';
            
            await this.craftItem(plankType, 4);
            console.log(`Crafted ${plankType} from ${logs.name}`);
            return true;
        }
        return false;
    }

    async upgradeTools(material) {
        console.log(`Upgrading tools to ${material}`);
        
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
        // Check for any type of planks (need 8 total)
        const plankTypes = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 
                           'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
                           'bamboo_planks', 'crimson_planks', 'warped_planks'];
        
        for (const plankType of plankTypes) {
            const hasPlanks = await this.inventory.hasItem(plankType, 8);
            if (hasPlanks) {
                await this.craftItem('chest');
                console.log('Crafted chest');
                return true;
            }
        }
        return false;
    }

    async craftCraftingTable() {
        // Check for any type of planks (need 4 total)
        const plankTypes = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 
                           'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
                           'bamboo_planks', 'crimson_planks', 'warped_planks'];
        
        for (const plankType of plankTypes) {
            const hasPlanks = await this.inventory.hasItem(plankType, 4);
            if (hasPlanks) {
                await this.craftItem('crafting_table');
                console.log('Crafted crafting table');
                return true;
            }
        }
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
        const furnace = this.bot.findBlock({
            matching: block => block.name === 'furnace' || block.name === 'blast_furnace',
            maxDistance: 32
        });

        if (!furnace) {
            console.log('No furnace nearby');
            return false;
        }

        const rawOres = ['raw_iron', 'raw_gold', 'raw_copper'];
        const fuel = await this.inventory.findItem('coal') || await this.inventory.findItem('charcoal');

        if (!fuel) {
            console.log('No fuel for smelting');
            return false;
        }

        for (const ore of rawOres) {
            const hasOre = await this.inventory.hasItem(ore, 1);
            if (hasOre) {
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(furnace.position.x, furnace.position.y, furnace.position.z));
                    // Smelting logic would go here - mineflayer has furnace plugins for this
                    console.log(`Started smelting ${ore}`);
                } catch (error) {
                    console.error('Error smelting:', error.message);
                }
            }
        }
    }
}

module.exports = CraftingSystem;
