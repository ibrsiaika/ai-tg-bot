class InventoryManager {
    constructor(bot, notifier) {
        this.bot = bot;
        this.notifier = notifier;
    }

    async findItem(name) {
        return this.bot.inventory.items().find(item => 
            item.name.includes(name)
        );
    }

    async countItem(name) {
        return this.bot.inventory.items()
            .filter(item => item.name.includes(name))
            .reduce((sum, item) => sum + item.count, 0);
    }

    async hasItem(name, count = 1) {
        return await this.countItem(name) >= count;
    }

    async equipBestTool(toolType) {
        const tools = this.bot.inventory.items().filter(item => 
            item.name.includes(toolType)
        );

        if (tools.length === 0) return null;

        // Prioritize: diamond > iron > stone > wooden
        const priority = ['diamond', 'iron', 'stone', 'wooden', 'golden'];
        
        let bestTool = null;
        for (const material of priority) {
            bestTool = tools.find(tool => tool.name.includes(material));
            if (bestTool) break;
        }

        if (!bestTool) bestTool = tools[0];

        try {
            await this.bot.equip(bestTool, 'hand');
            return bestTool;
        } catch (error) {
            console.error('Error equipping tool:', error.message);
            return null;
        }
    }

    async equipBestWeapon() {
        const weapons = this.bot.inventory.items().filter(item => 
            item.name.includes('sword')
        );

        if (weapons.length === 0) return null;

        const priority = ['diamond', 'iron', 'stone', 'wooden', 'golden'];
        
        let bestWeapon = null;
        for (const material of priority) {
            bestWeapon = weapons.find(w => w.name.includes(material));
            if (bestWeapon) break;
        }

        if (!bestWeapon) bestWeapon = weapons[0];

        try {
            await this.bot.equip(bestWeapon, 'hand');
            return bestWeapon;
        } catch (error) {
            console.error('Error equipping weapon:', error.message);
            return null;
        }
    }

    getInventorySpace() {
        const totalSlots = 36; // Player inventory slots
        const usedSlots = this.bot.inventory.items().length;
        return totalSlots - usedSlots;
    }

    isInventoryFull() {
        return this.getInventorySpace() <= 3; // Keep some buffer
    }

    async findFood() {
        const foodItems = [
            'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
            'bread', 'baked_potato', 'cooked_cod', 'cooked_salmon',
            'beef', 'porkchop', 'chicken', 'mutton', 'cod', 'salmon',
            'apple', 'carrot', 'potato', 'beetroot'
        ];

        for (const foodName of foodItems) {
            const food = await this.findItem(foodName);
            if (food) return food;
        }

        return null;
    }

    async eatFood() {
        const food = await this.findFood();
        if (!food) {
            console.log('No food available');
            return false;
        }

        try {
            await this.bot.equip(food, 'hand');
            await this.bot.consume();
            console.log(`Ate ${food.name}`);
            return true;
        } catch (error) {
            console.error('Error eating food:', error.message);
            return false;
        }
    }

    async tossJunk() {
        const junkItems = [
            'dirt', 'cobblestone', 'gravel', 'andesite', 'diorite', 'granite',
            'rotten_flesh', 'poisonous_potato', 'spider_eye'
        ];

        for (const junkName of junkItems) {
            const items = this.bot.inventory.items().filter(item => 
                item.name.includes(junkName)
            );

            for (const item of items) {
                const count = await this.countItem(junkName);
                if (count > 64) { // Keep one stack max
                    try {
                        await this.bot.toss(item.type, null, item.count - 64);
                        console.log(`Tossed ${item.count - 64} ${item.name}`);
                    } catch (error) {
                        console.error('Error tossing items:', error.message);
                    }
                }
            }
        }
    }

    async checkToolDurability() {
        const tools = this.bot.inventory.items().filter(item => 
            item.name.includes('pickaxe') || 
            item.name.includes('axe') || 
            item.name.includes('shovel') ||
            item.name.includes('sword')
        );

        const brokenTools = [];
        for (const tool of tools) {
            if (tool.durabilityUsed && tool.maxDurability) {
                const durabilityPercent = ((tool.maxDurability - tool.durabilityUsed) / tool.maxDurability) * 100;
                if (durabilityPercent < 10) {
                    brokenTools.push(tool);
                }
            }
        }

        return brokenTools;
    }

    async hasBasicTools() {
        const pickaxe = await this.findItem('pickaxe');
        const axe = await this.findItem('axe');
        const shovel = await this.findItem('shovel');
        
        return {
            hasPickaxe: !!pickaxe,
            hasAxe: !!axe,
            hasShovel: !!shovel
        };
    }
}

module.exports = InventoryManager;
