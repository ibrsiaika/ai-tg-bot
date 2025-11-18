const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Advanced Farm Expansion System
 * - Auto-creates large farms (50+ blocks)
 * - Implements water channel systems
 * - Automatic crop harvesting routes
 * - Tracks crop growth cycles
 * - Supports multiple crop types
 */
class AdvancedFarmSystem {
    constructor(bot, pathfinder, notifier, inventoryManager, buildingSystem) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.building = buildingSystem;
        
        // Farm tracking
        this.farms = []; // Array of farm objects
        this.cropGrowthTracking = new Map(); // position -> {crop, planted, stage}
        
        // Farm configuration
        this.DEFAULT_FARM_SIZE = 50; // 50+ blocks as specified
        this.WATER_SPACING = 8; // Place water every 8 blocks (optimal for crops)
        this.CROP_TYPES = ['wheat', 'potato', 'carrot', 'beetroot'];
        
        // Growth stages (wheat has 8, others have 8 as well in newer versions)
        this.GROWTH_STAGES = {
            'wheat': 7, // 0-7, 7 is fully grown
            'carrots': 7,
            'potatoes': 7,
            'beetroots': 3
        };
        
        // Harvesting routes
        this.harvestingRoutes = new Map(); // farmId -> route waypoints
    }
    
    /**
     * Create a large automated farm
     */
    async createLargeFarm(centerPos, size = this.DEFAULT_FARM_SIZE, cropType = 'wheat') {
        console.log(`Creating ${size}x${size} ${cropType} farm at ${centerPos.toString()}`);
        await this.notifier.send(`🌾 Building large ${cropType} farm (${size}x${size})`);
        
        const farmId = `farm_${Date.now()}`;
        const farm = {
            id: farmId,
            center: centerPos.clone(),
            size: size,
            cropType: cropType,
            created: Date.now(),
            plots: []
        };
        
        try {
            // Step 1: Clear and level the area
            await this.clearArea(centerPos, size);
            
            // Step 2: Till the soil
            await this.tillSoil(centerPos, size);
            
            // Step 3: Create water channels
            await this.createWaterChannels(centerPos, size);
            
            // Step 4: Plant crops
            await this.plantCrops(centerPos, size, cropType);
            
            // Step 5: Create harvesting route
            this.generateHarvestingRoute(farmId, centerPos, size);
            
            // Step 6: Add fence around farm (optional)
            await this.fenceFarm(centerPos, size);
            
            // Save farm
            this.farms.push(farm);
            
            await this.notifier.send(`✅ Large ${cropType} farm completed (${size}x${size})`);
            console.log(`Farm ${farmId} created successfully`);
            
            return farmId;
        } catch (error) {
            console.error('Error creating farm:', error.message);
            return null;
        }
    }
    
    /**
     * Clear and level area for farm
     */
    async clearArea(centerPos, size) {
        console.log('Clearing farm area');
        
        const halfSize = Math.floor(size / 2);
        const startX = centerPos.x - halfSize;
        const startZ = centerPos.z - halfSize;
        const y = centerPos.y;
        
        // Clear vegetation and level ground
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const pos = new Vec3(startX + x, y, startZ + z);
                
                // Clear blocks above
                for (let dy = 1; dy <= 3; dy++) {
                    const clearPos = pos.offset(0, dy, 0);
                    const block = this.bot.blockAt(clearPos);
                    
                    if (block && block.name !== 'air') {
                        try {
                            await this.bot.dig(block);
                        } catch (error) {
                            // Continue if can't dig
                        }
                    }
                }
            }
        }
        
        console.log('Area cleared');
    }
    
    /**
     * Till soil for farming
     */
    async tillSoil(centerPos, size) {
        console.log('Tilling soil');
        
        // Equip hoe
        const hoe = this.bot.inventory.items().find(item => 
            item.name.includes('hoe')
        );
        
        if (!hoe) {
            console.log('No hoe available, crafting one');
            // Craft hoe if needed (assuming crafting system is available)
            // await this.crafting.craftItem('wooden_hoe', 1);
        }
        
        const halfSize = Math.floor(size / 2);
        const startX = centerPos.x - halfSize;
        const startZ = centerPos.z - halfSize;
        const y = centerPos.y;
        
        // Till each block
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const pos = new Vec3(startX + x, y, startZ + z);
                
                // Skip water channel positions
                if (this.isWaterChannelPosition(x, z, size)) {
                    continue;
                }
                
                const block = this.bot.blockAt(pos);
                
                if (block && (block.name === 'grass_block' || block.name === 'dirt')) {
                    try {
                        if (hoe) {
                            await this.bot.equip(hoe, 'hand');
                        }
                        await this.bot.activateBlock(block);
                        await this.sleep(50);
                    } catch (error) {
                        // Continue if can't till
                    }
                }
            }
        }
        
        console.log('Soil tilled');
    }
    
    /**
     * Check if position should be a water channel
     */
    isWaterChannelPosition(x, z, size) {
        // Create water channels every WATER_SPACING blocks
        return (x % this.WATER_SPACING === 0) || (z % this.WATER_SPACING === 0);
    }
    
    /**
     * Create water channel system
     */
    async createWaterChannels(centerPos, size) {
        console.log('Creating water channels');
        
        const halfSize = Math.floor(size / 2);
        const startX = centerPos.x - halfSize;
        const startZ = centerPos.z - halfSize;
        const y = centerPos.y;
        
        // Dig trenches for water
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (!this.isWaterChannelPosition(x, z, size)) {
                    continue;
                }
                
                const pos = new Vec3(startX + x, y, startZ + z);
                const block = this.bot.blockAt(pos);
                
                if (block && block.name !== 'water') {
                    try {
                        await this.bot.dig(block);
                        await this.sleep(50);
                    } catch (error) {
                        // Continue
                    }
                }
            }
        }
        
        // Place water buckets
        const waterBucket = this.bot.inventory.items().find(item => 
            item.name === 'water_bucket'
        );
        
        if (waterBucket) {
            console.log('Placing water in channels');
            
            // Place water every WATER_SPACING blocks
            for (let x = 0; x < size; x += this.WATER_SPACING) {
                for (let z = 0; z < size; z += this.WATER_SPACING) {
                    const pos = new Vec3(startX + x, y, startZ + z);
                    
                    try {
                        await this.bot.equip(waterBucket, 'hand');
                        const referenceBlock = this.bot.blockAt(pos.offset(0, -1, 0));
                        if (referenceBlock) {
                            await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                        }
                    } catch (error) {
                        // Continue
                    }
                }
            }
        }
        
        console.log('Water channels created');
    }
    
    /**
     * Plant crops in tilled soil
     */
    async plantCrops(centerPos, size, cropType) {
        console.log(`Planting ${cropType}`);
        
        const seeds = this.bot.inventory.items().find(item => 
            this.getCropSeeds(cropType).includes(item.name)
        );
        
        if (!seeds) {
            console.log(`No ${cropType} seeds available`);
            return;
        }
        
        const halfSize = Math.floor(size / 2);
        const startX = centerPos.x - halfSize;
        const startZ = centerPos.z - halfSize;
        const y = centerPos.y;
        
        let planted = 0;
        
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                // Skip water channels
                if (this.isWaterChannelPosition(x, z, size)) {
                    continue;
                }
                
                const pos = new Vec3(startX + x, y, startZ + z);
                const block = this.bot.blockAt(pos);
                
                if (block && block.name === 'farmland') {
                    try {
                        await this.bot.equip(seeds, 'hand');
                        await this.bot.placeBlock(block, new Vec3(0, 1, 0));
                        
                        // Track planted crop
                        this.trackCropGrowth(pos.offset(0, 1, 0), cropType);
                        
                        planted++;
                        await this.sleep(50);
                    } catch (error) {
                        // Continue if can't plant
                    }
                }
            }
        }
        
        console.log(`Planted ${planted} ${cropType} crops`);
    }
    
    /**
     * Get seeds for crop type
     */
    getCropSeeds(cropType) {
        const seedMap = {
            'wheat': ['wheat_seeds'],
            'potato': ['potato'],
            'carrot': ['carrot'],
            'beetroot': ['beetroot_seeds']
        };
        return seedMap[cropType] || [];
    }
    
    /**
     * Track crop growth
     */
    trackCropGrowth(position, cropType) {
        const key = `${position.x},${position.y},${position.z}`;
        this.cropGrowthTracking.set(key, {
            crop: cropType,
            planted: Date.now(),
            position: position.clone(),
            stage: 0
        });
    }
    
    /**
     * Check crop growth stage
     */
    getCropGrowthStage(position) {
        const block = this.bot.blockAt(position);
        if (!block) return -1;
        
        // Check block metadata/age for growth stage
        // Note: This requires checking block.getProperties() in newer versions
        try {
            if (block.metadata !== undefined) {
                return block.metadata;
            }
        } catch (error) {
            return -1;
        }
        
        return -1;
    }
    
    /**
     * Generate harvesting route for efficient collection
     */
    generateHarvestingRoute(farmId, centerPos, size) {
        const route = [];
        const halfSize = Math.floor(size / 2);
        const startX = centerPos.x - halfSize;
        const startZ = centerPos.z - halfSize;
        const y = centerPos.y;
        
        // Create serpentine pattern for efficient harvesting
        for (let z = 0; z < size; z++) {
            if (z % 2 === 0) {
                // Left to right
                for (let x = 0; x < size; x++) {
                    if (!this.isWaterChannelPosition(x, z, size)) {
                        route.push(new Vec3(startX + x, y, startZ + z));
                    }
                }
            } else {
                // Right to left
                for (let x = size - 1; x >= 0; x--) {
                    if (!this.isWaterChannelPosition(x, z, size)) {
                        route.push(new Vec3(startX + x, y, startZ + z));
                    }
                }
            }
        }
        
        this.harvestingRoutes.set(farmId, route);
        console.log(`Harvesting route generated: ${route.length} waypoints`);
    }
    
    /**
     * Harvest mature crops from a farm
     */
    async harvestFarm(farmId) {
        const farm = this.farms.find(f => f.id === farmId);
        if (!farm) {
            console.log(`Farm ${farmId} not found`);
            return 0;
        }
        
        console.log(`Harvesting ${farm.cropType} farm`);
        await this.notifier.send(`🌾 Harvesting ${farm.cropType} farm`);
        
        const route = this.harvestingRoutes.get(farmId);
        if (!route) {
            console.log('No harvesting route available');
            return 0;
        }
        
        let harvested = 0;
        
        for (const waypoint of route) {
            const cropPos = waypoint.offset(0, 1, 0);
            const block = this.bot.blockAt(cropPos);
            
            if (!block) continue;
            
            // Check if crop is mature
            const stage = this.getCropGrowthStage(cropPos);
            const maxStage = this.GROWTH_STAGES[farm.cropType] || 7;
            
            if (stage >= maxStage) {
                try {
                    // Harvest crop
                    await this.bot.dig(block);
                    harvested++;
                    
                    // Replant
                    const seeds = this.bot.inventory.items().find(item => 
                        this.getCropSeeds(farm.cropType).includes(item.name)
                    );
                    
                    if (seeds) {
                        await this.bot.equip(seeds, 'hand');
                        const farmland = this.bot.blockAt(waypoint);
                        if (farmland && farmland.name === 'farmland') {
                            await this.bot.placeBlock(farmland, new Vec3(0, 1, 0));
                            this.trackCropGrowth(cropPos, farm.cropType);
                        }
                    }
                    
                    await this.sleep(100);
                } catch (error) {
                    // Continue harvesting
                }
            }
        }
        
        console.log(`Harvested ${harvested} crops`);
        await this.notifier.send(`✅ Harvested ${harvested} ${farm.cropType}`);
        
        return harvested;
    }
    
    /**
     * Add fence around farm
     */
    async fenceFarm(centerPos, size) {
        console.log('Adding fence around farm');
        
        const fence = this.bot.inventory.items().find(item => 
            item.name.includes('fence')
        );
        
        if (!fence) {
            console.log('No fence available');
            return;
        }
        
        const halfSize = Math.floor(size / 2);
        const perimeter = [
            // Top edge
            ...Array.from({ length: size }, (_, i) => 
                new Vec3(centerPos.x - halfSize + i, centerPos.y, centerPos.z - halfSize)
            ),
            // Bottom edge
            ...Array.from({ length: size }, (_, i) => 
                new Vec3(centerPos.x - halfSize + i, centerPos.y, centerPos.z + halfSize)
            ),
            // Left edge
            ...Array.from({ length: size }, (_, i) => 
                new Vec3(centerPos.x - halfSize, centerPos.y, centerPos.z - halfSize + i)
            ),
            // Right edge
            ...Array.from({ length: size }, (_, i) => 
                new Vec3(centerPos.x + halfSize, centerPos.y, centerPos.z - halfSize + i)
            )
        ];
        
        for (const pos of perimeter) {
            try {
                await this.bot.equip(fence, 'hand');
                const referenceBlock = this.bot.blockAt(pos.offset(0, -1, 0));
                if (referenceBlock) {
                    await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                }
            } catch (error) {
                // Continue
            }
        }
        
        console.log('Fence added');
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
            totalFarms: this.farms.length,
            trackedCrops: this.cropGrowthTracking.size
        };
    }
}

module.exports = AdvancedFarmSystem;
