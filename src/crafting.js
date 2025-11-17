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
        
        // Craft pickaxe if missing
        if (!toolChecks.hasPickaxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_pickaxe');
                await this.notifier.notifyToolUpgrade('stone pickaxe');
            } else if (await this.inventory.hasItem('planks', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_pickaxe');
            }
        }

        // Craft axe if missing
        if (!toolChecks.hasAxe) {
            if (await this.inventory.hasItem('cobblestone', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_axe');
            } else if (await this.inventory.hasItem('planks', 3) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_axe');
            }
        }

        // Craft shovel if missing
        if (!toolChecks.hasShovel) {
            if (await this.inventory.hasItem('cobblestone', 1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('stone_shovel');
            } else if (await this.inventory.hasItem('planks', 1) && await this.inventory.hasItem('stick', 2)) {
                await this.craftItem('wooden_shovel');
            }
        }
    }

    async craftSticks() {
        const hasPlanks = await this.inventory.hasItem('planks', 2);
        if (hasPlanks) {
            await this.craftItem('stick', 4);
            console.log('Crafted sticks');
            return true;
        }
        return false;
    }

    async craftPlanks() {
        const logs = this.bot.inventory.items().find(item => item.name.includes('log'));
        if (logs) {
            await this.craftItem('planks', 4);
            console.log('Crafted planks');
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
        const hasPlanks = await this.inventory.hasItem('planks', 8);
        if (hasPlanks) {
            await this.craftItem('chest');
            console.log('Crafted chest');
            return true;
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
