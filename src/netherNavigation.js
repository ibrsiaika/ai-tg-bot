const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Nether Navigation System
 * - Detects Nether biome environment
 * - Implements safe mining patterns (3-high tunnels)
 * - Manages lava bucket placement
 * - Scans for Nether-specific ores (ancient debris, quartz)
 * - Detects and maps Nether fortresses
 */
class NetherNavigation {
    constructor(bot, pathfinder, notifier, inventoryManager, safetyMonitor) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.safety = safetyMonitor;
        
        // Nether detection
        this.inNether = false;
        this.netherChecked = false;
        
        // Nether-specific blocks
        this.NETHER_BLOCKS = {
            common: ['netherrack', 'soul_sand', 'soul_soil', 'basalt', 'blackstone'],
            ores: ['nether_quartz_ore', 'nether_gold_ore', 'ancient_debris'],
            dangerous: ['lava', 'flowing_lava', 'magma_block', 'fire', 'soul_fire']
        };
        
        // Safe mining patterns
        this.TUNNEL_HEIGHT = 3;
        this.TUNNEL_WIDTH = 3;
        this.SAFE_MINING_DISTANCE = 2; // Distance to keep from lava
        
        // Fortress detection
        this.fortressLocations = [];
        this.FORTRESS_BLOCKS = ['nether_bricks', 'nether_brick_stairs', 'nether_brick_fence'];
        
        // Ancient debris locations
        this.ancientDebrisLocations = [];
        
        // Lava management
        this.lavaBuckets = 0;
    }
    
    /**
     * Detect if we're in the Nether
     */
    detectNetherBiome() {
        // Check blocks around the bot
        const pos = this.bot.entity.position;
        let netherBlockCount = 0;
        let totalChecked = 0;
        
        // Sample blocks in a radius
        for (let x = -5; x <= 5; x++) {
            for (let y = -2; y <= 2; y++) {
                for (let z = -5; z <= 5; z++) {
                    const checkPos = pos.offset(x, y, z);
                    const block = this.bot.blockAt(checkPos);
                    
                    if (block) {
                        totalChecked++;
                        if (this.NETHER_BLOCKS.common.includes(block.name)) {
                            netherBlockCount++;
                        }
                    }
                }
            }
        }
        
        // If more than 30% of blocks are Nether blocks, we're in the Nether
        const netherRatio = netherBlockCount / totalChecked;
        this.inNether = netherRatio > 0.3;
        this.netherChecked = true;
        
        if (this.inNether) {
            console.log(`🔥 Nether detected! (${(netherRatio * 100).toFixed(1)}% Nether blocks)`);
        }
        
        return this.inNether;
    }
    
    /**
     * Check if current environment is the Nether
     */
    isInNether() {
        if (!this.netherChecked) {
            return this.detectNetherBiome();
        }
        return this.inNether;
    }
    
    /**
     * Scan for Nether-specific ores
     */
    scanForNetherOres(radius = 32) {
        if (!this.isInNether()) {
            return [];
        }
        
        const ores = [];
        
        for (const oreType of this.NETHER_BLOCKS.ores) {
            const ore = this.bot.findBlock({
                matching: block => block.name === oreType,
                maxDistance: radius
            });
            
            if (ore) {
                ores.push({
                    type: oreType,
                    position: ore.position.clone(),
                    distance: this.bot.entity.position.distanceTo(ore.position)
                });
                
                // Track ancient debris specifically
                if (oreType === 'ancient_debris') {
                    this.ancientDebrisLocations.push({
                        position: ore.position.clone(),
                        found: Date.now()
                    });
                    console.log(`💎 Ancient debris found at ${ore.position.toString()}!`);
                }
            }
        }
        
        return ores;
    }
    
    /**
     * Check if position is safe from lava
     */
    isSafeFromLava(position) {
        // Check surrounding blocks for lava
        for (let x = -this.SAFE_MINING_DISTANCE; x <= this.SAFE_MINING_DISTANCE; x++) {
            for (let y = -this.SAFE_MINING_DISTANCE; y <= this.SAFE_MINING_DISTANCE; y++) {
                for (let z = -this.SAFE_MINING_DISTANCE; z <= this.SAFE_MINING_DISTANCE; z++) {
                    const checkPos = position.offset(x, y, z);
                    const block = this.bot.blockAt(checkPos);
                    
                    if (block && this.NETHER_BLOCKS.dangerous.includes(block.name)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    /**
     * Dig a safe 3-high tunnel in the Nether
     */
    async digSafeTunnel(direction, length) {
        if (!this.isInNether()) {
            console.log('Not in Nether, skipping Nether tunnel digging');
            return false;
        }
        
        console.log(`Digging ${this.TUNNEL_HEIGHT}-high Nether tunnel (${direction}, length: ${length})`);
        await this.notifier.send(`🔥 Digging safe Nether tunnel`);
        
        // Equip pickaxe
        await this.inventory.equipBestTool('pickaxe');
        
        const startPos = this.bot.entity.position.clone();
        const directionVec = this.getDirectionVector(direction);
        
        for (let i = 0; i < length; i++) {
            // Check for lava before proceeding
            const nextPos = startPos.offset(
                directionVec.x * i,
                0,
                directionVec.z * i
            );
            
            if (!this.isSafeFromLava(nextPos)) {
                console.log('Lava detected ahead, stopping tunnel');
                await this.notifier.send('⚠️ Lava detected, stopping tunnel dig');
                return false;
            }
            
            // Dig 3-high section
            for (let y = 0; y < this.TUNNEL_HEIGHT; y++) {
                const digPos = nextPos.offset(0, y, 0);
                const block = this.bot.blockAt(digPos);
                
                if (block && block.name !== 'air' && !this.NETHER_BLOCKS.dangerous.includes(block.name)) {
                    try {
                        // Check again for lava behind block
                        await this.bot.dig(block);
                        await this.sleep(100);
                        
                        // After digging, check if lava flows in
                        await this.sleep(500);
                        const newBlock = this.bot.blockAt(digPos);
                        if (newBlock && this.NETHER_BLOCKS.dangerous.includes(newBlock.name)) {
                            console.log('Lava flowing in! Retreating');
                            await this.placeObsidianBarrier(digPos);
                            return false;
                        }
                    } catch (error) {
                        console.error('Error digging Nether block:', error.message);
                    }
                }
            }
            
            // Move forward
            try {
                await this.bot.pathfinder.goto(new goals.GoalBlock(
                    nextPos.x,
                    nextPos.y,
                    nextPos.z
                ));
            } catch (error) {
                console.error('Error moving in Nether tunnel:', error.message);
                return false;
            }
            
            // Place torch every 8 blocks
            if (i % 8 === 0) {
                await this.placeTorch();
            }
            
            // Scan for ores while tunneling
            const ores = this.scanForNetherOres(8);
            if (ores.length > 0) {
                console.log(`Found ${ores.length} Nether ore(s) nearby`);
            }
        }
        
        console.log('Nether tunnel completed');
        return true;
    }
    
    /**
     * Get direction vector from string
     */
    getDirectionVector(direction) {
        const vectors = {
            'north': { x: 0, z: -1 },
            'south': { x: 0, z: 1 },
            'east': { x: 1, z: 0 },
            'west': { x: -1, z: 0 }
        };
        return vectors[direction] || vectors['north'];
    }
    
    /**
     * Place obsidian barrier to block lava
     */
    async placeObsidianBarrier(position) {
        console.log('Placing obsidian barrier');
        
        const obsidian = this.bot.inventory.items().find(item => item.name === 'obsidian');
        if (obsidian) {
            try {
                await this.bot.equip(obsidian, 'hand');
                
                const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
                if (referenceBlock) {
                    await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                }
            } catch (error) {
                console.error('Error placing obsidian:', error.message);
            }
        }
    }
    
    /**
     * Place torch
     */
    async placeTorch() {
        const torch = this.bot.inventory.items().find(item => item.name === 'torch');
        if (torch) {
            try {
                await this.bot.equip(torch, 'hand');
                const pos = this.bot.entity.position;
                const referenceBlock = this.bot.blockAt(pos.offset(1, 0, 0)) || 
                                      this.bot.blockAt(pos.offset(-1, 0, 0)) ||
                                      this.bot.blockAt(pos.offset(0, 0, 1)) ||
                                      this.bot.blockAt(pos.offset(0, 0, -1));
                
                if (referenceBlock && referenceBlock.name !== 'air') {
                    await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                }
            } catch (error) {
                // Silently fail if can't place torch
            }
        }
    }
    
    /**
     * Mine ancient debris using 3x3 pattern (most efficient)
     */
    async mineAncientDebris() {
        if (!this.isInNether()) {
            return false;
        }
        
        console.log('Starting ancient debris mining (3x3 pattern)');
        await this.notifier.send('💎 Mining for ancient debris');
        
        // Equip pickaxe (needs diamond or better)
        await this.inventory.equipBestTool('pickaxe');
        
        // Find ancient debris
        const debris = this.bot.findBlock({
            matching: block => block.name === 'ancient_debris',
            maxDistance: 32
        });
        
        if (!debris) {
            console.log('No ancient debris found nearby');
            return false;
        }
        
        console.log(`Found ancient debris at ${debris.position.toString()}`);
        
        try {
            // Navigate near debris
            await this.bot.pathfinder.goto(new goals.GoalNear(
                debris.position.x,
                debris.position.y,
                debris.position.z,
                2
            ));
            
            // Mine in 3x3 pattern around debris
            const centerPos = debris.position;
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const minePos = centerPos.offset(x, y, z);
                        const block = this.bot.blockAt(minePos);
                        
                        if (block && block.name !== 'air' && 
                            !this.NETHER_BLOCKS.dangerous.includes(block.name)) {
                            try {
                                await this.bot.dig(block);
                                await this.sleep(200);
                            } catch (error) {
                                // Continue mining
                            }
                        }
                    }
                }
            }
            
            await this.notifier.send('✓ Ancient debris mined');
            return true;
        } catch (error) {
            console.error('Error mining ancient debris:', error.message);
            return false;
        }
    }
    
    /**
     * Detect Nether fortress
     */
    detectNetherFortress() {
        if (!this.isInNether()) {
            return null;
        }
        
        // Look for Nether brick blocks
        const fortressBlock = this.bot.findBlock({
            matching: block => this.FORTRESS_BLOCKS.includes(block.name),
            maxDistance: 64
        });
        
        if (fortressBlock) {
            const location = fortressBlock.position.clone();
            
            // Check if we already know about this fortress
            const alreadyFound = this.fortressLocations.some(
                f => f.distanceTo(location) < 50
            );
            
            if (!alreadyFound) {
                this.fortressLocations.push(location);
                console.log(`🏰 Nether fortress detected at ${location.toString()}`);
                this.notifier.send(`🏰 Nether fortress found at ${location.toString()}`);
                return location;
            }
        }
        
        return null;
    }
    
    /**
     * Manage lava buckets
     */
    async manageLavaBucket() {
        // Count lava buckets
        const buckets = this.bot.inventory.items().filter(item => 
            item.name === 'lava_bucket'
        );
        this.lavaBuckets = buckets.reduce((sum, item) => sum + item.count, 0);
        
        console.log(`Lava buckets: ${this.lavaBuckets}`);
        return this.lavaBuckets;
    }
    
    /**
     * Place lava bucket strategically
     */
    async placeLavaBucket(position) {
        const lavaBucket = this.bot.inventory.items().find(item => 
            item.name === 'lava_bucket'
        );
        
        if (!lavaBucket) {
            console.log('No lava bucket available');
            return false;
        }
        
        try {
            await this.bot.equip(lavaBucket, 'hand');
            const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
            
            if (referenceBlock && referenceBlock.name !== 'air') {
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                console.log('Lava bucket placed');
                this.lavaBuckets--;
                return true;
            }
        } catch (error) {
            console.error('Error placing lava bucket:', error.message);
        }
        
        return false;
    }
    
    /**
     * Generate Nether navigation report
     */
    generateReport() {
        let report = `\n=== Nether Navigation Report ===\n`;
        report += `In Nether: ${this.inNether ? 'Yes 🔥' : 'No'}\n`;
        
        if (this.inNether) {
            report += `Fortresses Found: ${this.fortressLocations.length}\n`;
            report += `Ancient Debris Locations: ${this.ancientDebrisLocations.length}\n`;
            report += `Lava Buckets: ${this.lavaBuckets}\n`;
            
            if (this.fortressLocations.length > 0) {
                report += `\nFortress Locations:\n`;
                this.fortressLocations.slice(0, 3).forEach((loc, i) => {
                    report += `  ${i + 1}. ${loc.toString()}\n`;
                });
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
            inNether: this.inNether,
            fortressesFound: this.fortressLocations.length,
            ancientDebrisFound: this.ancientDebrisLocations.length,
            lavaBuckets: this.lavaBuckets
        };
    }
}

module.exports = NetherNavigation;
