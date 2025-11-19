const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class BuildingSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
    }

    async buildStarterBase(centerPos) {
        console.log('Building enhanced starter base');
        
        try {
            // Build an enhanced 9x9 base with better features
            const baseSize = 9;
            const wallHeight = 4;

            // Clear the area first
            await this.clearArea(centerPos, baseSize, baseSize);

            // Build floor - use oak_planks by default
            await this.buildFloor(centerPos, baseSize, baseSize, 'oak_planks');

            // Build walls
            await this.buildWalls(centerPos, baseSize, baseSize, wallHeight, 'oak_planks');
            
            // Build roof for protection
            await this.buildRoof(centerPos, baseSize, baseSize, 'oak_planks');

            // Add door
            await this.placeDoor(centerPos.offset(Math.floor(baseSize / 2), 0, 0));

            // Add lighting
            await this.lightUpArea(centerPos, baseSize, baseSize);
            
            // Place chests for storage
            await this.placeStorageChests(centerPos);
            
            // Place crafting table
            await this.placeCraftingTable(centerPos.offset(-2, 0, -2));
            
            // Place furnace
            await this.placeFurnace(centerPos.offset(2, 0, -2));

            await this.notifier.notifyBaseExpansion('enhanced starter base');
            console.log('Enhanced starter base completed');
            return true;
        } catch (error) {
            console.error('Error building starter base:', error.message);
            return false;
        }
    }

    async buildRoof(centerPos, width, depth, material) {
        console.log(`Building roof with ${material}`);
        
        const block = await this.inventory.findItem(material);
        if (!block) {
            console.log(`No ${material} available for roof`);
            return false;
        }

        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        const roofHeight = 3; // Roof at height 3

        await this.bot.equip(block, 'hand');

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const targetPos = centerPos.offset(x, roofHeight, z);
                try {
                    await this.placeBlockAt(targetPos, material);
                    await this.sleep(100);
                } catch (error) {
                    // Continue if placement fails
                }
            }
        }

        return true;
    }

    async placeStorageChests(centerPos) {
        console.log('Placing storage chests');
        
        const chestPositions = [
            centerPos.offset(-3, 0, 3),
            centerPos.offset(-2, 0, 3),
            centerPos.offset(2, 0, 3),
            centerPos.offset(3, 0, 3)
        ];

        for (const pos of chestPositions) {
            await this.placeBlockAt(pos, 'chest');
            await this.sleep(300);
        }

        return true;
    }

    async placeCraftingTable(position) {
        console.log('Placing crafting table');
        await this.placeBlockAt(position, 'crafting_table');
        return true;
    }

    async placeFurnace(position) {
        console.log('Placing furnace');
        await this.placeBlockAt(position, 'furnace');
        return true;
    }

    async clearArea(centerPos, width, depth) {
        console.log(`Clearing area ${width}x${depth}`);
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                for (let y = 0; y < 4; y++) {
                    const block = this.bot.blockAt(centerPos.offset(x, y, z));
                    if (block && block.name !== 'air' && block.name !== 'bedrock') {
                        try {
                            await this.bot.dig(block);
                        } catch (error) {
                            // Continue if can't dig a block
                        }
                    }
                }
            }
        }
    }

    async buildFloor(centerPos, width, depth, material) {
        console.log(`Building floor with ${material}`);
        
        const block = await this.inventory.findItem(material);
        if (!block) {
            console.log(`No ${material} available for floor`);
            return false;
        }

        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        await this.bot.equip(block, 'hand');

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const targetPos = centerPos.offset(x, -1, z);
                const targetBlock = this.bot.blockAt(targetPos);
                
                if (targetBlock && targetBlock.name === 'air') {
                    try {
                        await this.placeBlockAt(targetPos, material);
                    } catch (error) {
                        // Continue if placement fails
                    }
                }
            }
        }

        return true;
    }

    async buildWalls(centerPos, width, depth, height, material) {
        console.log(`Building walls with ${material}`);
        
        const block = await this.inventory.findItem(material);
        if (!block) {
            console.log(`No ${material} available for walls`);
            return false;
        }

        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        await this.bot.equip(block, 'hand');

        // Build four walls
        for (let y = 0; y < height; y++) {
            // North and South walls
            for (let x = -halfWidth; x <= halfWidth; x++) {
                await this.placeBlockAt(centerPos.offset(x, y, -halfDepth), material);
                await this.placeBlockAt(centerPos.offset(x, y, halfDepth), material);
            }

            // East and West walls
            for (let z = -halfDepth; z <= halfDepth; z++) {
                await this.placeBlockAt(centerPos.offset(-halfWidth, y, z), material);
                await this.placeBlockAt(centerPos.offset(halfWidth, y, z), material);
            }
        }

        return true;
    }

    async placeBlockAt(position, materialName) {
        const material = await this.inventory.findItem(materialName);
        if (!material) return false;

        try {
            const targetBlock = this.bot.blockAt(position);
            if (!targetBlock || targetBlock.name !== 'air') {
                return false;
            }

            // Find a reference block to place against
            const referenceBlock = this.findReferenceBlock(position);
            if (!referenceBlock) return false;

            await this.bot.equip(material, 'hand');
            await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
            
            return true;
        } catch (error) {
            return false;
        }
    }

    findReferenceBlock(position) {
        const offsets = [
            new Vec3(0, -1, 0),
            new Vec3(0, 1, 0),
            new Vec3(1, 0, 0),
            new Vec3(-1, 0, 0),
            new Vec3(0, 0, 1),
            new Vec3(0, 0, -1)
        ];

        for (const offset of offsets) {
            const block = this.bot.blockAt(position.plus(offset));
            if (block && block.name !== 'air') {
                return block;
            }
        }

        return null;
    }

    async placeDoor(position) {
        const door = await this.inventory.findItem('door');
        if (!door) {
            console.log('No door available');
            return false;
        }

        try {
            await this.bot.equip(door, 'hand');
            const blockBelow = this.bot.blockAt(position.offset(0, -1, 0));
            if (blockBelow) {
                await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0));
                console.log('Door placed');
                return true;
            }
        } catch (error) {
            console.error('Error placing door:', error.message);
        }

        return false;
    }

    async lightUpArea(centerPos, width, depth) {
        console.log('Adding lighting to area');
        
        const torch = await this.inventory.findItem('torch');
        if (!torch) {
            console.log('No torches available');
            return false;
        }

        await this.bot.equip(torch, 'hand');

        // Place torches at regular intervals
        const spacing = 5;
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        for (let x = -halfWidth; x <= halfWidth; x += spacing) {
            for (let z = -halfDepth; z <= halfDepth; z += spacing) {
                const pos = centerPos.offset(x, 0, z);
                const blockBelow = this.bot.blockAt(pos.offset(0, -1, 0));
                
                if (blockBelow && blockBelow.name !== 'air') {
                    try {
                        await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0));
                        await this.sleep(200);
                    } catch (error) {
                        // Continue if placement fails
                    }
                }
            }
        }

        return true;
    }

    async buildFarm(centerPos, width, depth) {
        console.log('Building farm');
        
        try {
            // Create farmland
            await this.createFarmland(centerPos, width, depth);

            // Add water source
            await this.addWaterSource(centerPos);

            // Build fence around farm
            await this.buildFence(centerPos, width, depth);

            await this.notifier.notifyBaseExpansion('farm');
            console.log('Farm completed');
            return true;
        } catch (error) {
            console.error('Error building farm:', error.message);
            return false;
        }
    }

    async createFarmland(centerPos, width, depth) {
        const hoe = await this.inventory.findItem('hoe');
        if (!hoe) {
            console.log('No hoe available');
            return false;
        }

        await this.bot.equip(hoe, 'hand');

        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const targetPos = centerPos.offset(x, 0, z);
                const block = this.bot.blockAt(targetPos);
                
                if (block && (block.name === 'dirt' || block.name === 'grass_block')) {
                    try {
                        await this.bot.activateBlock(block);
                        await this.sleep(100);
                    } catch (error) {
                        // Continue
                    }
                }
            }
        }

        return true;
    }

    async addWaterSource(centerPos) {
        const bucket = await this.inventory.findItem('water_bucket');
        if (!bucket) {
            console.log('No water bucket available');
            return false;
        }

        try {
            await this.bot.equip(bucket, 'hand');
            const centerBlock = this.bot.blockAt(centerPos.offset(0, -1, 0));
            
            if (centerBlock) {
                await this.bot.placeBlock(centerBlock, new Vec3(0, 1, 0));
                console.log('Water source placed');
                return true;
            }
        } catch (error) {
            console.error('Error placing water:', error.message);
        }

        return false;
    }

    async buildFence(centerPos, width, depth) {
        const fence = await this.inventory.findItem('fence');
        if (!fence) {
            console.log('No fence available');
            return false;
        }

        // Build fence perimeter
        const halfWidth = Math.floor(width / 2) + 1;
        const halfDepth = Math.floor(depth / 2) + 1;

        await this.bot.equip(fence, 'hand');

        // Build fence around perimeter
        for (let x = -halfWidth; x <= halfWidth; x++) {
            await this.placeBlockAt(centerPos.offset(x, 0, -halfDepth), 'fence');
            await this.placeBlockAt(centerPos.offset(x, 0, halfDepth), 'fence');
        }

        for (let z = -halfDepth; z <= halfDepth; z++) {
            await this.placeBlockAt(centerPos.offset(-halfWidth, 0, z), 'fence');
            await this.placeBlockAt(centerPos.offset(halfWidth, 0, z), 'fence');
        }

        return true;
    }

    async buildStorageRoom(centerPos) {
        console.log('Building storage room');
        
        try {
            // Build small room
            await this.buildStarterBase(centerPos);

            // Place chests
            await this.placeChests(centerPos);

            await this.notifier.notifyBaseExpansion('storage room');
            console.log('Storage room completed');
            return true;
        } catch (error) {
            console.error('Error building storage room:', error.message);
            return false;
        }
    }

    async placeChests(centerPos) {
        const chest = await this.inventory.findItem('chest');
        if (!chest) {
            console.log('No chests available');
            return false;
        }

        await this.bot.equip(chest, 'hand');

        // Place several chests
        const chestPositions = [
            centerPos.offset(2, 0, 2),
            centerPos.offset(-2, 0, 2),
            centerPos.offset(2, 0, -2),
            centerPos.offset(-2, 0, -2)
        ];

        for (const pos of chestPositions) {
            await this.placeBlockAt(pos, 'chest');
            await this.sleep(300);
        }

        return true;
    }

    async placeBed(position) {
        console.log('Placing bed');
        
        const bed = await this.inventory.findItem('bed');
        if (!bed) {
            console.log('No bed available to place');
            return false;
        }

        try {
            await this.bot.equip(bed, 'hand');
            
            // Find a suitable spot to place the bed (on the ground)
            const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
            
            if (referenceBlock && referenceBlock.name !== 'air') {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                console.log('Placed bed at position');
                await this.notifier.send('Placed bed in base');
                return true;
            }
        } catch (error) {
            console.error('Error placing bed:', error.message);
        }

        return false;
    }

    async placeTorchesNearby() {
        console.log('Placing torches nearby for lighting');
        
        const torch = await this.inventory.findItem('torch');
        if (!torch) {
            console.log('No torches available');
            return false;
        }

        const botPos = this.bot.entity.position;
        const radius = 10;
        const spacing = 5;

        await this.bot.equip(torch, 'hand');

        // Place torches in a grid around the bot
        for (let x = -radius; x <= radius; x += spacing) {
            for (let z = -radius; z <= radius; z += spacing) {
                const pos = botPos.offset(x, 0, z);
                const blockBelow = this.bot.blockAt(pos.offset(0, -1, 0));
                
                if (blockBelow && blockBelow.name !== 'air') {
                    try {
                        await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0));
                        await this.sleep(200);
                    } catch (error) {
                        // Continue if placement fails
                    }
                }
            }
        }

        return true;
    }

    async continueCurrentProject() {
        console.log('Continuing current building project');
        
        // Check if we have a base position to work with
        const botPos = this.bot.entity.position;
        
        // For now, just perform basic maintenance tasks
        const torch = await this.inventory.findItem('torch');
        if (torch) {
            await this.placeTorchesNearby();
        }
        
        return true;
    }

    async buildStructure(structure) {
        console.log(`Building structure: ${structure}`);
        
        const botPos = this.bot.entity.position;
        
        // Build different structures based on the request
        switch (structure) {
            case 'base':
                await this.buildStarterBase(botPos);
                break;
            case 'farm':
                await this.buildFarm(botPos.offset(15, 0, 0), 9, 9);
                break;
            case 'storage':
                await this.buildStorageRoom(botPos.offset(-15, 0, 0));
                break;
            default:
                console.log(`Unknown structure type: ${structure}`);
                return false;
        }
        
        return true;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BuildingSystem;
