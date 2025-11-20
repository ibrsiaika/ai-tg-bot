/**
 * Economy System - v4.1.0
 * 
 * Resource valuation and economic analysis
 * Tracks resource values, market trends, and optimization opportunities
 */

const EventBus = require('./eventBus');

class EconomySystem {
    constructor() {
        this.enabled = process.env.ECONOMY_TRACKING_ENABLED === 'true';
        
        // Base resource values (relative)
        this.baseValues = {
            // Ores
            diamond: 1000,
            emerald: 800,
            gold_ore: 300,
            iron_ore: 100,
            coal: 50,
            redstone: 80,
            lapis_lazuli: 60,
            
            // Materials
            wood: 10,
            stone: 5,
            obsidian: 400,
            netherite: 2000,
            
            // Food
            cooked_beef: 40,
            bread: 20,
            apple: 15,
            golden_apple: 500,
            
            // Tools (crafted)
            diamond_pickaxe: 3000,
            iron_pickaxe: 300,
            diamond_sword: 2000,
            
            // Blocks
            dirt: 1,
            cobblestone: 2,
            glass: 8
        };
        
        this.inventory = {};
        this.history = [];
        this.trends = {};
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('[Economy] System initialized');
        
        EventBus.on('bot:inventory', (data) => {
            this.updateInventory(data);
        });
        
        EventBus.on('bot:resource:collected', (data) => {
            this.trackCollection(data);
        });
        
        EventBus.on('bot:resource:used', (data) => {
            this.trackUsage(data);
        });
    }
    
    /**
     * Update inventory value calculation
     */
    updateInventory(inventory) {
        this.inventory = {};
        let totalValue = 0;
        
        for (const item of inventory) {
            const value = this.getItemValue(item.name, item.count);
            this.inventory[item.name] = {
                count: item.count,
                unitValue: this.baseValues[item.name] || 10,
                totalValue: value
            };
            totalValue += value;
        }
        
        EventBus.emit('economy:inventory:valued', {
            totalValue,
            items: Object.keys(this.inventory).length,
            topItems: this.getTopValuedItems(5)
        });
    }
    
    /**
     * Get item value
     */
    getItemValue(itemName, count = 1) {
        const baseValue = this.baseValues[itemName] || 10;
        const multiplier = this.getValueMultiplier(itemName);
        return baseValue * count * multiplier;
    }
    
    /**
     * Get value multiplier based on rarity and demand
     */
    getValueMultiplier(itemName) {
        let multiplier = 1.0;
        
        // Rarity multiplier
        if (itemName.includes('diamond')) multiplier *= 1.5;
        if (itemName.includes('netherite')) multiplier *= 2.0;
        if (itemName.includes('emerald')) multiplier *= 1.3;
        
        // Trend multiplier
        const trend = this.trends[itemName];
        if (trend) {
            if (trend.demand > trend.supply) multiplier *= 1.2;
            if (trend.demand < trend.supply) multiplier *= 0.8;
        }
        
        return multiplier;
    }
    
    /**
     * Track resource collection
     */
    trackCollection(data) {
        const { resource, quantity, location } = data;
        
        this.history.push({
            type: 'collection',
            resource,
            quantity: quantity || 1,
            value: this.getItemValue(resource, quantity),
            timestamp: Date.now(),
            location
        });
        
        // Update trends
        if (!this.trends[resource]) {
            this.trends[resource] = { supply: 0, demand: 0, collections: 0 };
        }
        this.trends[resource].supply += quantity || 1;
        this.trends[resource].collections++;
        
        // Keep only last 1000 history entries
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
    }
    
    /**
     * Track resource usage
     */
    trackUsage(data) {
        const { resource, quantity } = data;
        
        this.history.push({
            type: 'usage',
            resource,
            quantity: quantity || 1,
            value: -this.getItemValue(resource, quantity),
            timestamp: Date.now()
        });
        
        // Update trends
        if (!this.trends[resource]) {
            this.trends[resource] = { supply: 0, demand: 0, collections: 0 };
        }
        this.trends[resource].demand += quantity || 1;
    }
    
    /**
     * Get top valued items in inventory
     */
    getTopValuedItems(limit = 5) {
        return Object.entries(this.inventory)
            .sort(([, a], [, b]) => b.totalValue - a.totalValue)
            .slice(0, limit)
            .map(([name, data]) => ({ name, ...data }));
    }
    
    /**
     * Calculate net worth
     */
    calculateNetWorth() {
        return Object.values(this.inventory)
            .reduce((sum, item) => sum + item.totalValue, 0);
    }
    
    /**
     * Get economic insights
     */
    getInsights() {
        const netWorth = this.calculateNetWorth();
        const recentCollections = this.history
            .filter(h => h.type === 'collection' && Date.now() - h.timestamp < 3600000)
            .reduce((sum, h) => sum + h.value, 0);
        
        const recentUsage = this.history
            .filter(h => h.type === 'usage' && Date.now() - h.timestamp < 3600000)
            .reduce((sum, h) => sum + Math.abs(h.value), 0);
        
        const profitRate = recentCollections - recentUsage;
        
        return {
            netWorth,
            hourlyProfit: profitRate,
            topAssets: this.getTopValuedItems(3),
            recommendations: this.getRecommendations(),
            trends: this.getTrendingSummary()
        };
    }
    
    /**
     * Get trending resources summary
     */
    getTrendingSummary() {
        return Object.entries(this.trends)
            .map(([resource, trend]) => ({
                resource,
                ratio: trend.supply / Math.max(1, trend.demand),
                collections: trend.collections
            }))
            .sort((a, b) => b.collections - a.collections)
            .slice(0, 5);
    }
    
    /**
     * Get economic recommendations
     */
    getRecommendations() {
        const recommendations = [];
        
        // Check for high-value opportunities
        for (const [resource, trend] of Object.entries(this.trends)) {
            if (trend.demand > trend.supply * 2) {
                recommendations.push({
                    type: 'collect',
                    resource,
                    reason: 'High demand, low supply',
                    priority: 'high'
                });
            }
        }
        
        // Check inventory optimization
        const lowValueItems = Object.entries(this.inventory)
            .filter(([, data]) => data.totalValue < 100 && data.count > 64)
            .map(([name]) => name);
        
        if (lowValueItems.length > 0) {
            recommendations.push({
                type: 'optimize',
                items: lowValueItems,
                reason: 'Consider removing low-value bulk items',
                priority: 'low'
            });
        }
        
        return recommendations.slice(0, 5);
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            netWorth: this.calculateNetWorth(),
            totalItems: Object.keys(this.inventory).length,
            totalTransactions: this.history.length,
            topAsset: this.getTopValuedItems(1)[0],
            trackedResources: Object.keys(this.trends).length
        };
    }
}

module.exports = EconomySystem;
