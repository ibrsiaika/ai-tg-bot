const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class MiningSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, safetyMonitor) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.safety = safetyMonitor;
        this.homePosition = null;
    }

    setHome(position) {
        this.homePosition = position;
        console.log(`Home set to: ${position.x}, ${position.y}, ${position.z}`);
    }

    async branchMine(depth = 12, length = 50) {
        console.log(`Starting branch mine at depth Y=${depth}`);
        
        // Check for water bucket before deep mining
        const hasWaterBucket = await this.checkWaterBucket();
        if (!hasWaterBucket && depth < 20) {
            console.log('⚠️ Mining at Y=' + depth + ' without water bucket - lava risk!');
        }
        
        try {
            // Go to mining depth
            const startPos = this.bot.entity.position;
            await this.descendToDepth(depth);

            await this.inventory.equipBestTool('pickaxe');

            // Create main tunnel
            await this.digTunnel(length, 'forward');

            // Create side branches
            const branchSpacing = 3;
            for (let i = 0; i < length; i += branchSpacing) {
                if (i % 2 === 0) {
                    await this.digTunnel(10, 'left');
                    await this.returnToMainTunnel();
                } else {
                    await this.digTunnel(10, 'right');
                    await this.returnToMainTunnel();
                }

                // Check inventory
                if (this.inventory.isInventoryFull()) {
                    await this.notifier.notifyInventoryFull();
                    await this.returnHome();
                    return;
                }

                // Place torches periodically
                if (i % 8 === 0) {
                    await this.placeTorch();
                }
            }

            await this.notifier.notifyStatus('Mining expedition completed');
            console.log('Branch mining completed');
        } catch (error) {
            console.error('Error during branch mining:', error.message);
        }
    }

    async descendToDepth(targetY, useStairs = true) {
        const currentY = this.bot.entity.position.y;
        
        if (currentY <= targetY) {
            return; // Already at or below target depth
        }

        console.log(`Descending from Y=${currentY} to Y=${targetY}${useStairs ? ' (using stairs)' : ''}`);
        
        if (useStairs) {
            // Create a staircase for easy return
            await this.digStaircaseDown(targetY);
        } else {
            // Dig down carefully (old method)
            while (this.bot.entity.position.y > targetY) {
                const blockBelow = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0));
                const blockBelow2 = this.bot.blockAt(this.bot.entity.position.offset(0, -2, 0));
                
                // Safety check for lava
                if (blockBelow2 && (blockBelow2.name === 'lava' || blockBelow2.name === 'flowing_lava')) {
                    console.log('Lava detected below, stopping descent');
                    return;
                }

                if (blockBelow && blockBelow.name !== 'air') {
                    await this.bot.dig(blockBelow);
                }

                // Move down
                await this.bot.pathfinder.goto(new goals.GoalBlock(
                    this.bot.entity.position.x,
                    this.bot.entity.position.y - 1,
                    this.bot.entity.position.z
                ));

                await this.sleep(200);
            }
        }
    }

    async digStaircaseDown(targetY) {
        console.log('Creating staircase for easy return');
        
        const startPos = this.bot.entity.position.clone();
        await this.inventory.equipBestTool('pickaxe');
        
        // Dig stairs in a spiral pattern (safer and easier to navigate)
        let currentY = Math.floor(this.bot.entity.position.y);
        let direction = 0; // 0: north, 1: east, 2: south, 3: west
        const directions = [
            new Vec3(0, 0, -1),  // north
            new Vec3(1, 0, 0),   // east
            new Vec3(0, 0, 1),   // south
            new Vec3(-1, 0, 0)   // west
        ];
        
        while (currentY > targetY) {
            const dir = directions[direction % 4];
            const nextPos = this.bot.entity.position.offset(dir.x, -1, dir.z);
            
            // Dig the block ahead and below (stair step)
            const blockAhead = this.bot.blockAt(this.bot.entity.position.offset(dir.x, 0, dir.z));
            const blockBelowAhead = this.bot.blockAt(nextPos);
            const blockAboveAhead = this.bot.blockAt(this.bot.entity.position.offset(dir.x, 1, dir.z));
            
            // Safety check for lava
            const blockBelow2 = this.bot.blockAt(this.bot.entity.position.offset(dir.x, -2, dir.z));
            if (blockBelow2 && (blockBelow2.name === 'lava' || blockBelow2.name === 'flowing_lava')) {
                console.log('Lava detected, changing direction');
                direction++;
                continue;
            }
            
            // Dig blocks to create 2-block high passage
            if (blockAhead && blockAhead.name !== 'air' && blockAhead.name !== 'bedrock') {
                try {
                    await this.bot.dig(blockAhead);
                    await this.sleep(100);
                } catch (error) {
                    // Continue if can't dig
                }
            }
            
            if (blockAboveAhead && blockAboveAhead.name !== 'air' && blockAboveAhead.name !== 'bedrock') {
                try {
                    await this.bot.dig(blockAboveAhead);
                    await this.sleep(100);
                } catch (error) {
                    // Continue if can't dig
                }
            }
            
            if (blockBelowAhead && blockBelowAhead.name !== 'air' && blockBelowAhead.name !== 'bedrock') {
                try {
                    await this.bot.dig(blockBelowAhead);
                    await this.sleep(100);
                } catch (error) {
                    // Continue if can't dig
                }
            }
            
            // Move to next position
            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(
                    nextPos.x,
                    nextPos.y,
                    nextPos.z
                ));
            } catch (error) {
                console.log('Pathfinding issue, adjusting direction');
                direction++;
                continue;
            }
            
            currentY = Math.floor(this.bot.entity.position.y);
            
            // Place torch every 8 blocks for visibility
            if (currentY % 8 === 0) {
                await this.placeTorch();
            }
            
            // Rotate direction every 4 steps for spiral
            if (currentY % 4 === 0) {
                direction++;
            }
        }
        
        console.log('Staircase completed - easy return path available');
    }

    async digTunnel(length, direction) {
        console.log(`Digging tunnel: ${length} blocks ${direction}`);
        
        const directionVectors = {
            forward: new Vec3(0, 0, 1),
            back: new Vec3(0, 0, -1),
            left: new Vec3(-1, 0, 0),
            right: new Vec3(1, 0, 0)
        };

        const dir = directionVectors[direction] || directionVectors.forward;

        for (let i = 0; i < length; i++) {
            // Dig 2 blocks high tunnel
            const pos = this.bot.entity.position;
            const frontBlock = this.bot.blockAt(pos.offset(dir.x, 0, dir.z));
            const frontBlockAbove = this.bot.blockAt(pos.offset(dir.x, 1, dir.z));

            // Check for valuable ores
            if (frontBlock && this.isValuableOre(frontBlock)) {
                await this.mineOreVein(frontBlock);
            }

            if (frontBlock && frontBlock.name !== 'air') {
                await this.bot.dig(frontBlock);
            }
            
            if (frontBlockAbove && frontBlockAbove.name !== 'air') {
                await this.bot.dig(frontBlockAbove);
            }

            // Move forward
            await this.bot.pathfinder.goto(new goals.GoalBlock(
                pos.x + dir.x,
                pos.y,
                pos.z + dir.z
            ));

            await this.sleep(100);

            // Check for safety issues
            if (!this.safety.isSafe()) {
                console.log('Safety issue detected, stopping tunnel');
                break;
            }
        }
    }

    async mineOreVein(oreBlock) {
        const oreName = oreBlock.name.replace('_ore', '').replace('deepslate_', '');
        console.log(`Found ${oreName} ore vein!`);
        
        await this.notifier.notifyMining(oreName, oreBlock.position.y);

        // Mine the entire vein
        const veinBlocks = this.findOreVein(oreBlock);
        const veinCenter = oreBlock.position.clone(); // For item collection
        
        for (const block of veinBlocks) {
            try {
                // Check inventory before mining each block
                if (this.inventory.isInventoryFull()) {
                    console.log('Inventory full during vein mining, collecting drops first');
                    await this.collectVeinDrops(veinCenter);
                    
                    // If still full, manage inventory
                    if (this.inventory.isInventoryFull()) {
                        await this.inventory.tossJunk();
                    }
                }

                // Add timeout handling for pathfinder
                try {
                    await this.bot.pathfinder.goto(new goals.GoalBlock(block.position.x, block.position.y, block.position.z));
                } catch (pathError) {
                    // If pathfinding fails with timeout, try a less strict goal
                    if (pathError.message?.includes('Took too long') || pathError.message?.includes('timeout')) {
                        console.log(`Pathfinding timeout for vein block, trying alternative approach`);
                        await this.bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 3));
                    } else {
                        // Skip this block if pathfinding fails for other reasons
                        console.error('Skipping vein block due to pathfinding error:', pathError.message);
                        continue;
                    }
                }
                
                await this.bot.dig(block);
                await this.sleep(200);
            } catch (error) {
                console.error('Error mining vein block:', error.message);
            }
        }
        
        // Collect all drops from vein after mining
        await this.collectVeinDrops(veinCenter);
        console.log(`Completed mining ${oreName} vein and collected drops`);
    }

    async collectVeinDrops(position) {
        console.log('Collecting ore vein drops');
        
        await this.sleep(1000);
        
        try {
            // Find all nearby items
            const droppedItems = Object.values(this.bot.entities).filter(entity =>
                entity.type === 'object' &&
                entity.objectType === 'Item' &&
                entity.position.distanceTo(position) < 10
            );

            if (droppedItems.length === 0) {
                return;
            }

            console.log(`Found ${droppedItems.length} dropped items from vein`);

            if (this.bot.collectBlock) {
                for (const item of droppedItems) {
                    try {
                        if (this.inventory.isInventoryFull()) {
                            console.log('Inventory full, stopping collection');
                            break;
                        }
                        
                        await this.bot.collectBlock.collect(item);
                        await this.sleep(100);
                    } catch (collectError) {
                        // Continue to next item
                    }
                }
            } else {
                // Fallback: navigate to items
                for (const item of droppedItems) {
                    if (this.inventory.isInventoryFull()) {
                        break;
                    }
                    
                    try {
                        await this.bot.pathfinder.goto(new goals.GoalNear(
                            Math.floor(item.position.x),
                            Math.floor(item.position.y),
                            Math.floor(item.position.z),
                            1
                        ));
                        await this.sleep(300);
                    } catch (error) {
                        // Continue to next item
                    }
                }
            }
        } catch (error) {
            console.error('Error collecting vein drops:', error.message);
        }
    }

    findOreVein(oreBlock) {
        const vein = [oreBlock];
        const checked = new Set();
        const toCheck = [oreBlock];

        while (toCheck.length > 0) {
            const current = toCheck.pop();
            const key = `${current.position.x},${current.position.y},${current.position.z}`;
            
            if (checked.has(key)) continue;
            checked.add(key);

            // Check adjacent blocks
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const neighbor = this.bot.blockAt(current.position.offset(x, y, z));
                        if (neighbor && neighbor.name === oreBlock.name) {
                            const neighborKey = `${neighbor.position.x},${neighbor.position.y},${neighbor.position.z}`;
                            if (!checked.has(neighborKey)) {
                                toCheck.push(neighbor);
                                vein.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        return vein;
    }

    isValuableOre(block) {
        const valuableOres = [
            'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 
            'emerald_ore', 'lapis_ore', 'redstone_ore',
            'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_gold_ore',
            'deepslate_diamond_ore', 'deepslate_emerald_ore', 'deepslate_lapis_ore',
            'deepslate_redstone_ore', 'copper_ore', 'deepslate_copper_ore'
        ];

        return valuableOres.includes(block.name);
    }

    async placeTorch() {
        const torch = await this.inventory.findItem('torch');
        if (!torch) {
            return false;
        }

        try {
            const pos = this.bot.entity.position;
            const blockBelow = this.bot.blockAt(pos.offset(0, -1, 0));
            
            if (blockBelow && blockBelow.name !== 'air') {
                await this.bot.equip(torch, 'hand');
                await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0));
                console.log('Placed torch');
                return true;
            }
        } catch (error) {
            console.error('Error placing torch:', error.message);
        }
        
        return false;
    }

    async returnToMainTunnel() {
        // Simple backtrack - in production, would track positions
        console.log('Returning to main tunnel');
    }

    async returnHome() {
        if (!this.homePosition) {
            console.log('No home position set');
            return false;
        }

        console.log(`Returning home to ${this.homePosition.x}, ${this.homePosition.y}, ${this.homePosition.z}`);
        
        try {
            // Use GoalNear for more reliable pathfinding
            await this.bot.pathfinder.goto(new goals.GoalNear(
                this.homePosition.x,
                this.homePosition.y,
                this.homePosition.z,
                5  // Within 5 blocks is close enough
            ));
            
            await this.notifier.notifyStatus('Returned home');
            console.log('Arrived at home');
            return true;
        } catch (error) {
            console.error('Error returning home:', error.message);
            
            // Try ascending to surface first if stuck underground
            if (this.bot.entity.position.y < this.homePosition.y - 10) {
                console.log('Attempting to reach surface first');
                try {
                    await this.ascendToSurface();
                    // Try again after reaching surface
                    await this.bot.pathfinder.goto(new goals.GoalNear(
                        this.homePosition.x,
                        this.homePosition.y,
                        this.homePosition.z,
                        5
                    ));
                    await this.notifier.notifyStatus('Returned home (via surface)');
                    return true;
                } catch (surfaceError) {
                    console.error('Failed to return home even via surface:', surfaceError.message);
                }
            }
            
            return false;
        }
    }

    async ascendToSurface() {
        console.log('Ascending to surface');
        
        const surfaceY = Math.max(this.homePosition.y, 70); // Assume surface is at least Y=70
        
        while (this.bot.entity.position.y < surfaceY) {
            // Look for existing staircase or create one
            const blockAbove = this.bot.blockAt(this.bot.entity.position.offset(0, 1, 0));
            const blockAbove2 = this.bot.blockAt(this.bot.entity.position.offset(0, 2, 0));
            
            if (blockAbove && blockAbove.name !== 'air' && blockAbove.name !== 'bedrock') {
                await this.bot.dig(blockAbove);
                await this.sleep(100);
            }
            
            if (blockAbove2 && blockAbove2.name !== 'air' && blockAbove2.name !== 'bedrock') {
                await this.bot.dig(blockAbove2);
                await this.sleep(100);
            }
            
            // Try to jump/climb up
            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(
                    this.bot.entity.position.x,
                    this.bot.entity.position.y + 1,
                    this.bot.entity.position.z
                ));
            } catch (error) {
                // Try moving diagonally up
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    this.bot.entity.position.x,
                    this.bot.entity.position.y + 2,
                    this.bot.entity.position.z,
                    2
                ));
            }
            
            await this.sleep(200);
            
            // Safety check - don't get stuck in infinite loop
            if (this.bot.entity.position.y > 256) {
                break;
            }
        }
        
        console.log('Reached surface');
    }
    
    /**
     * Checks if the bot has a water bucket for lava safety
     * Returns true if water bucket is available
     */
    async checkWaterBucket() {
        const waterBucket = await this.inventory.findItem('water_bucket');
        if (waterBucket) {
            console.log('✓ Water bucket available for lava safety');
            return true;
        }
        
        // Check if we have an empty bucket to fill
        const emptyBucket = await this.inventory.findItem('bucket');
        if (emptyBucket) {
            console.log('Empty bucket available - could fill with water before mining');
            // TODO: Could add auto-fill logic here
        }
        
        return false;
    }

    /**
     * Mine at a specific depth level
     * @param {number} depth - Y coordinate to mine at (default: 12)
     */
    async mineAtDepth(depth = 12) {
        console.log(`Mining at depth Y=${depth}`);
        await this.branchMine(depth, 50);
    }

    /**
     * Continue current mining operation
     * Resumes or continues branch mining at current location
     */
    async continueMining() {
        console.log('Continuing mining operation');
        const currentDepth = Math.floor(this.bot.entity.position.y);
        await this.branchMine(currentDepth, 30);
    }

    /**
     * Mine a specific ore/resource
     * @param {string} resource - Name of the resource to mine (e.g., 'diamond', 'iron')
     */
    async mineOre(resource) {
        console.log(`Mining for ${resource}`);
        
        // Find the ore block nearby
        const oreBlock = this.bot.findBlock({
            matching: (block) => {
                const oreName = resource.toLowerCase();
                return block.name.includes(oreName) && block.name.includes('ore');
            },
            maxDistance: 32
        });

        if (oreBlock) {
            console.log(`Found ${resource} ore at ${oreBlock.position}`);
            await this.mineOreVein(oreBlock);
        } else {
            console.log(`No ${resource} ore found nearby, starting exploration mining`);
            // Default to branch mining to find the ore
            await this.branchMine(12, 50);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MiningSystem;
