/**
 * Multi-Bot Coordinator - v4.1.0
 * 
 * Manages multiple bots working together
 * Features:
 * - Territory assignment
 * - Task distribution
 * - Resource sharing
 * - Coordination via event bus
 */

const EventBus = require('./eventBus');

class MultiBotCoordinator {
    constructor(options = {}) {
        this.enabled = process.env.MULTIBOT_ENABLED === 'true';
        this.maxBots = parseInt(process.env.MULTIBOT_MAX_BOTS) || 10;
        this.territorySize = parseInt(process.env.MULTIBOT_TERRITORY_SIZE) || 100;
        
        this.bots = new Map();
        this.territories = new Map();
        this.sharedResources = new Map();
        this.taskQueue = [];
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('[Multi-Bot] Coordinator initialized');
        console.log(`[Multi-Bot] Max bots: ${this.maxBots}, Territory size: ${this.territorySize}`);
        
        // Listen to coordination events
        EventBus.on('bot:register', (data) => this.registerBot(data));
        EventBus.on('bot:unregister', (data) => this.unregisterBot(data));
        EventBus.on('bot:task:complete', (data) => this.handleTaskComplete(data));
        EventBus.on('bot:resource:found', (data) => this.shareResource(data));
    }
    
    /**
     * Register a new bot
     */
    registerBot(data) {
        const { botId, position, capabilities } = data;
        
        if (this.bots.size >= this.maxBots) {
            console.warn(`[Multi-Bot] Cannot register bot ${botId}: max bots reached`);
            return false;
        }
        
        const territory = this.assignTerritory(position);
        
        this.bots.set(botId, {
            id: botId,
            position,
            capabilities: capabilities || [],
            territory,
            status: 'idle',
            currentTask: null,
            resources: {},
            performance: {
                tasksCompleted: 0,
                efficiency: 1.0,
                uptime: 0
            }
        });
        
        console.log(`[Multi-Bot] Registered bot ${botId} in territory ${territory.id}`);
        
        EventBus.emit('multibot:registered', {
            botId,
            territory,
            totalBots: this.bots.size
        });
        
        return true;
    }
    
    /**
     * Unregister a bot
     */
    unregisterBot(data) {
        const { botId } = data;
        
        if (!this.bots.has(botId)) return;
        
        const bot = this.bots.get(botId);
        
        // Reassign any pending tasks
        if (bot.currentTask) {
            this.taskQueue.push(bot.currentTask);
        }
        
        // Free territory
        this.territories.delete(bot.territory.id);
        
        this.bots.delete(botId);
        
        console.log(`[Multi-Bot] Unregistered bot ${botId}`);
        
        EventBus.emit('multibot:unregistered', {
            botId,
            totalBots: this.bots.size
        });
    }
    
    /**
     * Assign territory to a bot
     */
    assignTerritory(position) {
        // Grid-based territory assignment
        const gridX = Math.floor(position.x / this.territorySize);
        const gridZ = Math.floor(position.z / this.territorySize);
        const territoryId = `${gridX},${gridZ}`;
        
        if (!this.territories.has(territoryId)) {
            this.territories.set(territoryId, {
                id: territoryId,
                bounds: {
                    minX: gridX * this.territorySize,
                    maxX: (gridX + 1) * this.territorySize,
                    minZ: gridZ * this.territorySize,
                    maxZ: (gridZ + 1) * this.territorySize
                },
                resources: [],
                claimed: true
            });
        }
        
        return this.territories.get(territoryId);
    }
    
    /**
     * Distribute task to best available bot
     */
    distributeTask(task) {
        if (!this.enabled) return null;
        
        const availableBots = Array.from(this.bots.values()).filter(bot => 
            bot.status === 'idle' &&
            (!task.requiredCapability || bot.capabilities.includes(task.requiredCapability))
        );
        
        if (availableBots.length === 0) {
            this.taskQueue.push(task);
            return null;
        }
        
        // Select bot using load balancing
        const selectedBot = this.selectOptimalBot(availableBots, task);
        
        selectedBot.status = 'busy';
        selectedBot.currentTask = task;
        
        EventBus.emit('bot:task:assigned', {
            botId: selectedBot.id,
            task
        });
        
        return selectedBot.id;
    }
    
    /**
     * Select optimal bot for task using load balancing
     */
    selectOptimalBot(bots, task) {
        // Score each bot based on:
        // - Distance to task location
        // - Performance/efficiency
        // - Current workload
        
        let bestBot = bots[0];
        let bestScore = -Infinity;
        
        for (const bot of bots) {
            const distance = task.location 
                ? this.calculateDistance(bot.position, task.location)
                : 0;
            
            const score = 
                bot.performance.efficiency * 100 -
                distance * 0.1 +
                bot.performance.tasksCompleted * 0.5;
            
            if (score > bestScore) {
                bestScore = score;
                bestBot = bot;
            }
        }
        
        return bestBot;
    }
    
    /**
     * Handle task completion
     */
    handleTaskComplete(data) {
        const { botId, task, success } = data;
        const bot = this.bots.get(botId);
        
        if (!bot) return;
        
        bot.status = 'idle';
        bot.currentTask = null;
        bot.performance.tasksCompleted++;
        
        if (success) {
            bot.performance.efficiency = Math.min(2.0, bot.performance.efficiency * 1.05);
        } else {
            bot.performance.efficiency = Math.max(0.5, bot.performance.efficiency * 0.95);
        }
        
        // Assign next task from queue
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.distributeTask(nextTask);
        }
        
        EventBus.emit('multibot:task:completed', {
            botId,
            task,
            success,
            efficiency: bot.performance.efficiency
        });
    }
    
    /**
     * Share resource discovery with all bots
     */
    shareResource(data) {
        const { botId, resource, location } = data;
        
        const resourceKey = `${resource.type}:${location.x},${location.y},${location.z}`;
        
        if (!this.sharedResources.has(resourceKey)) {
            this.sharedResources.set(resourceKey, {
                type: resource.type,
                location,
                discoveredBy: botId,
                quantity: resource.quantity || 1,
                claimed: false
            });
            
            // Broadcast to all bots
            EventBus.emit('multibot:resource:shared', {
                resource: this.sharedResources.get(resourceKey),
                totalShared: this.sharedResources.size
            });
        }
    }
    
    /**
     * Get nearest unclaimed resource
     */
    getNearestResource(position, resourceType) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const [key, resource] of this.sharedResources.entries()) {
            if (resource.claimed) continue;
            if (resourceType && resource.type !== resourceType) continue;
            
            const distance = this.calculateDistance(position, resource.location);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = resource;
            }
        }
        
        return nearest;
    }
    
    /**
     * Calculate distance between two positions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * Get coordination statistics
     */
    getStats() {
        const botArray = Array.from(this.bots.values());
        
        return {
            totalBots: this.bots.size,
            activeBots: botArray.filter(b => b.status === 'busy').length,
            idleBots: botArray.filter(b => b.status === 'idle').length,
            territories: this.territories.size,
            sharedResources: this.sharedResources.size,
            queuedTasks: this.taskQueue.length,
            avgEfficiency: botArray.reduce((sum, b) => sum + b.performance.efficiency, 0) / botArray.length || 0,
            totalTasksCompleted: botArray.reduce((sum, b) => sum + b.performance.tasksCompleted, 0)
        };
    }
}

module.exports = MultiBotCoordinator;
