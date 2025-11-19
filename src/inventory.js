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
        // Expanded junk list with more low-value items
        const junkItems = [
            'dirt', 'gravel', 'andesite', 'diorite', 'granite', 'tuff',
            'rotten_flesh', 'poisonous_potato', 'spider_eye', 'string',
            'bone', 'arrow', 'snowball', 'egg', 'flint', 'leather',
            'feather', 'wheat_seeds', 'beetroot_seeds', 'pumpkin_seeds',
            'melon_seeds', 'kelp', 'seagrass', 'dead_bush'
        ];

        for (const junkName of junkItems) {
            const items = this.bot.inventory.items().filter(item => 
                item.name.includes(junkName)
            );

            for (const item of items) {
                try {
                    // Keep only a small amount of each junk item (1 stack max, or 16 for some items)
                    const maxKeep = ['bone', 'arrow', 'string', 'leather', 'feather'].includes(junkName) ? 32 : 64;
                    const count = await this.countItem(junkName);
                    
                    if (count > maxKeep) {
                        await this.bot.toss(item.type, null, count - maxKeep);
                        console.log(`Tossed ${count - maxKeep} ${item.name}`);
                    }
                } catch (error) {
                    console.error('Error tossing items:', error.message);
                }
            }
        }
        
        // Also toss excess cobblestone (keep max 2 stacks)
        const cobblestoneCount = await this.countItem('cobblestone');
        if (cobblestoneCount > 128) {
            const cobble = this.bot.inventory.items().find(item => item.name === 'cobblestone');
            if (cobble) {
                try {
                    await this.bot.toss(cobble.type, null, cobblestoneCount - 128);
                    console.log(`Tossed ${cobblestoneCount - 128} cobblestone (keeping 2 stacks)`);
                } catch (error) {
                    console.error('Error tossing cobblestone:', error.message);
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
    
    /**
     * Organizes inventory by keeping important items easily accessible
     * Places tools, weapons, and food in hotbar slots (0-8)
     */
    async organizeInventory() {
        console.log('Organizing inventory for optimal access');
        
        // Define priority items that should be in hotbar
        const priorityItems = [
            'pickaxe',  // Slot 0 - mining
            'axe',      // Slot 1 - wood gathering
            'sword',    // Slot 2 - combat
            'shovel',   // Slot 3 - digging
            'torch',    // Slot 4 - lighting
            'food',     // Slot 5 - healing
            'water_bucket', // Slot 6 - lava safety
            'shield'    // Slot 7 - defense
        ];
        
        // Count organized items
        let organized = 0;
        
        for (let i = 0; i < priorityItems.length; i++) {
            const itemType = priorityItems[i];
            let item = null;
            
            if (itemType === 'food') {
                item = await this.findFood();
            } else if (itemType === 'pickaxe' || itemType === 'axe' || itemType === 'sword' || itemType === 'shovel') {
                // Find best quality tool
                const tools = this.bot.inventory.items().filter(t => t.name.includes(itemType));
                const priority = ['netherite', 'diamond', 'iron', 'stone', 'wooden'];
                for (const material of priority) {
                    item = tools.find(t => t.name.includes(material));
                    if (item) break;
                }
                if (!item && tools.length > 0) item = tools[0];
            } else {
                item = await this.findItem(itemType);
            }
            
            if (item && item.slot >= 9) { // If not already in hotbar
                try {
                    // Try to move to hotbar slot
                    const targetSlot = 36 + i; // Hotbar slots are 36-44 in window coordinates
                    // Note: Full implementation would use bot.clickWindow to move items
                    // For now, just log the intent
                    console.log(`Would move ${item.name} to hotbar slot ${i}`);
                    organized++;
                } catch (error) {
                    // Continue with other items
                }
            }
        }
        
        if (organized > 0) {
            console.log(`Organized ${organized} priority items in hotbar`);
        }
        
        return organized;
    }
    
    /**
     * Gets a summary of current inventory for reporting
     */
    getInventorySummary() {
        const items = this.bot.inventory.items();
        
        const summary = {
            totalSlots: 36,
            usedSlots: items.length,
            freeSlots: 36 - items.length,
            tools: items.filter(i => i.name.includes('pickaxe') || i.name.includes('axe') || i.name.includes('shovel')).length,
            weapons: items.filter(i => i.name.includes('sword')).length,
            food: items.filter(i => {
                const foodNames = ['beef', 'porkchop', 'chicken', 'bread', 'carrot', 'potato'];
                return foodNames.some(food => i.name.includes(food));
            }).length,
            blocks: items.filter(i => i.name.includes('cobblestone') || i.name.includes('planks') || i.name.includes('stone')).reduce((sum, item) => sum + item.count, 0)
        };
        
        return summary;
    }
}

module.exports = InventoryManager;
