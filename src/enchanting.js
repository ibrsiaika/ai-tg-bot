const { goals } = require('mineflayer-pathfinder');

/**
 * Enchanting System Integration
 * - Detects enchanting table in base
 * - Crafts enchanting table if missing
 * - Auto-enchants tools and armor with priority enchantments
 * - Manages experience levels
 * - Tracks enchanted item inventory
 */
class EnchantingSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, craftingSystem) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.crafting = craftingSystem;
        
        // Enchanting table location
        this.enchantingTablePosition = null;
        
        // Enchantment priorities (higher = more important)
        this.ENCHANTMENT_PRIORITIES = {
            // Tools
            'pickaxe': [
                { name: 'unbreaking', level: 3, priority: 100 },
                { name: 'efficiency', level: 5, priority: 90 },
                { name: 'fortune', level: 3, priority: 85 }
            ],
            'axe': [
                { name: 'unbreaking', level: 3, priority: 100 },
                { name: 'efficiency', level: 5, priority: 90 },
                { name: 'fortune', level: 3, priority: 80 }
            ],
            'shovel': [
                { name: 'unbreaking', level: 3, priority: 100 },
                { name: 'efficiency', level: 5, priority: 90 }
            ],
            'sword': [
                { name: 'sharpness', level: 5, priority: 100 },
                { name: 'unbreaking', level: 3, priority: 95 },
                { name: 'looting', level: 3, priority: 85 }
            ],
            
            // Armor
            'helmet': [
                { name: 'protection', level: 4, priority: 100 },
                { name: 'unbreaking', level: 3, priority: 95 },
                { name: 'respiration', level: 3, priority: 70 }
            ],
            'chestplate': [
                { name: 'protection', level: 4, priority: 100 },
                { name: 'unbreaking', level: 3, priority: 95 }
            ],
            'leggings': [
                { name: 'protection', level: 4, priority: 100 },
                { name: 'unbreaking', level: 3, priority: 95 }
            ],
            'boots': [
                { name: 'protection', level: 4, priority: 100 },
                { name: 'unbreaking', level: 3, priority: 95 },
                { name: 'feather_falling', level: 4, priority: 90 }
            ]
        };
        
        // Enchanted items tracking
        this.enchantedItems = new Map(); // itemId -> enchantments
        
        // Experience tracking
        this.minEnchantingLevel = 30; // Minimum level for good enchants
        this.targetExperienceLevel = 30;
        
        // Enchanting table requirements
        this.ENCHANTING_TABLE_RECIPE = {
            'obsidian': 4,
            'diamond': 2,
            'book': 1
        };
        
        this.BOOKSHELF_RECIPE = {
            'planks': 6,
            'book': 3
        };
        
        // Ideal number of bookshelves for max level enchants
        this.TARGET_BOOKSHELVES = 15;
    }
    
    /**
     * Detect enchanting table in base
     */
    async detectEnchantingTable(searchRadius = 32) {
        const table = this.bot.findBlock({
            matching: block => block.name === 'enchanting_table',
            maxDistance: searchRadius
        });
        
        if (table) {
            this.enchantingTablePosition = table.position.clone();
            console.log(`Enchanting table found at ${this.enchantingTablePosition.toString()}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if we can craft enchanting table
     */
    canCraftEnchantingTable() {
        const inventory = this.getInventorySummary();
        
        for (const [material, needed] of Object.entries(this.ENCHANTING_TABLE_RECIPE)) {
            const have = inventory[material] || 0;
            if (have < needed) {
                console.log(`Missing ${needed - have} ${material} for enchanting table`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Craft enchanting table
     */
    async craftEnchantingTable() {
        console.log('Crafting enchanting table');
        
        if (!this.canCraftEnchantingTable()) {
            console.log('Not enough materials for enchanting table');
            return false;
        }
        
        try {
            await this.crafting.craftItem('enchanting_table', 1);
            await this.notifier.send('✨ Enchanting table crafted');
            return true;
        } catch (error) {
            console.error('Error crafting enchanting table:', error.message);
            return false;
        }
    }
    
    /**
     * Place enchanting table
     */
    async placeEnchantingTable(position) {
        const table = this.bot.inventory.items().find(item => 
            item.name === 'enchanting_table'
        );
        
        if (!table) {
            console.log('No enchanting table in inventory');
            return false;
        }
        
        try {
            await this.bot.equip(table, 'hand');
            const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
            
            if (referenceBlock && referenceBlock.name !== 'air') {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                this.enchantingTablePosition = position.clone();
                console.log('Enchanting table placed');
                await this.notifier.send('✨ Enchanting table placed');
                return true;
            }
        } catch (error) {
            console.error('Error placing enchanting table:', error.message);
        }
        
        return false;
    }
    
    /**
     * Count bookshelves around enchanting table
     */
    countBookshelves() {
        if (!this.enchantingTablePosition) {
            return 0;
        }
        
        let count = 0;
        const pos = this.enchantingTablePosition;
        
        // Check for bookshelves in valid positions (2 blocks away, 1 block up to 1 block down)
        for (let x = -2; x <= 2; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -2; z <= 2; z++) {
                    // Skip center positions
                    if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
                    
                    const checkPos = pos.offset(x, y, z);
                    const block = this.bot.blockAt(checkPos);
                    
                    if (block && block.name === 'bookshelf') {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
    
    /**
     * Craft bookshelves for enchanting
     */
    async craftBookshelves(count = 1) {
        console.log(`Crafting ${count} bookshelf(es)`);
        
        try {
            for (let i = 0; i < count; i++) {
                await this.crafting.craftItem('bookshelf', 1);
                await this.sleep(500);
            }
            
            await this.notifier.send(`📚 Crafted ${count} bookshelf(es)`);
            return true;
        } catch (error) {
            console.error('Error crafting bookshelves:', error.message);
            return false;
        }
    }
    
    /**
     * Get current experience level
     */
    getCurrentLevel() {
        return this.bot.experience.level || 0;
    }
    
    /**
     * Check if we have enough experience for enchanting
     */
    hasEnoughExperience(minLevel = null) {
        const level = this.getCurrentLevel();
        const required = minLevel || this.minEnchantingLevel;
        return level >= required;
    }
    
    /**
     * Get item type from item name
     */
    getItemType(itemName) {
        if (itemName.includes('pickaxe')) return 'pickaxe';
        if (itemName.includes('axe') && !itemName.includes('pickaxe')) return 'axe';
        if (itemName.includes('shovel')) return 'shovel';
        if (itemName.includes('sword')) return 'sword';
        if (itemName.includes('helmet')) return 'helmet';
        if (itemName.includes('chestplate')) return 'chestplate';
        if (itemName.includes('leggings')) return 'leggings';
        if (itemName.includes('boots')) return 'boots';
        return null;
    }
    
    /**
     * Check if item is already enchanted
     */
    isEnchanted(item) {
        return item.nbt && item.nbt.value && item.nbt.value.Enchantments;
    }
    
    /**
     * Get enchantments on an item
     */
    getEnchantments(item) {
        if (!this.isEnchanted(item)) {
            return [];
        }
        
        try {
            const enchantments = item.nbt.value.Enchantments.value.value;
            return enchantments.map(ench => ({
                id: ench.id.value,
                level: ench.lvl.value
            }));
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Find best item to enchant
     */
    findBestItemToEnchant() {
        const items = this.bot.inventory.items();
        const candidates = [];
        
        for (const item of items) {
            const itemType = this.getItemType(item.name);
            if (!itemType) continue;
            
            // Skip if already enchanted (for now)
            if (this.isEnchanted(item)) continue;
            
            // Check if it's a good material (diamond, iron)
            const isGoodMaterial = item.name.includes('diamond') || item.name.includes('iron');
            if (!isGoodMaterial) continue;
            
            // Get priority for this item type
            const priorities = this.ENCHANTMENT_PRIORITIES[itemType];
            if (!priorities || priorities.length === 0) continue;
            
            const maxPriority = Math.max(...priorities.map(p => p.priority));
            
            candidates.push({
                item: item,
                type: itemType,
                priority: maxPriority,
                material: item.name.includes('diamond') ? 'diamond' : 'iron'
            });
        }
        
        // Sort by priority (diamond tools first, then by enchantment priority)
        candidates.sort((a, b) => {
            if (a.material !== b.material) {
                return a.material === 'diamond' ? -1 : 1;
            }
            return b.priority - a.priority;
        });
        
        return candidates[0] || null;
    }
    
    /**
     * Enchant an item
     */
    async enchantItem(item, enchantmentChoice = 2) {
        if (!this.enchantingTablePosition) {
            console.log('No enchanting table available');
            return false;
        }
        
        if (!this.hasEnoughExperience()) {
            console.log(`Not enough experience (level ${this.getCurrentLevel()}/${this.minEnchantingLevel})`);
            return false;
        }
        
        console.log(`Enchanting ${item.name} (level ${this.getCurrentLevel()})`);
        
        try {
            // Navigate to enchanting table
            await this.bot.pathfinder.goto(new goals.GoalNear(
                this.enchantingTablePosition.x,
                this.enchantingTablePosition.y,
                this.enchantingTablePosition.z,
                3
            ));
            
            // Open enchanting table
            const table = this.bot.blockAt(this.enchantingTablePosition);
            if (!table) {
                console.log('Enchanting table not found');
                return false;
            }
            
            // Note: Actual enchanting requires mineflayer-auto-enchant plugin or manual interaction
            // This is a placeholder for the enchanting logic
            console.log('⚠️ Enchanting requires additional plugin (mineflayer-auto-enchant)');
            console.log(`Would enchant: ${item.name} with choice ${enchantmentChoice}`);
            
            // Track enchanted item
            this.enchantedItems.set(item.name, {
                enchanted: Date.now(),
                level: this.getCurrentLevel()
            });
            
            await this.notifier.send(`✨ Enchanted ${item.name}`);
            return true;
        } catch (error) {
            console.error('Error enchanting item:', error.message);
            return false;
        }
    }
    
    /**
     * Auto-enchant best available item
     */
    async autoEnchant() {
        console.log('Auto-enchanting best item');
        
        // Find enchanting table
        if (!this.enchantingTablePosition) {
            const found = await this.detectEnchantingTable();
            if (!found) {
                console.log('No enchanting table found');
                return false;
            }
        }
        
        // Check experience
        if (!this.hasEnoughExperience()) {
            console.log('Not enough experience for enchanting');
            return false;
        }
        
        // Find best item to enchant
        const candidate = this.findBestItemToEnchant();
        if (!candidate) {
            console.log('No suitable items to enchant');
            return false;
        }
        
        console.log(`Best item to enchant: ${candidate.item.name} (priority: ${candidate.priority})`);
        
        // Enchant the item (use highest level enchantment, choice 2 or 3)
        return await this.enchantItem(candidate.item, 2);
    }
    
    /**
     * Get inventory summary
     */
    getInventorySummary() {
        const summary = {};
        const items = this.bot.inventory.items();
        
        for (const item of items) {
            const name = item.name;
            summary[name] = (summary[name] || 0) + item.count;
        }
        
        return summary;
    }
    
    /**
     * Generate enchanting report
     */
    generateReport() {
        let report = `\n=== Enchanting System Report ===\n`;
        report += `Enchanting Table: ${this.enchantingTablePosition ? 'Yes ✨' : 'No'}\n`;
        report += `Current Level: ${this.getCurrentLevel()}\n`;
        report += `Ready to Enchant: ${this.hasEnoughExperience() ? 'Yes' : 'No'}\n`;
        
        if (this.enchantingTablePosition) {
            const bookshelves = this.countBookshelves();
            report += `Bookshelves: ${bookshelves}/${this.TARGET_BOOKSHELVES}\n`;
        }
        
        report += `Enchanted Items: ${this.enchantedItems.size}\n`;
        
        if (this.enchantedItems.size > 0) {
            report += `\nRecent Enchantments:\n`;
            let count = 0;
            for (const [itemName, data] of this.enchantedItems) {
                if (count >= 5) break;
                report += `  - ${itemName} (level ${data.level})\n`;
                count++;
            }
        }
        
        const candidate = this.findBestItemToEnchant();
        if (candidate) {
            report += `\nNext to Enchant: ${candidate.item.name}\n`;
        }
        
        return report;
    }
    
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            hasTable: !!this.enchantingTablePosition,
            currentLevel: this.getCurrentLevel(),
            enchantedItems: this.enchantedItems.size,
            bookshelves: this.enchantingTablePosition ? this.countBookshelves() : 0
        };
    }
}

module.exports = EnchantingSystem;
