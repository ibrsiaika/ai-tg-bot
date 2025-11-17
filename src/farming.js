const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class FarmingSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.farmLocations = [];
    }

    async plantCrops(centerPos, width, depth, cropType = 'wheat') {
        console.log(`Planting ${cropType} crops`);
        
        const seeds = await this.getSeedsForCrop(cropType);
        if (!seeds) {
            console.log(`No seeds available for ${cropType}`);
            return false;
        }

        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        await this.bot.equip(seeds, 'hand');

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const pos = centerPos.offset(x, 0, z);
                const block = this.bot.blockAt(pos);
                
                if (block && block.name === 'farmland') {
                    try {
                        await this.bot.pathfinder.goto(new goals.GoalBlock(pos.x, pos.y, pos.z));
                        await this.bot.placeBlock(block, new Vec3(0, 1, 0));
                        await this.sleep(200);
                    } catch (error) {
                        // Continue planting
                    }
                }
            }
        }

        await this.notifier.notifyFarmProgress('planting completed');
        console.log('Crops planted');
        return true;
    }

    async getSeedsForCrop(cropType) {
        const seedMap = {
            wheat: 'wheat_seeds',
            carrot: 'carrot',
            potato: 'potato',
            beetroot: 'beetroot_seeds',
            pumpkin: 'pumpkin_seeds',
            melon: 'melon_seeds'
        };

        const seedName = seedMap[cropType] || 'wheat_seeds';
        return await this.inventory.findItem(seedName);
    }

    async harvestCrops(centerPos, width, depth) {
        console.log('Harvesting crops');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        let harvested = 0;

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const pos = centerPos.offset(x, 0, z);
                const block = this.bot.blockAt(pos);
                
                if (block && this.isMatureCrop(block)) {
                    try {
                        await this.bot.pathfinder.goto(new goals.GoalBlock(pos.x, pos.y, pos.z));
                        await this.bot.dig(block);
                        harvested++;
                        await this.sleep(300);
                    } catch (error) {
                        console.error('Error harvesting crop:', error.message);
                    }
                }
            }
        }

        await this.notifier.notifyFarmProgress(`harvested ${harvested} crops`);
        console.log(`Harvested ${harvested} crops`);
        
        // Replant after harvest
        await this.replantCrops(centerPos, width, depth);
        
        return harvested;
    }

    isMatureCrop(block) {
        const matureCrops = [
            'wheat', 'carrots', 'potatoes', 'beetroots',
            'pumpkin', 'melon'
        ];

        if (!matureCrops.some(crop => block.name.includes(crop))) {
            return false;
        }

        // Check age property for crops that have it
        if (block.getProperties && block.getProperties().age !== undefined) {
            return block.getProperties().age === 7; // Fully grown
        }

        // For pumpkins and melons, they're always mature when they exist
        return block.name === 'pumpkin' || block.name === 'melon';
    }

    async replantCrops(centerPos, width, depth) {
        console.log('Replanting crops');
        
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const pos = centerPos.offset(x, 0, z);
                const block = this.bot.blockAt(pos);
                
                if (block && block.name === 'farmland') {
                    const blockAbove = this.bot.blockAt(pos.offset(0, 1, 0));
                    
                    if (blockAbove && blockAbove.name === 'air') {
                        // Replant
                        const seeds = await this.inventory.findItem('wheat_seeds') ||
                                     await this.inventory.findItem('carrot') ||
                                     await this.inventory.findItem('potato') ||
                                     await this.inventory.findItem('beetroot_seeds');
                        
                        if (seeds) {
                            try {
                                await this.bot.equip(seeds, 'hand');
                                await this.bot.pathfinder.goto(new goals.GoalBlock(pos.x, pos.y, pos.z));
                                await this.bot.placeBlock(block, new Vec3(0, 1, 0));
                                await this.sleep(200);
                            } catch (error) {
                                // Continue replanting
                            }
                        }
                    }
                }
            }
        }

        await this.notifier.notifyFarmProgress('replanting completed');
        console.log('Replanting completed');
    }

    async autoFarm() {
        console.log('Starting automatic farming cycle');
        
        // Find farmland nearby
        const farmland = this.bot.findBlock({
            matching: block => block.name === 'farmland',
            maxDistance: 64
        });

        if (!farmland) {
            console.log('No farmland found nearby');
            return false;
        }

        // Estimate farm area (simple approach)
        const centerPos = farmland.position;
        const farmSize = 9; // 9x9 default

        try {
            // Check for mature crops
            const matureCrops = this.findMatureCropsInArea(centerPos, farmSize, farmSize);
            
            if (matureCrops.length > 0) {
                console.log(`Found ${matureCrops.length} mature crops`);
                await this.harvestCrops(centerPos, farmSize, farmSize);
            } else {
                console.log('No mature crops found, checking planting');
                await this.plantCrops(centerPos, farmSize, farmSize, 'wheat');
            }

            return true;
        } catch (error) {
            console.error('Error in auto-farming:', error.message);
            return false;
        }
    }

    findMatureCropsInArea(centerPos, width, depth) {
        const matureCrops = [];
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        for (let x = -halfWidth; x <= halfWidth; x++) {
            for (let z = -halfDepth; z <= halfDepth; z++) {
                const pos = centerPos.offset(x, 0, z);
                const block = this.bot.blockAt(pos);
                
                if (block && this.isMatureCrop(block)) {
                    matureCrops.push(block);
                }
            }
        }

        return matureCrops;
    }

    async breedAnimals(animalType = 'cow') {
        console.log(`Breeding ${animalType}s`);
        
        const breedingItems = {
            cow: 'wheat',
            sheep: 'wheat',
            pig: 'carrot',
            chicken: 'wheat_seeds'
        };

        const food = breedingItems[animalType];
        const foodItem = await this.inventory.findItem(food);

        if (!foodItem) {
            console.log(`No ${food} for breeding`);
            return false;
        }

        try {
            // Find animals nearby
            const animals = Object.values(this.bot.entities).filter(entity => 
                entity.name === animalType && 
                this.bot.entity.position.distanceTo(entity.position) < 16
            );

            if (animals.length < 2) {
                console.log(`Not enough ${animalType}s nearby`);
                return false;
            }

            await this.bot.equip(foodItem, 'hand');

            // Feed two animals
            for (let i = 0; i < Math.min(2, animals.length); i++) {
                const animal = animals[i];
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    animal.position.x,
                    animal.position.y,
                    animal.position.z,
                    2
                ));
                
                await this.bot.activateEntity(animal);
                await this.sleep(500);
            }

            console.log(`Bred ${animalType}s`);
            return true;
        } catch (error) {
            console.error('Error breeding animals:', error.message);
            return false;
        }
    }

    async collectAnimalDrops() {
        console.log('Collecting animal drops');
        
        // Look for items on ground
        const items = Object.values(this.bot.entities).filter(entity =>
            entity.objectType === 'Item' &&
            this.bot.entity.position.distanceTo(entity.position) < 16
        );

        for (const item of items) {
            try {
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    item.position.x,
                    item.position.y,
                    item.position.z,
                    1
                ));
                await this.sleep(500);
            } catch (error) {
                // Item might have been picked up already
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = FarmingSystem;
