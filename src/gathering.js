const { goals } = require('mineflayer-pathfinder');

class ResourceGatherer {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
    }

    async collectWood(count = 20) {
        console.log(`Starting wood collection (target: ${count})`);
        
        const woodTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
        
        try {
            // Equip axe
            await this.inventory.equipBestTool('axe');

            let collected = 0;
            while (collected < count) {
                const tree = this.bot.findBlock({
                    matching: block => woodTypes.includes(block.name),
                    maxDistance: 64
                });

                if (!tree) {
                    console.log('No trees nearby, moving to find more');
                    await this.exploreForResource('log');
                    continue;
                }

                await this.bot.pathfinder.goto(new goals.GoalBlock(tree.position.x, tree.position.y, tree.position.z));
                await this.bot.dig(tree);
                collected++;
                
                // Pick up drops
                await this.sleep(500);
            }

            await this.notifier.notifyResourceFound('wood', collected);
            console.log(`Collected ${collected} wood`);
            return true;
        } catch (error) {
            console.error('Error collecting wood:', error.message);
            return false;
        }
    }

    async mineStone(count = 64) {
        console.log(`Starting stone mining (target: ${count})`);
        
        try {
            await this.inventory.equipBestTool('pickaxe');

            let collected = 0;
            while (collected < count) {
                const stone = this.bot.findBlock({
                    matching: block => block.name === 'stone',
                    maxDistance: 32
                });

                if (!stone) {
                    console.log('No stone nearby, exploring');
                    await this.exploreForResource('stone');
                    continue;
                }

                await this.bot.pathfinder.goto(new goals.GoalBlock(stone.position.x, stone.position.y, stone.position.z));
                await this.bot.dig(stone);
                collected++;
                
                await this.sleep(100);
            }

            await this.notifier.notifyResourceFound('stone', collected);
            console.log(`Mined ${collected} stone`);
            return true;
        } catch (error) {
            console.error('Error mining stone:', error.message);
            return false;
        }
    }

    async mineOre(oreType, maxDistance = 64) {
        console.log(`Mining ${oreType}`);
        
        try {
            await this.inventory.equipBestTool('pickaxe');

            const ore = this.bot.findBlock({
                matching: block => block.name === `${oreType}_ore` || block.name === `deepslate_${oreType}_ore`,
                maxDistance: maxDistance
            });

            if (!ore) {
                console.log(`No ${oreType} ore found nearby`);
                return false;
            }

            await this.notifier.notifyMining(oreType, ore.position.y);
            await this.bot.pathfinder.goto(new goals.GoalBlock(ore.position.x, ore.position.y, ore.position.z));
            await this.bot.dig(ore);
            
            console.log(`Mined ${oreType} ore`);
            return true;
        } catch (error) {
            console.error(`Error mining ${oreType}:`, error.message);
            return false;
        }
    }

    async searchForValuableOres() {
        const valuableOres = ['diamond', 'iron', 'gold', 'coal', 'lapis', 'redstone', 'emerald'];
        
        for (const ore of valuableOres) {
            const found = this.bot.findBlock({
                matching: block => block.name.includes(ore) && block.name.includes('ore'),
                maxDistance: 32
            });

            if (found) {
                await this.mineOre(ore);
            }
        }
    }

    async exploreForResource(resourceType) {
        console.log(`Exploring for ${resourceType}`);
        
        // Move in a random direction
        const randomX = (Math.random() - 0.5) * 100;
        const randomZ = (Math.random() - 0.5) * 100;
        const targetPos = this.bot.entity.position.offset(randomX, 0, randomZ);

        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 5));
        } catch (error) {
            console.log('Exploration movement completed or interrupted');
        }
    }

    async collectCoal(count = 32) {
        console.log(`Collecting coal (target: ${count})`);
        let collected = 0;

        try {
            await this.inventory.equipBestTool('pickaxe');

            while (collected < count) {
                const coal = this.bot.findBlock({
                    matching: block => block.name === 'coal_ore' || block.name === 'deepslate_coal_ore',
                    maxDistance: 32
                });

                if (!coal) {
                    console.log('No coal nearby, exploring');
                    await this.exploreForResource('coal');
                    continue;
                }

                await this.bot.pathfinder.goto(new goals.GoalBlock(coal.position.x, coal.position.y, coal.position.z));
                await this.bot.dig(coal);
                collected++;
                
                await this.sleep(100);
            }

            await this.notifier.notifyResourceFound('coal', collected);
            return true;
        } catch (error) {
            console.error('Error collecting coal:', error.message);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ResourceGatherer;
