const { goals } = require('mineflayer-pathfinder');
const CONSTANTS = require('./constants');
const Utils = require('./utils');

/**
 * Fishing Automation System
 * Handles automatic fishing for food and resources
 */
class FishingSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        
        this.isFishing = false;
        this.fishCaught = 0;
        this.fishingStartTime = null;
        
        console.log('Fishing System initialized');
    }

    /**
     * Check if bot has a fishing rod
     */
    async hasFishingRod() {
        const rod = await this.inventory.findItem('fishing_rod');
        return rod !== null;
    }

    /**
     * Craft a fishing rod
     */
    async craftFishingRod() {
        console.log('Attempting to craft fishing rod');
        
        // Need 3 sticks and 2 string
        const hasSticks = await this.inventory.hasItem('stick', 3);
        const hasString = await this.inventory.hasItem('string', 2);
        
        if (!hasSticks) {
            console.log('Need 3 sticks to craft fishing rod');
            return false;
        }
        
        if (!hasString) {
            console.log('Need 2 string to craft fishing rod (from spiders)');
            return false;
        }
        
        try {
            const rodItem = this.bot.registry.itemsByName.fishing_rod;
            if (!rodItem) {
                console.log('Fishing rod item not found in registry');
                return false;
            }
            
            const recipes = this.bot.recipesFor(rodItem.id);
            if (!recipes || recipes.length === 0) {
                console.log('No recipe found for fishing rod');
                return false;
            }
            
            const recipe = recipes[0];
            await this.bot.craft(recipe, 1, null);
            console.log('Crafted fishing rod');
            await this.notifier.send('🎣 Crafted fishing rod');
            return true;
        } catch (error) {
            console.error('Error crafting fishing rod:', error.message);
        }
        
        return false;
    }

    /**
     * Find nearby water suitable for fishing
     */
    findWater() {
        // Look for water blocks nearby
        const water = this.bot.findBlock({
            matching: block => block.name === 'water',
            maxDistance: 32,
            count: 10 // Find at least 10 water blocks (indicates body of water)
        });
        
        return water;
    }

    /**
     * Start automated fishing session
     * @param {number} duration - Duration in milliseconds
     * @param {number} targetCount - Target number of fish to catch
     */
    async autoFish(duration = 300000, targetCount = 16) {
        console.log(`Starting automated fishing (target: ${targetCount} fish, max time: ${Utils.formatDuration(duration)})`);
        
        // Check for fishing rod
        if (!await this.hasFishingRod()) {
            console.log('No fishing rod available, attempting to craft...');
            const crafted = await this.craftFishingRod();
            if (!crafted) {
                console.log('Cannot fish without fishing rod');
                return false;
            }
        }
        
        // Find water
        const water = this.findWater();
        if (!water) {
            console.log('No suitable water found nearby for fishing');
            return false;
        }
        
        try {
            // Move near water
            await this.bot.pathfinder.goto(new goals.GoalNear(
                water.position.x,
                water.position.y,
                water.position.z,
                4
            ));
            
            // Equip fishing rod
            const rod = await this.inventory.findItem('fishing_rod');
            await this.bot.equip(rod, 'hand');
            
            this.isFishing = true;
            this.fishCaught = 0;
            this.fishingStartTime = Date.now();
            
            await this.notifier.send('🎣 Starting fishing session');
            
            // Fishing loop
            while (this.isFishing && this.fishCaught < targetCount) {
                // Check time limit
                if (Date.now() - this.fishingStartTime > duration) {
                    console.log('Fishing time limit reached');
                    break;
                }
                
                // Check if inventory is full
                if (this.inventory.isInventoryFull()) {
                    console.log('Inventory full, stopping fishing');
                    break;
                }
                
                try {
                    await this.castAndCatch();
                    this.fishCaught++;
                } catch (error) {
                    if (Utils.isRecoverableError(error)) {
                        console.log('Fishing attempt failed, retrying...');
                        await Utils.sleep(2000);
                    } else {
                        throw error;
                    }
                }
            }
            
            this.isFishing = false;
            const sessionTime = Date.now() - this.fishingStartTime;
            
            console.log(`Fishing session complete: caught ${this.fishCaught} fish in ${Utils.formatDuration(sessionTime)}`);
            await this.notifier.send(`🎣 Fishing complete: ${this.fishCaught} fish caught`);
            
            return this.fishCaught > 0;
        } catch (error) {
            this.isFishing = false;
            console.error('Error during fishing:', error.message);
            return false;
        }
    }

    /**
     * Cast fishing rod and wait for catch
     */
    async castAndCatch() {
        return new Promise((resolve, reject) => {
            let fishingTimeout;
            let bobberEntity = null;
            
            // Timeout after 60 seconds
            fishingTimeout = setTimeout(() => {
                this.bot.removeListener('playerCollect', collectListener);
                reject(new Error('Fishing timeout'));
            }, 60000);
            
            // Listen for item collection (caught fish)
            const collectListener = (collector, collected) => {
                if (collector === this.bot.entity) {
                    clearTimeout(fishingTimeout);
                    this.bot.removeListener('playerCollect', collectListener);
                    console.log('Fish caught!');
                    resolve(true);
                }
            };
            
            this.bot.on('playerCollect', collectListener);
            
            // Cast the fishing rod
            this.bot.activateItem();
            console.log('Fishing rod cast');
            
            // Wait a moment for bobber to spawn
            setTimeout(() => {
                // Find the bobber entity
                bobberEntity = Object.values(this.bot.entities).find(
                    entity => entity.name === 'fishing_bobber' && 
                    entity.position.distanceTo(this.bot.entity.position) < 20
                );
                
                if (bobberEntity) {
                    // Monitor bobber for catch (velocity changes indicate bite)
                    const checkBobber = setInterval(() => {
                        if (!bobberEntity || !this.bot.entities[bobberEntity.id]) {
                            clearInterval(checkBobber);
                            return;
                        }
                        
                        // Check if bobber is underwater (y velocity spike indicates bite)
                        const velocity = bobberEntity.velocity;
                        if (velocity && Math.abs(velocity.y) > 0.3) {
                            clearInterval(checkBobber);
                            // Reel in (activate item again)
                            setTimeout(() => {
                                this.bot.activateItem();
                            }, 500);
                        }
                    }, 100);
                    
                    // Clear interval after timeout
                    setTimeout(() => {
                        clearInterval(checkBobber);
                    }, 60000);
                }
            }, 1000);
        });
    }

    /**
     * Stop fishing immediately
     */
    stopFishing() {
        console.log('Stopping fishing session');
        this.isFishing = false;
    }

    /**
     * Get fishing statistics
     */
    getStats() {
        return {
            isFishing: this.isFishing,
            fishCaught: this.fishCaught,
            sessionDuration: this.fishingStartTime ? Date.now() - this.fishingStartTime : 0
        };
    }
}

module.exports = FishingSystem;
