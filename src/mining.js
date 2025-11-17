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

    async descendToDepth(targetY) {
        const currentY = this.bot.entity.position.y;
        
        if (currentY <= targetY) {
            return; // Already at or below target depth
        }

        console.log(`Descending from Y=${currentY} to Y=${targetY}`);
        
        // Dig down carefully
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
        
        for (const block of veinBlocks) {
            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(block.position.x, block.position.y, block.position.z));
                await this.bot.dig(block);
                await this.sleep(200);
            } catch (error) {
                console.error('Error mining vein block:', error.message);
            }
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

        console.log('Returning home');
        
        try {
            await this.bot.pathfinder.goto(new goals.GoalBlock(
                this.homePosition.x,
                this.homePosition.y,
                this.homePosition.z
            ));
            
            await this.notifier.notifyStatus('Returned home');
            console.log('Arrived at home');
            return true;
        } catch (error) {
            console.error('Error returning home:', error.message);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MiningSystem;
