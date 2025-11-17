const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class AdvancedBaseSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, buildingSystem) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.building = buildingSystem;
        this.baseLevel = 0; // Track base progression
    }

    async buildAdvancedBase(centerPos) {
        console.log('Building advanced survival base with defenses');
        
        await this.notifier.send('Starting advanced base construction...');

        // Phase 1: Foundation and perimeter
        await this.buildFoundation(centerPos, 15, 15);
        
        // Phase 2: Walls with battlements
        await this.buildFortifiedWalls(centerPos, 15, 15, 5);
        
        // Phase 3: Watchtowers at corners
        await this.buildWatchtowers(centerPos, 15, 15);
        
        // Phase 4: Interior structures
        await this.buildInteriorStructures(centerPos);
        
        // Phase 5: Defensive lighting
        await this.buildDefensiveLighting(centerPos, 20);
        
        // Phase 6: Moat (optional, if water available)
        await this.buildMoat(centerPos, 17);

        await this.notifier.send('Advanced base construction complete!');
        this.baseLevel = 3;
        
        console.log('Advanced base completed');
        return true;
    }

    async buildFoundation(centerPos, width, depth) {
        console.log('Building reinforced foundation');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        // Clear area first
        for (let x = -halfWidth - 2; x <= halfWidth + 2; x++) {
            for (let z = -halfDepth - 2; z <= halfDepth + 2; z++) {
                for (let y = 0; y < 6; y++) {
                    const block = this.bot.blockAt(centerPos.offset(x, y, z));
                    if (block && block.name !== 'air' && block.name !== 'bedrock') {
                        try {
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = AdvancedBaseSystem;
