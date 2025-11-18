const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Sorting System & Item Organization
 * - Creates organized chest system (ore/tool/building/food/misc)
 * - Implements auto-sorting routines
 * - Tracks item locations in memory
 * - Creates chest locator system
 */
class SortingSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        
        // Chest organization categories
        this.CHEST_CATEGORIES = {
            ORE: 'ore_storage',
            TOOL: 'tool_storage',
            BUILDING: 'building_storage',
            FOOD: 'food_storage',
            MISC: 'misc_storage'
        };
        
        // Item categorization
        this.ITEM_CATEGORIES = {
            ore: [
                'coal', 'iron_ore', 'gold_ore', 'diamond', 'emerald', 'lapis_lazuli',
                'redstone', 'quartz', 'ancient_debris', 'iron_ingot', 'gold_ingot',
                'netherite_ingot', 'copper_ore', 'copper_ingot'
            ],
            tool: [
                'pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'bow', 'crossbow',
                'fishing_rod', 'shears', 'flint_and_steel', 'bucket', 'compass',
                'clock', 'shield'
            ],
            building: [
                'stone', 'cobblestone', 'dirt', 'sand', 'gravel', 'planks', 'log',
                'glass', 'brick', 'nether_brick', 'quartz_block', 'sandstone',
                'wood', 'wool', 'concrete', 'terracotta', 'chest', 'door', 'fence'
            ],
            food: [
                'bread', 'apple', 'carrot', 'potato', 'beetroot', 'wheat', 'seeds',
                'beef', 'porkchop', 'chicken', 'mutton', 'rabbit', 'cod', 'salmon',
                'cookie', 'cake', 'pumpkin_pie', 'golden_apple', 'cooked'
            ]
        };
        
        // Chest locations
        this.chestLocations = new Map(); // category -> position
        
        // Item location tracking
        this.itemLocations = new Map(); // itemName -> Set of chest positions
        
        // Auto-sort settings
        this.autoSortEnabled = true;
        this.sortCooldown = 300000; // 5 minutes between auto-sorts
        this.lastSortTime = 0;
    }
    
    /**
     * Register a storage chest
     */
    registerChest(category, position) {
        if (!Object.values(this.CHEST_CATEGORIES).includes(category)) {
            console.log(`Invalid category: ${category}`);
            return false;
        }
        
        this.chestLocations.set(category, position.clone());
        console.log(`Registered ${category} chest at ${position.toString()}`);
        return true;
    }
    
    /**
     * Create organized chest system
     */
    async createOrganizedChestSystem(basePosition) {
        console.log('Creating organized chest system');
        await this.notifier.send('📦 Setting up organized storage system');
        
        const categories = Object.values(this.CHEST_CATEGORIES);
        const spacing = 2; // Space between chests
        
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const chestPos = basePosition.offset(i * spacing, 0, 0);
            
            // Place chest
            const placed = await this.placeChest(chestPos);
            if (placed) {
                this.registerChest(category, chestPos);
                
                // Place sign above chest with label
                await this.placeSign(chestPos.offset(0, 1, 0), category);
            }
        }
        
        await this.notifier.send('✅ Organized storage system complete');
        console.log(`Created ${categories.length} categorized chests`);
    }
    
    /**
     * Place a chest
     */
    async placeChest(position) {
        const chest = this.bot.inventory.items().find(item => 
            item.name === 'chest'
        );
        
        if (!chest) {
            console.log('No chest available in inventory');
            return false;
        }
        
        try {
            await this.bot.equip(chest, 'hand');
            const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
            
            if (referenceBlock && referenceBlock.name !== 'air') {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                console.log(`Chest placed at ${position.toString()}`);
                return true;
            }
        } catch (error) {
            console.error('Error placing chest:', error.message);
        }
        
        return false;
    }
    
    /**
     * Place sign with label
     */
    async placeSign(position, text) {
        const sign = this.bot.inventory.items().find(item => 
            item.name.includes('sign')
        );
        
        if (!sign) {
            return false;
        }
        
        try {
            await this.bot.equip(sign, 'hand');
            const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
            
            if (referenceBlock) {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                // Note: Setting sign text requires additional API calls
                console.log(`Sign placed at ${position.toString()}: ${text}`);
                return true;
            }
        } catch (error) {
            // Silently fail if can't place sign
        }
        
        return false;
    }
    
    /**
     * Categorize an item
     */
    categorizeItem(itemName) {
        // Check each category
        for (const [category, items] of Object.entries(this.ITEM_CATEGORIES)) {
            // Check for exact match or partial match
            if (items.includes(itemName)) {
                return this.CHEST_CATEGORIES[category.toUpperCase()];
            }
            
            // Check for partial matches (e.g., "diamond_pickaxe" contains "pickaxe")
            for (const item of items) {
                if (itemName.includes(item)) {
                    return this.CHEST_CATEGORIES[category.toUpperCase()];
                }
            }
        }
        
        // Default to misc if no category found
        return this.CHEST_CATEGORIES.MISC;
    }
    
    /**
     * Auto-sort inventory into chests
     */
    async autoSortInventory() {
        // Check cooldown
        if (Date.now() - this.lastSortTime < this.sortCooldown) {
            console.log('Auto-sort on cooldown');
            return;
        }
        
        console.log('Auto-sorting inventory into organized chests');
        
        const items = this.bot.inventory.items();
        const sortedCount = new Map();
        
        for (const item of items) {
            // Skip tools currently equipped or essential items
            if (this.isEssentialItem(item)) {
                continue;
            }
            
            // Determine category
            const category = this.categorizeItem(item.name);
            const chestPos = this.chestLocations.get(category);
            
            if (!chestPos) {
                console.log(`No chest registered for category: ${category}`);
                continue;
            }
            
            // Store in chest
            const stored = await this.storeItemInChest(item, chestPos);
            if (stored) {
                sortedCount.set(category, (sortedCount.get(category) || 0) + item.count);
                
                // Track item location
                this.trackItemLocation(item.name, chestPos);
            }
        }
        
        // Report results
        if (sortedCount.size > 0) {
            let report = 'Sorted: ';
            for (const [category, count] of sortedCount) {
                report += `${category}(${count}) `;
            }
            console.log(report);
        }
        
        this.lastSortTime = Date.now();
    }
    
    /**
     * Check if item is essential (should not be auto-sorted)
     */
    isEssentialItem(item) {
        const essential = [
            'food', 'torch', 'crafting_table', 'furnace',
            // Keep some tools in inventory
        ];
        
        // Keep food in inventory
        if (this.ITEM_CATEGORIES.food.some(food => item.name.includes(food))) {
            return true;
        }
        
        // Keep torches
        if (item.name === 'torch') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Store item in specific chest
     */
    async storeItemInChest(item, chestPosition) {
        try {
            // Navigate to chest
            await this.bot.pathfinder.goto(new goals.GoalNear(
                chestPosition.x,
                chestPosition.y,
                chestPosition.z,
                2
            ));
            
            // Open chest
            const chest = this.bot.blockAt(chestPosition);
            if (!chest || chest.name !== 'chest') {
                console.log('Chest not found at position');
                return false;
            }
            
            const chestWindow = await this.bot.openContainer(chest);
            
            // Deposit item
            await chestWindow.deposit(item.type, null, item.count);
            await this.sleep(200);
            
            chestWindow.close();
            
            console.log(`Stored ${item.count}x ${item.name} in chest`);
            return true;
        } catch (error) {
            console.error('Error storing item:', error.message);
            return false;
        }
    }
    
    /**
     * Track item location
     */
    trackItemLocation(itemName, chestPosition) {
        if (!this.itemLocations.has(itemName)) {
            this.itemLocations.set(itemName, new Set());
        }
        
        const key = `${chestPosition.x},${chestPosition.y},${chestPosition.z}`;
        this.itemLocations.get(itemName).add(key);
    }
    
    /**
     * Find item in chests (chest locator system)
     */
    findItemInChests(itemName) {
        const locations = this.itemLocations.get(itemName);
        
        if (!locations || locations.size === 0) {
            console.log(`${itemName} not found in tracked chests`);
            return null;
        }
        
        // Return first location
        const locKey = Array.from(locations)[0];
        const [x, y, z] = locKey.split(',').map(Number);
        const position = new Vec3(x, y, z);
        
        // Determine category
        for (const [category, pos] of this.chestLocations) {
            if (pos.equals(position)) {
                console.log(`${itemName} found in ${category} at ${position.toString()}`);
                return { category, position };
            }
        }
        
        return { category: 'unknown', position };
    }
    
    /**
     * Retrieve item from chest
     */
    async retrieveItemFromChest(itemName, quantity = 1) {
        const location = this.findItemInChests(itemName);
        
        if (!location) {
            console.log(`${itemName} not found in storage`);
            return false;
        }
        
        try {
            // Navigate to chest
            await this.bot.pathfinder.goto(new goals.GoalNear(
                location.position.x,
                location.position.y,
                location.position.z,
                2
            ));
            
            // Open chest
            const chest = this.bot.blockAt(location.position);
            if (!chest) {
                return false;
            }
            
            const chestWindow = await this.bot.openContainer(chest);
            
            // Find item in chest
            const item = chestWindow.containerItems().find(i => i.name === itemName);
            if (!item) {
                console.log(`${itemName} not in chest`);
                chestWindow.close();
                return false;
            }
            
            // Withdraw item
            const withdrawAmount = Math.min(quantity, item.count);
            await chestWindow.withdraw(item.type, null, withdrawAmount);
            await this.sleep(200);
            
            chestWindow.close();
            
            console.log(`Retrieved ${withdrawAmount}x ${itemName}`);
            return true;
        } catch (error) {
            console.error('Error retrieving item:', error.message);
            return false;
        }
    }
    
    /**
     * Generate storage report
     */
    generateStorageReport() {
        let report = `\n=== Storage System Report ===\n`;
        report += `Registered Chests: ${this.chestLocations.size}\n`;
        report += `Tracked Items: ${this.itemLocations.size}\n`;
        report += `Auto-Sort: ${this.autoSortEnabled ? 'Enabled' : 'Disabled'}\n\n`;
        
        report += `Storage Locations:\n`;
        for (const [category, position] of this.chestLocations) {
            report += `  ${category}: ${position.toString()}\n`;
        }
        
        if (this.itemLocations.size > 0) {
            report += `\nStored Items (sample):\n`;
            let count = 0;
            for (const [itemName, locations] of this.itemLocations) {
                if (count >= 10) break;
                report += `  ${itemName}: ${locations.size} chest(s)\n`;
                count++;
            }
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
            registeredChests: this.chestLocations.size,
            trackedItems: this.itemLocations.size,
            autoSortEnabled: this.autoSortEnabled
        };
    }
}

module.exports = SortingSystem;
