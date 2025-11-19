const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class AdvancedBaseSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, buildingSystem, craftingSystem = null) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.building = buildingSystem;
        this.crafting = craftingSystem;
        this.baseLevel = 0; // Track base progression
    }

    setCraftingSystem(craftingSystem) {
        this.crafting = craftingSystem;
    }

    async buildAdvancedBase(centerPos) {
        console.log('Building advanced survival base with defenses');
        
        await this.notifier.send('Starting advanced base construction...');

        // Phase 1: Foundation and perimeter
        await this.buildFoundation(centerPos, 15, 15);
        
        // Phase 2: Walls with battlements
        await this.buildFortifiedWalls(centerPos, 15, 15, 5);
        
        // Verify and repair foundation and walls after initial construction
        console.log('Verifying structure integrity...');
        await this.repairStructure(centerPos, 15, 15, 5);
        
        // Phase 3: Watchtowers at corners
        await this.buildWatchtowers(centerPos, 15, 15);
        
        // Phase 4: Interior structures
        await this.buildInteriorStructures(centerPos);
        
        // Phase 5: Defensive lighting
        await this.buildDefensiveLighting(centerPos, 20);
        
        // Phase 6: Moat (optional, if water available)
        await this.buildMoat(centerPos, 17);
        
        // Final integrity check
        console.log('Performing final integrity check...');
        await this.repairStructure(centerPos, 15, 15, 5);

        await this.notifier.send('Advanced base construction complete!');
        this.baseLevel = 3;
        
        console.log('Advanced base completed');
        return true;
    }

    async buildFoundation(centerPos, width, depth) {
        console.log('Building reinforced foundation');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        // Equip pickaxe for clearing blocks
        await this.inventory.equipBestTool('pickaxe');

        // Clear area first
        for (let x = -halfWidth - 2; x <= halfWidth + 2; x++) {
            for (let z = -halfDepth - 2; z <= halfDepth + 2; z++) {
                for (let y = 0; y < 6; y++) {
                    const block = this.bot.blockAt(centerPos.offset(x, y, z));
                    if (block && block.name !== 'air' && block.name !== 'bedrock') {
                        try {
                            // Re-equip pickaxe if needed (in case it broke)
                            if (!this.bot.heldItem || !this.bot.heldItem.name.includes('pickaxe')) {
                                await this.inventory.equipBestTool('pickaxe');
                            }
                            await this.bot.dig(block);
                            await this.sleep(50);
                        } catch (error) {
                            // Continue
                        }
                    }
                }
            }
        }

        // Build stone foundation
        const stone = await this.inventory.findItem('stone') || 
                      await this.inventory.findItem('cobblestone');
        
        if (stone) {
            await this.bot.equip(stone, 'hand');
            
            for (let x = -halfWidth; x <= halfWidth; x++) {
                for (let z = -halfDepth; z <= halfDepth; z++) {
                    const pos = centerPos.offset(x, -1, z);
                    const block = this.bot.blockAt(pos);
                    
                    if (block && block.name === 'air') {
                        try {
                            await this.building.placeBlockAt(pos, 'stone');
                            await this.sleep(100);
                        } catch (error) {
                            // Continue
                        }
                    }
                }
            }
        }

        console.log('Foundation complete');
    }

    async buildFortifiedWalls(centerPos, width, depth, height) {
        console.log('Building fortified walls');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        const wallMaterial = await this.inventory.findItem('stone') || 
                            await this.inventory.findItem('cobblestone');
        
        if (!wallMaterial) {
            console.log('No wall material available');
            return;
        }

        await this.bot.equip(wallMaterial, 'hand');

        // Build thick walls (2 blocks thick)
        for (let y = 0; y < height; y++) {
            // North and South walls (outer layer)
            for (let x = -halfWidth; x <= halfWidth; x++) {
                await this.building.placeBlockAt(centerPos.offset(x, y, -halfDepth), 'stone');
                await this.building.placeBlockAt(centerPos.offset(x, y, halfDepth), 'stone');
                await this.sleep(50);
            }

            // East and West walls (outer layer)
            for (let z = -halfDepth; z <= halfDepth; z++) {
                await this.building.placeBlockAt(centerPos.offset(-halfWidth, y, z), 'stone');
                await this.building.placeBlockAt(centerPos.offset(halfWidth, y, z), 'stone');
                await this.sleep(50);
            }

            // Inner layer for thickness (if y < 3)
            if (y < 3) {
                for (let x = -halfWidth + 1; x <= halfWidth - 1; x++) {
                    await this.building.placeBlockAt(centerPos.offset(x, y, -halfDepth + 1), 'stone');
                    await this.building.placeBlockAt(centerPos.offset(x, y, halfDepth - 1), 'stone');
                }
                for (let z = -halfDepth + 1; z <= halfDepth - 1; z++) {
                    await this.building.placeBlockAt(centerPos.offset(-halfWidth + 1, y, z), 'stone');
                    await this.building.placeBlockAt(centerPos.offset(halfWidth - 1, y, z), 'stone');
                }
            }
        }

        // Add battlements (crenellations) on top
        await this.buildBattlements(centerPos, halfWidth, halfDepth, height);

        console.log('Fortified walls complete');
    }

    async buildBattlements(centerPos, halfWidth, halfDepth, wallHeight) {
        console.log('Adding battlements');
        
        const spacing = 3;
        
        // North wall battlements
        for (let x = -halfWidth; x <= halfWidth; x += spacing) {
            await this.building.placeBlockAt(
                centerPos.offset(x, wallHeight, -halfDepth), 
                'stone'
            );
            await this.sleep(100);
        }

        // South wall battlements
        for (let x = -halfWidth; x <= halfWidth; x += spacing) {
            await this.building.placeBlockAt(
                centerPos.offset(x, wallHeight, halfDepth), 
                'stone'
            );
            await this.sleep(100);
        }

        // East and West walls
        for (let z = -halfDepth; z <= halfDepth; z += spacing) {
            await this.building.placeBlockAt(
                centerPos.offset(-halfWidth, wallHeight, z), 
                'stone'
            );
            await this.building.placeBlockAt(
                centerPos.offset(halfWidth, wallHeight, z), 
                'stone'
            );
            await this.sleep(100);
        }
    }

    async buildWatchtowers(centerPos, width, depth) {
        console.log('Building corner watchtowers');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        const towerHeight = 8;

        const corners = [
            centerPos.offset(halfWidth + 2, 0, halfDepth + 2),
            centerPos.offset(-halfWidth - 2, 0, halfDepth + 2),
            centerPos.offset(halfWidth + 2, 0, -halfDepth - 2),
            centerPos.offset(-halfWidth - 2, 0, -halfDepth - 2)
        ];

        for (const corner of corners) {
            await this.buildTower(corner, towerHeight);
            await this.sleep(500);
        }

        await this.notifier.send('Watchtowers constructed at all corners');
        console.log('Watchtowers complete');
    }

    async buildTower(basePos, height) {
        const stone = await this.inventory.findItem('stone') || 
                      await this.inventory.findItem('cobblestone');
        
        if (!stone) return;

        // Build 3x3 tower
        for (let y = 0; y < height; y++) {
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    // Hollow in the middle (except corners for strength)
                    if (y > 0 && x === 0 && z === 0) continue;
                    
                    await this.building.placeBlockAt(
                        basePos.offset(x, y, z), 
                        'stone'
                    );
                    await this.sleep(50);
                }
            }
        }

        // Add ladder inside
        for (let y = 1; y < height - 1; y++) {
            const ladder = await this.inventory.findItem('ladder');
            if (ladder) {
                await this.building.placeBlockAt(basePos.offset(0, y, 0), 'ladder');
            }
        }

        // Add torch on top
        const torch = await this.inventory.findItem('torch');
        if (torch) {
            await this.building.placeBlockAt(basePos.offset(0, height, 0), 'torch');
        }
    }

    async buildInteriorStructures(centerPos) {
        console.log('Building interior structures');
        
        // Ensure we have doors for interior rooms
        if (this.crafting) {
            const doorCount = this.bot.inventory.items().filter(item => 
                item.name.includes('_door')
            ).length;
            
            if (doorCount < 2) {
                console.log('Crafting doors for interior structures...');
                await this.crafting.craftDoor(2);
            }
        }
        
        // Storage room
        await this.buildStorageRoom(centerPos.offset(-5, 0, -5));
        
        // Crafting area
        await this.buildCraftingArea(centerPos.offset(5, 0, -5));
        
        // Bedroom
        await this.buildBedroom(centerPos.offset(-5, 0, 5));
        
        // Smelting room
        await this.buildSmeltingRoom(centerPos.offset(5, 0, 5));

        console.log('Interior structures complete');
    }

    async buildStorageRoom(pos) {
        // Place multiple chests in organized rows
        const chestPositions = [
            pos.offset(0, 0, 0),
            pos.offset(2, 0, 0),
            pos.offset(0, 0, 2),
            pos.offset(2, 0, 2)
        ];

        for (const chestPos of chestPositions) {
            await this.building.placeBlockAt(chestPos, 'chest');
            await this.sleep(300);
        }

        // Add sign
        console.log('Storage room complete with 4 chests');
    }

    async buildCraftingArea(pos) {
        // Place crafting table
        await this.building.placeBlockAt(pos, 'crafting_table');
        
        // Place additional crafting tables
        await this.building.placeBlockAt(pos.offset(2, 0, 0), 'crafting_table');
        
        console.log('Crafting area complete');
    }

    async buildBedroom(pos) {
        // Place bed (if available)
        const bed = await this.inventory.findItem('bed');
        if (bed) {
            await this.building.placeBlockAt(pos, 'bed');
        }
        
        console.log('Bedroom complete');
    }

    async buildSmeltingRoom(pos) {
        // Place furnaces
        const furnacePositions = [
            pos.offset(0, 0, 0),
            pos.offset(2, 0, 0),
            pos.offset(0, 0, 2)
        ];

        for (const furnacePos of furnacePositions) {
            await this.building.placeBlockAt(furnacePos, 'furnace');
            await this.sleep(300);
        }

        console.log('Smelting room complete with 3 furnaces');
    }

    async buildDefensiveLighting(centerPos, radius) {
        console.log('Building defensive lighting perimeter');
        
        const torch = await this.inventory.findItem('torch');
        if (!torch) {
            console.log('No torches available for lighting');
            return;
        }

        // Create a grid of torches around the base
        const spacing = 6;
        for (let x = -radius; x <= radius; x += spacing) {
            for (let z = -radius; z <= radius; z += spacing) {
                const pos = centerPos.offset(x, 0, z);
                const blockBelow = this.bot.blockAt(pos.offset(0, -1, 0));
                
                if (blockBelow && blockBelow.name !== 'air') {
                    await this.building.placeBlockAt(pos, 'torch');
                    await this.sleep(100);
                }
            }
        }

        console.log('Defensive lighting complete');
    }

    async buildMoat(centerPos, radius) {
        console.log('Attempting to build protective moat');
        
        const waterBucket = await this.inventory.findItem('water_bucket');
        if (!waterBucket) {
            console.log('No water bucket available for moat');
            return;
        }

        // Dig trench around base
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = angle * Math.PI / 180;
            const x = Math.floor(centerPos.x + Math.cos(rad) * radius);
            const z = Math.floor(centerPos.z + Math.sin(rad) * radius);
            
            for (let depth = 0; depth < 2; depth++) {
                const block = this.bot.blockAt(new Vec3(x, centerPos.y - depth, z));
                if (block && block.name !== 'air' && block.name !== 'water') {
                    try {
                        await this.bot.dig(block);
                        await this.sleep(100);
                    } catch (error) {
                        // Continue
                    }
                }
            }
        }

        console.log('Moat trench dug (water placement requires manual intervention)');
    }

    /**
     * Check if structure at position is intact
     */
    async checkStructureIntegrity(centerPos, width, depth, height) {
        console.log('Checking structure integrity...');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        const missingBlocks = [];

        // Check foundation
        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const pos = centerPos.offset(x, -1, z);
                const block = this.bot.blockAt(pos);
                
                if (!block || block.name === 'air') {
                    missingBlocks.push({ pos, type: 'foundation' });
                }
            }
        }

        // Check walls
        for (let y = 0; y < height; y++) {
            // North and South walls
            for (let x = -halfWidth; x <= halfWidth; x++) {
                const northBlock = this.bot.blockAt(centerPos.offset(x, y, -halfDepth));
                const southBlock = this.bot.blockAt(centerPos.offset(x, y, halfDepth));
                
                if (!northBlock || northBlock.name === 'air') {
                    missingBlocks.push({ pos: centerPos.offset(x, y, -halfDepth), type: 'wall' });
                }
                if (!southBlock || southBlock.name === 'air') {
                    missingBlocks.push({ pos: centerPos.offset(x, y, halfDepth), type: 'wall' });
                }
            }

            // East and West walls
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const eastBlock = this.bot.blockAt(centerPos.offset(-halfWidth, y, z));
                const westBlock = this.bot.blockAt(centerPos.offset(halfWidth, y, z));
                
                if (!eastBlock || eastBlock.name === 'air') {
                    missingBlocks.push({ pos: centerPos.offset(-halfWidth, y, z), type: 'wall' });
                }
                if (!westBlock || westBlock.name === 'air') {
                    missingBlocks.push({ pos: centerPos.offset(halfWidth, y, z), type: 'wall' });
                }
            }
        }

        console.log(`Structure check complete: ${missingBlocks.length} blocks missing`);
        return missingBlocks;
    }

    /**
     * Repair damaged or incomplete structures
     */
    async repairStructure(centerPos, width = 15, depth = 15, height = 5) {
        console.log('Initiating structure repair...');
        
        const missingBlocks = await this.checkStructureIntegrity(centerPos, width, depth, height);
        
        if (missingBlocks.length === 0) {
            console.log('Structure is intact, no repairs needed');
            await this.notifier.send('✓ Structure integrity verified');
            return true;
        }

        console.log(`Repairing ${missingBlocks.length} damaged blocks...`);
        await this.notifier.send(`🔧 Repairing structure (${missingBlocks.length} blocks)`);

        const repairMaterial = await this.inventory.findItem('stone') || 
                              await this.inventory.findItem('cobblestone');
        
        if (!repairMaterial) {
            console.log('No repair material available');
            return false;
        }

        let repaired = 0;
        for (const { pos, type } of missingBlocks) {
            try {
                const block = this.bot.blockAt(pos);
                if (!block || block.name === 'air') {
                    await this.building.placeBlockAt(pos, 'stone');
                    repaired++;
                    await this.sleep(100);
                }
            } catch (error) {
                // Continue with next block
            }
        }

        console.log(`Repair complete: ${repaired}/${missingBlocks.length} blocks restored`);
        await this.notifier.send(`✓ Structure repaired: ${repaired} blocks restored`);
        
        return repaired > 0;
    }

    async upgradeBase() {
        console.log(`Upgrading base from level ${this.baseLevel}`);
        
        this.baseLevel++;
        
        switch (this.baseLevel) {
            case 2:
                await this.notifier.send('Base upgrade: Adding secondary defenses');
                break;
            case 3:
                await this.notifier.send('Base upgrade: Expanding facilities');
                break;
            case 4:
                await this.notifier.send('Base upgrade: Building advanced automation');
                break;
        }

        return this.baseLevel;
    }

    async buildNextStructure() {
        console.log('Building next structure in base progression');
        
        const botPos = this.bot.entity.position;
        
        // Build structures based on current base level
        switch (this.baseLevel) {
            case 0:
                // First structure: basic storage
                console.log('Building initial storage room');
                await this.buildStorageRoom(botPos);
                this.baseLevel = 1;
                break;
            case 1:
                // Second structure: crafting area
                console.log('Building crafting area');
                await this.buildCraftingArea(botPos.offset(5, 0, 0));
                this.baseLevel = 2;
                break;
            case 2:
                // Third structure: smelting room
                console.log('Building smelting room');
                await this.buildSmeltingRoom(botPos.offset(-5, 0, 0));
                this.baseLevel = 3;
                break;
            case 3:
                // Fourth structure: bedroom
                console.log('Building bedroom');
                await this.buildBedroom(botPos.offset(0, 0, 5));
                this.baseLevel = 4;
                break;
            default:
                // Advanced structures: upgrade existing base or add defenses
                console.log('Upgrading existing base structures');
                await this.upgradeBase();
                break;
        }
        
        await this.notifier.send(`Structure complete! Base level: ${this.baseLevel}`);
        return true;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = AdvancedBaseSystem;
