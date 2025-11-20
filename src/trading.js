const Vec3 = require('vec3');

/**
 * Villager Trading System
 * Automated village integration and trading
 */
class TradingSystem {
    constructor(bot, pathfinder, notifier, inventory, eventBus = null) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventory;
        this.eventBus = eventBus;
        
        this.discoveredVillages = [];
        this.villagerData = new Map(); // villager entity ID -> profession data
        this.tradeHistory = [];
        this.emeraldCount = 0;
    }

    /**
     * Discover nearby villages
     */
    async discoverVillages(radius = 100) {
        try {
            console.log('🏘️ Searching for villages...');
            
            const villages = [];
            const villagerEntities = Object.values(this.bot.entities).filter(entity => 
                entity.name === 'villager' && 
                entity.position.distanceTo(this.bot.entity.position) <= radius
            );

            if (villagerEntities.length === 0) {
                console.log('No villages found nearby');
                return villages;
            }

            // Group villagers by proximity to identify villages
            const villageGroups = this.groupVillagersByProximity(villagerEntities);
            
            for (const group of villageGroups) {
                const centerPos = this.calculateCenter(group.map(v => v.position));
                const village = {
                    position: centerPos,
                    villagerCount: group.length,
                    villagers: group.map(v => v.id),
                    discovered: Date.now()
                };
                villages.push(village);
                this.discoveredVillages.push(village);
            }

            console.log(`✓ Discovered ${villages.length} village(s) with ${villagerEntities.length} total villagers`);
            await this.notifier.send(`🏘️ Found ${villages.length} village(s) nearby!`);
            
            if (this.eventBus) {
                this.eventBus.emit('structure:found', {
                    type: 'village',
                    count: villages.length,
                    position: villages[0]?.position
                });
            }

            return villages;
        } catch (error) {
            console.error('Error discovering villages:', error);
            return [];
        }
    }

    /**
     * Group villagers by proximity to identify distinct villages
     */
    groupVillagersByProximity(villagers, proximityRadius = 30) {
        const groups = [];
        const visited = new Set();

        for (const villager of villagers) {
            if (visited.has(villager.id)) continue;

            const group = [villager];
            visited.add(villager.id);

            // Find all villagers within proximity
            for (const other of villagers) {
                if (visited.has(other.id)) continue;
                if (villager.position.distanceTo(other.position) <= proximityRadius) {
                    group.push(other);
                    visited.add(other.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Calculate center position of a group of positions
     */
    calculateCenter(positions) {
        if (positions.length === 0) return null;

        const sum = positions.reduce((acc, pos) => ({
            x: acc.x + pos.x,
            y: acc.y + pos.y,
            z: acc.z + pos.z
        }), { x: 0, y: 0, z: 0 });

        return new Vec3(
            Math.floor(sum.x / positions.length),
            Math.floor(sum.y / positions.length),
            Math.floor(sum.z / positions.length)
        );
    }

    /**
     * Identify villager professions
     */
    async identifyProfessions() {
        try {
            const villagers = Object.values(this.bot.entities).filter(entity => 
                entity.name === 'villager'
            );

            console.log(`Identifying professions for ${villagers.length} villagers...`);
            const professions = new Map();

            for (const villager of villagers) {
                // In actual implementation, we would need to interact with villager
                // to see their trades and determine profession
                // For now, we'll use placeholder logic
                const profession = this.determineProfession(villager);
                
                this.villagerData.set(villager.id, {
                    entityId: villager.id,
                    profession: profession,
                    position: villager.position.clone(),
                    level: 1, // Default level
                    lastInteraction: null
                });

                if (!professions.has(profession)) {
                    professions.set(profession, []);
                }
                professions.get(profession).push(villager.id);
            }

            // Log summary
            console.log('Villager professions:');
            for (const [profession, villagerIds] of professions) {
                console.log(`  ${profession}: ${villagerIds.length} villagers`);
            }

            return professions;
        } catch (error) {
            console.error('Error identifying professions:', error);
            return new Map();
        }
    }

    /**
     * Determine villager profession (placeholder - would need actual trade inspection)
     */
    determineProfession(villager) {
        // In real implementation, we would check the villager's trades
        // For now, return a random profession for demonstration
        const professions = [
            'librarian', 'armorer', 'weaponsmith', 'toolsmith',
            'cleric', 'farmer', 'fisherman', 'fletcher',
            'cartographer', 'leatherworker'
        ];
        
        // Use entity ID as seed for consistent profession assignment
        const index = villager.id % professions.length;
        return professions[index];
    }

    /**
     * Optimize trade sequence for best ROI
     */
    optimizeTradeSequence(availableTrades) {
        try {
            // Sort trades by value/cost ratio
            const optimized = availableTrades.map(trade => {
                const value = this.calculateTradeValue(trade);
                return { ...trade, value, roi: value / (trade.cost || 1) };
            }).sort((a, b) => b.roi - a.roi);

            console.log('Optimized trade sequence:');
            optimized.slice(0, 5).forEach((trade, i) => {
                console.log(`  ${i + 1}. ${trade.item} (ROI: ${trade.roi.toFixed(2)})`);
            });

            return optimized;
        } catch (error) {
            console.error('Error optimizing trades:', error);
            return availableTrades;
        }
    }

    /**
     * Calculate trade value
     */
    calculateTradeValue(trade) {
        const itemValues = {
            'diamond': 100,
            'emerald': 50,
            'enchanted_book': 80,
            'diamond_pickaxe': 90,
            'diamond_sword': 85,
            'iron_ingot': 10,
            'bread': 2,
            'wheat': 1,
            'ender_pearl': 60,
            'redstone': 5,
            'glowstone': 8
        };

        return itemValues[trade.item] || 5; // Default value
    }

    /**
     * Execute trade chain
     */
    async executeTradeChain(trades, maxTrades = 10) {
        try {
            console.log(`Executing trade chain (max ${maxTrades} trades)...`);
            
            if (this.eventBus) {
                this.eventBus.emit('trade:started', {
                    tradeCount: Math.min(trades.length, maxTrades)
                });
            }

            let successfulTrades = 0;
            const results = [];

            for (let i = 0; i < Math.min(trades.length, maxTrades); i++) {
                const trade = trades[i];
                
                try {
                    const result = await this.executeSingleTrade(trade);
                    
                    if (result.success) {
                        successfulTrades++;
                        this.tradeHistory.push({
                            trade,
                            result,
                            timestamp: Date.now()
                        });
                        
                        // Update emerald count if applicable
                        if (result.received === 'emerald') {
                            this.emeraldCount += result.quantity || 1;
                        }
                    }
                    
                    results.push(result);
                } catch (tradeError) {
                    console.error(`Trade ${i + 1} failed:`, tradeError.message);
                    results.push({ success: false, error: tradeError.message });
                }
            }

            console.log(`✓ Completed ${successfulTrades}/${Math.min(trades.length, maxTrades)} trades`);
            
            if (this.eventBus) {
                this.eventBus.emit('trade:completed', {
                    successfulTrades,
                    totalAttempts: Math.min(trades.length, maxTrades),
                    emeraldCount: this.emeraldCount
                });
            }

            await this.notifier.send(
                `💰 Trade session complete: ${successfulTrades}/${Math.min(trades.length, maxTrades)} successful`
            );

            return results;
        } catch (error) {
            console.error('Error executing trade chain:', error);
            if (this.eventBus) {
                this.eventBus.emit('trade:failed', { error: error.message });
            }
            return [];
        }
    }

    /**
     * Execute a single trade
     */
    async executeSingleTrade(trade) {
        // This is a placeholder - actual implementation would require
        // navigating to villager, opening trade window, and executing trade
        
        console.log(`Trading for ${trade.item}...`);
        
        // Simulate trade execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            item: trade.item,
            received: trade.item,
            quantity: trade.quantity || 1,
            cost: trade.cost || 1,
            timestamp: Date.now()
        };
    }

    /**
     * Track trade progress
     */
    trackTradeProgress() {
        const stats = {
            totalTrades: this.tradeHistory.length,
            emeraldsEarned: this.emeraldCount,
            villagesFound: this.discoveredVillages.length,
            villagersKnown: this.villagerData.size,
            recentTrades: this.tradeHistory.slice(-10)
        };

        console.log('=== Trading Statistics ===');
        console.log(`Total trades: ${stats.totalTrades}`);
        console.log(`Emeralds earned: ${stats.emeraldsEarned}`);
        console.log(`Villages found: ${stats.villagesFound}`);
        console.log(`Villagers catalogued: ${stats.villagersKnown}`);

        return stats;
    }

    /**
     * Find best trades for specific goals
     */
    async findBestTrades(goal = 'emeralds') {
        const goalTrades = {
            'emeralds': ['wheat', 'carrots', 'potatoes', 'beetroot'],
            'enchanted_books': ['emerald', 'book'],
            'diamond_tools': ['emerald', 'diamond'],
            'ender_pearls': ['emerald']
        };

        const targetItems = goalTrades[goal] || [];
        console.log(`Finding best trades for goal: ${goal}`);
        console.log(`Target items: ${targetItems.join(', ')}`);

        // Mock trade data - in real implementation, would query actual villager trades
        const mockTrades = targetItems.map(item => ({
            item: 'emerald',
            cost: 1,
            quantity: Math.floor(Math.random() * 3) + 1,
            profession: 'farmer',
            value: this.calculateTradeValue({ item: 'emerald' })
        }));

        return this.optimizeTradeSequence(mockTrades);
    }

    /**
     * Get villager by profession
     */
    getVillagersByProfession(profession) {
        const villagers = [];
        for (const [id, data] of this.villagerData) {
            if (data.profession === profession) {
                villagers.push(data);
            }
        }
        return villagers;
    }
}

module.exports = TradingSystem;
