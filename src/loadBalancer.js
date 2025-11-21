/**
 * Load Balancer - v4.1.0
 * 
 * Distributes tasks across multiple bots efficiently
 * Uses weighted round-robin and performance-based algorithms
 */

const EventBus = require('./eventBus');

class LoadBalancer {
    constructor(coordinator) {
        this.coordinator = coordinator;
        this.enabled = process.env.MULTIBOT_ENABLED === 'true';
        
        this.strategies = {
            ROUND_ROBIN: 'round_robin',
            LEAST_LOADED: 'least_loaded',
            PERFORMANCE_BASED: 'performance_based',
            LOCATION_BASED: 'location_based'
        };
        
        this.currentStrategy = this.strategies.PERFORMANCE_BASED;
        this.roundRobinIndex = 0;
        
        this.stats = {
            tasksDistributed: 0,
            avgDistributionTime: 0,
            strategyUsage: {}
        };
    }
    
    /**
     * Balance task across available bots
     */
    balance(task, strategy = null) {
        if (!this.enabled) return null;
        
        const startTime = Date.now();
        const usedStrategy = strategy || this.currentStrategy;
        
        let selectedBot = null;
        
        switch (usedStrategy) {
            case this.strategies.ROUND_ROBIN:
                selectedBot = this.roundRobin(task);
                break;
            case this.strategies.LEAST_LOADED:
                selectedBot = this.leastLoaded(task);
                break;
            case this.strategies.PERFORMANCE_BASED:
                selectedBot = this.performanceBased(task);
                break;
            case this.strategies.LOCATION_BASED:
                selectedBot = this.locationBased(task);
                break;
            default:
                selectedBot = this.performanceBased(task);
        }
        
        const distributionTime = Date.now() - startTime;
        
        this.updateStats(usedStrategy, distributionTime);
        
        if (selectedBot) {
            EventBus.emit('loadbalancer:assigned', {
                botId: selectedBot,
                task,
                strategy: usedStrategy,
                distributionTime
            });
        }
        
        return selectedBot;
    }
    
    /**
     * Round-robin distribution
     */
    roundRobin(task) {
        const bots = this.getAvailableBots(task);
        if (bots.length === 0) return null;
        
        const bot = bots[this.roundRobinIndex % bots.length];
        this.roundRobinIndex++;
        
        return bot.id;
    }
    
    /**
     * Least loaded bot
     */
    leastLoaded(task) {
        const bots = this.getAvailableBots(task);
        if (bots.length === 0) return null;
        
        let leastLoaded = bots[0];
        let minLoad = this.calculateLoad(leastLoaded);
        
        for (const bot of bots) {
            const load = this.calculateLoad(bot);
            if (load < minLoad) {
                minLoad = load;
                leastLoaded = bot;
            }
        }
        
        return leastLoaded.id;
    }
    
    /**
     * Performance-based selection
     */
    performanceBased(task) {
        const bots = this.getAvailableBots(task);
        if (bots.length === 0) return null;
        
        let bestBot = bots[0];
        let bestScore = this.calculatePerformanceScore(bots[0], task);
        
        for (const bot of bots) {
            const score = this.calculatePerformanceScore(bot, task);
            if (score > bestScore) {
                bestScore = score;
                bestBot = bot;
            }
        }
        
        return bestBot.id;
    }
    
    /**
     * Location-based selection (nearest bot)
     */
    locationBased(task) {
        if (!task.location) return this.performanceBased(task);
        
        const bots = this.getAvailableBots(task);
        if (bots.length === 0) return null;
        
        let nearest = bots[0];
        let minDistance = this.calculateDistance(bots[0].position, task.location);
        
        for (const bot of bots) {
            const distance = this.calculateDistance(bot.position, task.location);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = bot;
            }
        }
        
        return nearest.id;
    }
    
    /**
     * Get available bots for task
     */
    getAvailableBots(task) {
        const allBots = Array.from(this.coordinator.bots.values());
        
        return allBots.filter(bot => 
            bot.status === 'idle' &&
            (!task.requiredCapability || bot.capabilities.includes(task.requiredCapability))
        );
    }
    
    /**
     * Calculate bot load (0-1 scale)
     */
    calculateLoad(bot) {
        const baseLoad = bot.status === 'busy' ? 1 : 0;
        const taskLoad = bot.currentTask ? 0.5 : 0;
        return Math.min(1, baseLoad + taskLoad);
    }
    
    /**
     * Calculate performance score for bot
     */
    calculatePerformanceScore(bot, task) {
        const efficiency = bot.performance.efficiency || 1;
        const completionRate = bot.performance.tasksCompleted / Math.max(1, bot.performance.uptime);
        const loadPenalty = this.calculateLoad(bot);
        
        let score = efficiency * 50 + completionRate * 30 - loadPenalty * 20;
        
        // Distance factor if task has location
        if (task.location) {
            const distance = this.calculateDistance(bot.position, task.location);
            score -= distance * 0.1;
        }
        
        return score;
    }
    
    /**
     * Calculate distance between positions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * Update statistics
     */
    updateStats(strategy, time) {
        this.stats.tasksDistributed++;
        this.stats.avgDistributionTime = 
            (this.stats.avgDistributionTime * (this.stats.tasksDistributed - 1) + time) /
            this.stats.tasksDistributed;
        
        this.stats.strategyUsage[strategy] = (this.stats.strategyUsage[strategy] || 0) + 1;
    }
    
    /**
     * Get load balancer statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentStrategy: this.currentStrategy,
            avgDistributionTimeMs: this.stats.avgDistributionTime.toFixed(2)
        };
    }
    
    /**
     * Set balancing strategy
     */
    setStrategy(strategy) {
        if (Object.values(this.strategies).includes(strategy)) {
            this.currentStrategy = strategy;
            console.log(`[Load Balancer] Strategy changed to: ${strategy}`);
            return true;
        }
        return false;
    }
}

module.exports = LoadBalancer;
