const { goals } = require('mineflayer-pathfinder');

class ResourceGatherer {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.exploration = null; // Will be set later
    }

    setExplorationSystem(exploration) {
        this.exploration = exploration;
    }

    async collectWood(count = 20) {
        console.log(`Starting wood collection (target: ${count})`);
        
        const woodTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
        
        try {
            // Equip axe
            await this.inventory.equipBestTool('axe');

            let collected = 0;
            let searchAttempts = 0;
            const maxSearchAttempts = 10;
            
            while (collected < count && searchAttempts < maxSearchAttempts) {
                // First, try to find a tree using known locations
                let treePos = null;
                
                if (this.exploration) {
                    const knownTree = this.exploration.findNearestKnownTree();
                    if (knownTree) {
                        treePos = knownTree.position;
                        console.log(`Found tree in memory at ${treePos.toString()}`);
                    }
                }
                
                // If no known tree, search for one nearby
                if (!treePos) {
                    const tree = this.bot.findBlock({
                        matching: block => woodTypes.includes(block.name),
                        maxDistance: 64
                    });

                    if (!tree) {
                        console.log('No trees found nearby, exploring to find more...');
                        searchAttempts++;
                        await this.exploreForResource('log');
                        continue;
                    }
                    
                    treePos = tree.position;
                    
                    // Remember this tree location
                    if (this.exploration) {
                        this.exploration.rememberTreeLocation(tree.position, tree.name);
                    }
                }

                // Navigate to and chop the tree
                const tree = this.bot.blockAt(treePos);
                if (tree && woodTypes.includes(tree.name)) {
                    const treePosition = tree.position.clone();
                    await this.bot.pathfinder.goto(new goals.GoalBlock(tree.position.x, tree.position.y, tree.position.z));
                    await this.bot.dig(tree);
                    collected++;
                    searchAttempts = 0; // Reset search attempts on success
                    
                    // Pick up drops
                    await this.collectDrops(treePosition, 500);
                } else {
                    searchAttempts++;
                }
            }

            if (collected > 0) {
                await this.notifier.notifyResourceFound('wood', collected);
                console.log(`Successfully collected ${collected} wood`);
            } else {
                console.log('Wood collection failed - no trees found after searching');
            }
            
            return collected > 0;
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

                const stonePosition = stone.position.clone();
                await this.bot.pathfinder.goto(new goals.GoalBlock(stone.position.x, stone.position.y, stone.position.z));
                await this.bot.dig(stone);
                collected++;
                
                // Collect drops
                await this.collectDrops(stonePosition, 100);
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
            // Check inventory space before mining
            if (this.inventory.isInventoryFull()) {
                console.log('Inventory full before mining, managing inventory');
                await this.manageFullInventory();
            }

            await this.inventory.equipBestTool('pickaxe');

            const ore = this.bot.findBlock({
                matching: block => block.name === `${oreType}_ore` || block.name === `deepslate_${oreType}_ore`,
                maxDistance: maxDistance
            });

            if (!ore) {
                console.log(`No ${oreType} ore found nearby`);
                return false;
            }

            const orePosition = ore.position.clone();
            await this.notifier.notifyMining(oreType, ore.position.y);
            
            // Add timeout to pathfinder to prevent "Took too long to decide path to goal" errors
            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(ore.position.x, ore.position.y, ore.position.z));
            } catch (pathError) {
                // If pathfinding fails, try getting closer with a less strict goal
                if (pathError.message?.includes('Took too long') || pathError.message?.includes('timeout')) {
                    console.log(`Pathfinding timeout, trying alternative approach for ${oreType}`);
                    await this.bot.pathfinder.goto(new goals.GoalNear(ore.position.x, ore.position.y, ore.position.z, 3));
                } else {
                    throw pathError;
                }
            }
            
            await this.bot.dig(ore);
            
            // Wait for drops and collect them
            await this.collectDrops(orePosition);
            
            console.log(`Mined ${oreType} ore and collected drops`);
            return true;
        } catch (error) {
            console.error(`Error mining ${oreType}:`, error.message);
            return false;
        }
    }

    async collectDrops(position, waitTime = 1000) {
        // Wait for items to drop
        await this.sleep(waitTime);
        
        try {
            // Use collectblock plugin if available
            if (this.bot.collectBlock) {
                const droppedItems = Object.values(this.bot.entities).filter(entity =>
                    entity.type === 'object' &&
                    entity.objectType === 'Item' &&
                    entity.position.distanceTo(position) < 5
                );

                if (droppedItems.length === 0) {
                    console.log('No dropped items found nearby');
                    return;
                }

                console.log(`Found ${droppedItems.length} dropped item(s) to collect`);
                
                for (const item of droppedItems) {
                    try {
                        // Check inventory before collecting
                        if (this.inventory.isInventoryFull()) {
                            console.log('Inventory full during collection, managing');
                            await this.manageFullInventory();
                        }
                        
                        await this.bot.collectBlock.collect(item);
                        console.log('Collected dropped item');
                    } catch (collectError) {
                        // Ignore protocol errors during item collection - they're non-fatal
                        if (collectError.message?.includes('PartialReadError') || 
                            collectError.message?.includes('Read error')) {
                            console.log('Protocol error during item collection (non-fatal), continuing...');
                        } else {
                            console.log('Could not collect item:', collectError.message);
                        }
                    }
                }
            } else {
                // Fallback: navigate close to position for auto-pickup
                console.log('Using fallback method for item collection');
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    position.x,
                    position.y,
                    position.z,
                    1
                ));
                await this.sleep(500);
            }
        } catch (error) {
            // Ignore protocol errors - they're non-fatal
            if (error.message?.includes('PartialReadError') || 
                error.message?.includes('Read error')) {
                console.log('Protocol error during item collection (non-fatal), continuing...');
            } else {
                console.error('Error collecting drops:', error.message);
            }
        }
    }

    async manageFullInventory() {
        console.log('Managing full inventory during mining');
        
        // Try to toss junk first
        await this.inventory.tossJunk();
        
        // If still full, try to find and use nearby chest
        if (this.inventory.isInventoryFull()) {
            const chest = this.bot.findBlock({
                matching: block => block.name === 'chest',
                maxDistance: 16
            });
            
            if (chest) {
                console.log('Found nearby chest, storing items');
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(
                        chest.position.x,
                        chest.position.y,
                        chest.position.z
                    ));
                    
                    const chestWindow = await this.bot.openContainer(chest);
                    
                    // Store excess cobblestone and dirt
                    const excessItems = this.bot.inventory.items().filter(item =>
                        item.name === 'cobblestone' ||
                        item.name === 'dirt' ||
                        item.name === 'gravel' ||
                        item.name === 'andesite' ||
                        item.name === 'diorite' ||
                        item.name === 'granite'
                    );
                    
                    for (const item of excessItems) {
                        try {
                            await chestWindow.deposit(item.type, null, item.count);
                        } catch (e) {
                            // Chest might be full
                        }
                    }
                    
                    chestWindow.close();
                    console.log('Stored excess items in chest');
                } catch (error) {
                    console.error('Error using chest:', error.message);
                }
            }
        }
        
        // Last resort: toss more aggressively
        if (this.inventory.isInventoryFull()) {
            console.log('Still full, tossing common items');
            const commonItems = this.bot.inventory.items().filter(item =>
                item.name === 'cobblestone' ||
                item.name === 'dirt' ||
                item.name === 'gravel'
            );
            
            for (const item of commonItems) {
                try {
                    await this.bot.toss(item.type, null, Math.floor(item.count / 2));
                    console.log(`Tossed ${Math.floor(item.count / 2)} ${item.name}`);
                } catch (error) {
                    // Continue
                }
            }
        }
    }

    async searchForValuableOres() {
        // Prioritize higher-value ores first: diamond, gold, iron, then others
        const valuableOres = ['diamond', 'emerald', 'gold', 'iron', 'lapis', 'redstone', 'copper', 'coal'];
        
        for (const ore of valuableOres) {
            const found = this.bot.findBlock({
                matching: block => block.name.includes(ore) && block.name.includes('ore'),
                maxDistance: 32
            });

            if (found) {
                await this.mineOre(ore);
                return true; // Successfully found and mined ore
            }
        }
        
        return false; // No ores found
    }

    /**
     * Mine discovered ores from exploration system
     */
    async mineDiscoveredOres() {
        if (!this.exploration || !this.exploration.knownOreLocations) {
            return false;
        }

        console.log('Attempting to mine discovered ores');
        let minedCount = 0;

        for (const [oreType, locations] of this.exploration.knownOreLocations) {
            // Mine up to 3 locations per ore type
            const toMine = locations.slice(0, 3);
            
            for (const loc of toMine) {
                try {
                    await this.inventory.equipBestTool('pickaxe');
                    
                    // Navigate to ore location with timeout handling
                    try {
                        await this.bot.pathfinder.goto(new goals.GoalNear(
                            loc.position.x,
                            loc.position.y,
                            loc.position.z,
                            3
                        ));
                    } catch (pathError) {
                        if (pathError.message?.includes('Took too long') || pathError.message?.includes('timeout')) {
                            console.log(`Pathfinding timeout to ${oreType} ore, skipping location`);
                            continue; // Skip this location and try the next one
                        }
                        throw pathError; // Re-throw if it's a different error
                    }
                    
                    // Find the ore block (it might still be there)
                    const oreBlock = this.bot.findBlock({
                        matching: block => block.name.includes(oreType) && block.name.includes('ore'),
                        maxDistance: 5
                    });
                    
                    if (oreBlock) {
                        console.log(`Mining discovered ${oreType} ore at ${oreBlock.position.toString()}`);
                        
                        const orePosition = oreBlock.position.clone();
                        
                        // Navigate to the exact ore block with timeout handling
                        try {
                            await this.bot.pathfinder.goto(new goals.GoalBlock(
                                oreBlock.position.x,
                                oreBlock.position.y,
                                oreBlock.position.z
                            ));
                        } catch (pathError) {
                            if (pathError.message?.includes('Took too long') || pathError.message?.includes('timeout')) {
                                console.log(`Pathfinding timeout to exact ore block, trying nearby approach`);
                                await this.bot.pathfinder.goto(new goals.GoalNear(
                                    oreBlock.position.x,
                                    oreBlock.position.y,
                                    oreBlock.position.z,
                                    2
                                ));
                            } else {
                                throw pathError;
                            }
                        }
                        
                        await this.bot.dig(oreBlock);
                        
                        // Collect drops
                        await this.collectDrops(orePosition);
                        
                        minedCount++;
                        await this.notifier.notifyResourceFound(oreType, 1);
                    }
                    
                    await this.sleep(500);
                } catch (error) {
                    console.error(`Error mining discovered ${oreType}:`, error.message);
                }
            }
            
            // Remove mined locations
            locations.splice(0, toMine.length);
        }

        if (minedCount > 0) {
            console.log(`Successfully mined ${minedCount} discovered ore(s)`);
        }
        
        return minedCount > 0;
    }

    async exploreForResource(resourceType) {
        console.log(`Exploring for ${resourceType}...`);
        
        // Move in a random direction to find resources
        const randomX = (Math.random() - 0.5) * 100;
        const randomZ = (Math.random() - 0.5) * 100;
        const targetPos = this.bot.entity.position.offset(randomX, 0, randomZ);

        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 5));
            console.log(`Exploration complete, searching for ${resourceType} in new area`);
        } catch (error) {
            console.log(`Exploration interrupted: ${error.message}. Continuing search...`);
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

                const coalPosition = coal.position.clone();
                await this.bot.pathfinder.goto(new goals.GoalBlock(coal.position.x, coal.position.y, coal.position.z));
                await this.bot.dig(coal);
                collected++;
                
                // Collect drops
                await this.collectDrops(coalPosition, 100);
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
