/**
 * Swarm Coordinator - v4.2.0
 * 
 * Advanced multi-bot swarm intelligence system with:
 * - Master-slave architecture for bot orchestration
 * - Priority-based central task queue
 * - Dynamic resource distribution
 * - Real-time swarm status monitoring
 * - Automatic failover when bot disconnects
 * - Collaborative mining network with shared ore database
 * - Coordinated pathfinding to avoid collisions
 * - Swarm safety protocol for collective threat detection
 * 
 * Designed for low memory footprint (512MB RAM capable)
 */

const EventBus = require('./eventBus');

// Memory-efficient constants
const MAX_SHARED_RESOURCES = 200;
const MAX_THREAT_HISTORY = 50;
const MAX_TASK_QUEUE = 100;
const FAILOVER_TIMEOUT_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 10000;
const PATH_COLLISION_RADIUS = 3;

/**
 * Task priority levels
 */
const TaskPriority = {
    CRITICAL: 100,    // Safety, survival
    HIGH: 75,         // Mining diamonds, combat
    MEDIUM: 50,       // Resource gathering
    LOW: 25,          // Exploration
    IDLE: 0           // Background tasks
};

/**
 * Bot roles for specialized tasks
 */
const BotRole = {
    HARVESTER: 'harvester',
    MINER: 'miner',
    BUILDER: 'builder',
    GUARDIAN: 'guardian',
    SCOUT: 'scout',
    CRAFTER: 'crafter',
    GENERAL: 'general'
};

class SwarmCoordinator {
    constructor(options = {}) {
        this.enabled = process.env.SWARM_ENABLED === 'true' || process.env.MULTIBOT_ENABLED === 'true';
        this.maxBots = parseInt(process.env.SWARM_MAX_BOTS) || parseInt(process.env.MULTIBOT_MAX_BOTS) || 10;
        this.territorySize = parseInt(process.env.SWARM_TERRITORY_SIZE) || 100;
        
        // Core swarm data structures (memory-optimized)
        this.bots = new Map();
        this.territories = new Map();
        this.sharedResources = new Map();
        this.sharedThreats = new Map();
        this.taskQueue = [];
        this.miningNetwork = new Map();
        this.pathReservations = new Map();
        
        // Master bot tracking
        this.masterBotId = null;
        this.lastHeartbeats = new Map();
        this.heartbeatInterval = null;
        
        // Statistics
        this.stats = {
            totalTasksCompleted: 0,
            totalResourcesGathered: 0,
            threatsNeutralized: 0,
            failoversPerformed: 0
        };
        
        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize the swarm coordinator
     */
    initialize() {
        console.log('[Swarm] Coordinator v4.2.0 initializing...');
        console.log(`[Swarm] Max bots: ${this.maxBots}, Territory size: ${this.territorySize}`);
        
        this.setupEventListeners();
        this.startHeartbeatMonitor();
        
        console.log('[Swarm] ✓ Coordinator initialized');
    }

    /**
     * Setup event listeners for swarm coordination
     */
    setupEventListeners() {
        // Bot lifecycle events
        EventBus.on('swarm:bot:register', (data) => this.registerBot(data));
        EventBus.on('swarm:bot:unregister', (data) => this.unregisterBot(data));
        EventBus.on('swarm:bot:heartbeat', (data) => this.handleHeartbeat(data));
        
        // Task events
        EventBus.on('swarm:task:submit', (data) => this.submitTask(data));
        EventBus.on('swarm:task:complete', (data) => this.handleTaskComplete(data));
        EventBus.on('swarm:task:failed', (data) => this.handleTaskFailed(data));
        
        // Resource events
        EventBus.on('swarm:resource:found', (data) => this.shareResource(data));
        EventBus.on('swarm:resource:claim', (data) => this.claimResource(data));
        EventBus.on('swarm:resource:depleted', (data) => this.markResourceDepleted(data));
        
        // Safety events
        EventBus.on('swarm:threat:detected', (data) => this.handleThreatDetected(data));
        EventBus.on('swarm:threat:cleared', (data) => this.handleThreatCleared(data));
        
        // Path coordination
        EventBus.on('swarm:path:reserve', (data) => this.reservePath(data));
        EventBus.on('swarm:path:release', (data) => this.releasePath(data));
        
        // Backwards compatibility with old events
        EventBus.on('bot:register', (data) => this.registerBot(data));
        EventBus.on('bot:unregister', (data) => this.unregisterBot(data));
        EventBus.on('bot:task:complete', (data) => this.handleTaskComplete(data));
        EventBus.on('bot:resource:found', (data) => this.shareResource(data));
    }

    /**
     * Start heartbeat monitor for failover detection
     */
    startHeartbeatMonitor() {
        this.heartbeatInterval = setInterval(() => {
            this.checkBotHealth();
        }, HEARTBEAT_INTERVAL_MS);
    }

    /**
     * Stop heartbeat monitor
     */
    stopHeartbeatMonitor() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Check bot health and trigger failover if needed
     */
    checkBotHealth() {
        const now = Date.now();
        const deadBots = [];

        for (const [botId, lastHeartbeat] of this.lastHeartbeats.entries()) {
            if (now - lastHeartbeat > FAILOVER_TIMEOUT_MS) {
                deadBots.push(botId);
            }
        }

        for (const botId of deadBots) {
            console.log(`[Swarm] Bot ${botId} appears dead (no heartbeat). Initiating failover...`);
            this.handleBotFailover(botId);
        }

        // Check if master needs to be re-elected
        if (this.masterBotId && deadBots.includes(this.masterBotId)) {
            this.electNewMaster();
        }
    }

    /**
     * Handle bot registration
     */
    registerBot(data) {
        const { botId, position, capabilities, role } = data;

        if (this.bots.size >= this.maxBots) {
            console.warn(`[Swarm] Cannot register bot ${botId}: max bots (${this.maxBots}) reached`);
            return false;
        }

        const territory = this.assignTerritory(position);
        const assignedRole = role || this.assignOptimalRole(capabilities);

        const botData = {
            id: botId,
            position: position ? { x: position.x, y: position.y, z: position.z } : null,
            capabilities: capabilities || [],
            role: assignedRole,
            territory,
            status: 'idle',
            currentTask: null,
            resources: {},
            performance: {
                tasksCompleted: 0,
                efficiency: 1.0,
                uptime: 0,
                lastActive: Date.now()
            },
            health: 20,
            isMaster: false
        };

        this.bots.set(botId, botData);
        this.lastHeartbeats.set(botId, Date.now());

        // Elect master if this is the first bot
        if (this.bots.size === 1 || !this.masterBotId) {
            this.electNewMaster();
        }

        console.log(`[Swarm] Registered bot ${botId} as ${assignedRole} in territory ${territory.id}`);

        EventBus.emit('swarm:bot:registered', {
            botId,
            role: assignedRole,
            territory,
            totalBots: this.bots.size,
            isMaster: botData.isMaster
        });

        return true;
    }

    /**
     * Assign optimal role based on capabilities
     */
    assignOptimalRole(capabilities = []) {
        // Check what roles are needed
        const roleCounts = {};
        for (const bot of this.bots.values()) {
            roleCounts[bot.role] = (roleCounts[bot.role] || 0) + 1;
        }

        // Prioritize roles that are missing
        if (!roleCounts[BotRole.GUARDIAN]) return BotRole.GUARDIAN;
        if (!roleCounts[BotRole.MINER]) return BotRole.MINER;
        if (!roleCounts[BotRole.HARVESTER]) return BotRole.HARVESTER;
        if (!roleCounts[BotRole.SCOUT]) return BotRole.SCOUT;

        // Assign based on capabilities
        if (capabilities.includes('combat')) return BotRole.GUARDIAN;
        if (capabilities.includes('mining')) return BotRole.MINER;
        if (capabilities.includes('farming')) return BotRole.HARVESTER;
        if (capabilities.includes('building')) return BotRole.BUILDER;
        if (capabilities.includes('crafting')) return BotRole.CRAFTER;
        if (capabilities.includes('exploration')) return BotRole.SCOUT;

        return BotRole.GENERAL;
    }

    /**
     * Unregister a bot from the swarm
     */
    unregisterBot(data) {
        const { botId } = data;

        if (!this.bots.has(botId)) return;

        const bot = this.bots.get(botId);

        // Reassign any pending tasks
        if (bot.currentTask) {
            this.requeueTask(bot.currentTask);
        }

        // Free territory
        if (bot.territory) {
            this.territories.delete(bot.territory.id);
        }

        // Release any path reservations
        this.releaseAllPaths(botId);

        this.bots.delete(botId);
        this.lastHeartbeats.delete(botId);

        console.log(`[Swarm] Unregistered bot ${botId}`);

        // Elect new master if needed
        if (botId === this.masterBotId) {
            this.electNewMaster();
        }

        EventBus.emit('swarm:bot:unregistered', {
            botId,
            totalBots: this.bots.size
        });
    }

    /**
     * Handle bot heartbeat
     */
    handleHeartbeat(data) {
        const { botId, position, health, status } = data;

        if (!this.bots.has(botId)) return;

        this.lastHeartbeats.set(botId, Date.now());

        const bot = this.bots.get(botId);
        if (position) bot.position = { x: position.x, y: position.y, z: position.z };
        if (health !== undefined) bot.health = health;
        if (status) bot.status = status;
        bot.performance.lastActive = Date.now();
    }

    /**
     * Handle bot failover
     */
    handleBotFailover(botId) {
        const bot = this.bots.get(botId);
        if (!bot) return;

        // Requeue the bot's current task
        if (bot.currentTask) {
            this.requeueTask(bot.currentTask, TaskPriority.HIGH);
        }

        // Release resources
        this.releaseAllPaths(botId);
        this.unclaimBotResources(botId);

        // Remove bot
        this.bots.delete(botId);
        this.lastHeartbeats.delete(botId);

        this.stats.failoversPerformed++;

        console.log(`[Swarm] Failover complete for bot ${botId}`);

        EventBus.emit('swarm:bot:failover', {
            botId,
            totalBots: this.bots.size,
            failoversTotal: this.stats.failoversPerformed
        });
    }

    /**
     * Elect a new master bot
     */
    electNewMaster() {
        // Clear previous master
        if (this.masterBotId && this.bots.has(this.masterBotId)) {
            const oldMaster = this.bots.get(this.masterBotId);
            oldMaster.isMaster = false;
        }

        // Find bot with best performance
        let bestBot = null;
        let bestScore = -Infinity;

        for (const bot of this.bots.values()) {
            const score = bot.performance.efficiency * 100 + bot.performance.tasksCompleted;
            if (score > bestScore) {
                bestScore = score;
                bestBot = bot;
            }
        }

        if (bestBot) {
            this.masterBotId = bestBot.id;
            bestBot.isMaster = true;
            console.log(`[Swarm] Elected new master: ${bestBot.id}`);

            EventBus.emit('swarm:master:elected', {
                masterId: bestBot.id,
                totalBots: this.bots.size
            });
        } else {
            this.masterBotId = null;
        }
    }

    /**
     * Assign territory to a bot
     */
    assignTerritory(position) {
        if (!position) {
            return { id: 'spawn', bounds: null };
        }

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
                threats: [],
                claimed: true
            });
        }

        return this.territories.get(territoryId);
    }

    /**
     * Submit a task to the swarm queue
     */
    submitTask(data) {
        const { task, priority = TaskPriority.MEDIUM, requiredRole, requiredCapability, location } = data;

        const taskData = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            task,
            priority,
            requiredRole,
            requiredCapability,
            location,
            submittedAt: Date.now(),
            assignedTo: null,
            attempts: 0
        };

        // Insert task in priority order
        const insertIndex = this.taskQueue.findIndex(t => t.priority < priority);
        if (insertIndex === -1) {
            this.taskQueue.push(taskData);
        } else {
            this.taskQueue.splice(insertIndex, 0, taskData);
        }

        // Limit queue size for memory
        if (this.taskQueue.length > MAX_TASK_QUEUE) {
            this.taskQueue.pop(); // Remove lowest priority
        }

        // Try to assign immediately
        this.processTaskQueue();

        return taskData.id;
    }

    /**
     * Requeue a task (for failover)
     */
    requeueTask(task, newPriority) {
        task.priority = newPriority || task.priority;
        task.assignedTo = null;
        task.attempts++;

        // Insert in priority order
        const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
        if (insertIndex === -1) {
            this.taskQueue.push(task);
        } else {
            this.taskQueue.splice(insertIndex, 0, task);
        }
    }

    /**
     * Process the task queue and assign tasks to bots
     */
    processTaskQueue() {
        if (this.taskQueue.length === 0) return;

        for (let i = 0; i < this.taskQueue.length; i++) {
            const task = this.taskQueue[i];
            if (task.assignedTo) continue;

            const assignedBotId = this.assignTaskToBot(task);
            if (assignedBotId) {
                task.assignedTo = assignedBotId;
                this.taskQueue.splice(i, 1);
                i--;
            }
        }
    }

    /**
     * Assign a task to the best available bot
     */
    assignTaskToBot(task) {
        const availableBots = Array.from(this.bots.values()).filter(bot => {
            if (bot.status !== 'idle') return false;
            if (task.requiredRole && bot.role !== task.requiredRole) return false;
            if (task.requiredCapability && !bot.capabilities.includes(task.requiredCapability)) return false;
            return true;
        });

        if (availableBots.length === 0) return null;

        // Score bots and select the best one
        let bestBot = null;
        let bestScore = -Infinity;

        for (const bot of availableBots) {
            let score = bot.performance.efficiency * 100;

            // Factor in distance if location is specified
            if (task.location && bot.position) {
                const distance = this.calculateDistance(bot.position, task.location);
                score -= distance * 0.1;
            }

            // Prefer experienced bots
            score += bot.performance.tasksCompleted * 0.5;

            // Prefer bots with matching role
            if (task.requiredRole && bot.role === task.requiredRole) {
                score += 50;
            }

            if (score > bestScore) {
                bestScore = score;
                bestBot = bot;
            }
        }

        if (bestBot) {
            bestBot.status = 'busy';
            bestBot.currentTask = task;

            EventBus.emit('swarm:task:assigned', {
                botId: bestBot.id,
                taskId: task.id,
                task: task.task
            });

            return bestBot.id;
        }

        return null;
    }

    /**
     * Handle task completion
     */
    handleTaskComplete(data) {
        const { botId, taskId, result } = data;
        const bot = this.bots.get(botId);

        if (!bot) return;

        bot.status = 'idle';
        bot.currentTask = null;
        bot.performance.tasksCompleted++;
        bot.performance.efficiency = Math.min(2.0, bot.performance.efficiency * 1.05);

        this.stats.totalTasksCompleted++;

        EventBus.emit('swarm:task:completed', {
            botId,
            taskId,
            result,
            efficiency: bot.performance.efficiency
        });

        // Process next task
        this.processTaskQueue();
    }

    /**
     * Handle task failure
     */
    handleTaskFailed(data) {
        const { botId, taskId, reason, task } = data;
        const bot = this.bots.get(botId);

        if (!bot) return;

        bot.status = 'idle';
        bot.currentTask = null;
        bot.performance.efficiency = Math.max(0.5, bot.performance.efficiency * 0.95);

        // Requeue task if not too many attempts
        if (task && task.attempts < 3) {
            this.requeueTask(task);
        }

        EventBus.emit('swarm:task:failed', {
            botId,
            taskId,
            reason,
            requeued: task && task.attempts < 3
        });

        // Process next task
        this.processTaskQueue();
    }

    /**
     * Share a resource discovery with the swarm
     */
    shareResource(data) {
        const { botId, resource, location } = data;

        if (!location) return;

        const resourceKey = `${resource.type}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;

        // Memory limit check
        if (this.sharedResources.size >= MAX_SHARED_RESOURCES) {
            // Remove oldest unclaimed resource
            for (const [key, res] of this.sharedResources.entries()) {
                if (!res.claimed) {
                    this.sharedResources.delete(key);
                    break;
                }
            }
        }

        if (!this.sharedResources.has(resourceKey)) {
            this.sharedResources.set(resourceKey, {
                key: resourceKey,
                type: resource.type,
                location: { x: location.x, y: location.y, z: location.z },
                discoveredBy: botId,
                quantity: resource.quantity || 1,
                claimed: false,
                claimedBy: null,
                timestamp: Date.now()
            });

            // Add to mining network if it's an ore
            if (this.isOre(resource.type)) {
                this.addToMiningNetwork(resource.type, location);
            }

            EventBus.emit('swarm:resource:shared', {
                resource: this.sharedResources.get(resourceKey),
                totalShared: this.sharedResources.size
            });
        }
    }

    /**
     * Check if resource type is an ore
     */
    isOre(type) {
        const ores = ['diamond', 'iron', 'gold', 'coal', 'emerald', 'lapis', 'redstone', 'copper', 'ancient_debris'];
        return ores.some(ore => type.includes(ore));
    }

    /**
     * Add ore location to mining network
     */
    addToMiningNetwork(oreType, location) {
        if (!this.miningNetwork.has(oreType)) {
            this.miningNetwork.set(oreType, []);
        }

        const oreList = this.miningNetwork.get(oreType);

        // Avoid duplicates
        const exists = oreList.some(loc =>
            Math.abs(loc.x - location.x) < 5 &&
            Math.abs(loc.y - location.y) < 5 &&
            Math.abs(loc.z - location.z) < 5
        );

        if (!exists) {
            oreList.push({
                x: Math.floor(location.x),
                y: Math.floor(location.y),
                z: Math.floor(location.z),
                timestamp: Date.now()
            });

            // Keep list manageable
            if (oreList.length > 50) {
                oreList.shift();
            }
        }
    }

    /**
     * Claim a resource for a bot
     */
    claimResource(data) {
        const { botId, resourceKey } = data;

        if (!this.sharedResources.has(resourceKey)) return false;

        const resource = this.sharedResources.get(resourceKey);
        if (resource.claimed) return false;

        resource.claimed = true;
        resource.claimedBy = botId;

        EventBus.emit('swarm:resource:claimed', {
            botId,
            resource
        });

        return true;
    }

    /**
     * Mark a resource as depleted
     */
    markResourceDepleted(data) {
        const { resourceKey } = data;

        if (this.sharedResources.has(resourceKey)) {
            this.sharedResources.delete(resourceKey);
            this.stats.totalResourcesGathered++;

            EventBus.emit('swarm:resource:depleted', {
                resourceKey,
                totalRemaining: this.sharedResources.size
            });
        }
    }

    /**
     * Unclaim all resources claimed by a bot (for failover)
     */
    unclaimBotResources(botId) {
        for (const resource of this.sharedResources.values()) {
            if (resource.claimedBy === botId) {
                resource.claimed = false;
                resource.claimedBy = null;
            }
        }
    }

    /**
     * Handle threat detection (collective threat awareness)
     */
    handleThreatDetected(data) {
        const { botId, threat, location, severity } = data;

        const threatKey = `threat_${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;

        // Memory limit check
        if (this.sharedThreats.size >= MAX_THREAT_HISTORY) {
            // Remove oldest threat
            const firstKey = this.sharedThreats.keys().next().value;
            this.sharedThreats.delete(firstKey);
        }

        this.sharedThreats.set(threatKey, {
            type: threat.type,
            location: { x: location.x, y: location.y, z: location.z },
            severity: severity || 'medium',
            detectedBy: botId,
            timestamp: Date.now(),
            active: true
        });

        // Alert all bots in the area
        for (const bot of this.bots.values()) {
            if (bot.id !== botId && bot.position) {
                const distance = this.calculateDistance(bot.position, location);
                if (distance < 100) { // 100 block alert radius
                    EventBus.emit('swarm:threat:alert', {
                        targetBotId: bot.id,
                        threat: this.sharedThreats.get(threatKey),
                        distance
                    });
                }
            }
        }

        EventBus.emit('swarm:threat:detected', {
            threatKey,
            threat: this.sharedThreats.get(threatKey),
            totalThreats: this.sharedThreats.size
        });
    }

    /**
     * Handle threat cleared
     */
    handleThreatCleared(data) {
        const { threatKey, botId } = data;

        if (this.sharedThreats.has(threatKey)) {
            const threat = this.sharedThreats.get(threatKey);
            threat.active = false;
            this.stats.threatsNeutralized++;

            EventBus.emit('swarm:threat:cleared', {
                threatKey,
                clearedBy: botId,
                threatsNeutralized: this.stats.threatsNeutralized
            });

            // Remove after a delay
            setTimeout(() => {
                this.sharedThreats.delete(threatKey);
            }, 60000); // Keep for 1 minute for awareness
        }
    }

    /**
     * Reserve a path segment to avoid collisions
     */
    reservePath(data) {
        const { botId, waypoints } = data;

        if (!waypoints || waypoints.length === 0) return true;

        // Check for collisions with other reservations
        for (const [otherId, otherPath] of this.pathReservations.entries()) {
            if (otherId === botId) continue;

            for (const wp of waypoints) {
                for (const otherWp of otherPath) {
                    const distance = this.calculateDistance(wp, otherWp);
                    if (distance < PATH_COLLISION_RADIUS) {
                        return false; // Collision detected
                    }
                }
            }
        }

        // Reserve the path
        this.pathReservations.set(botId, waypoints);

        return true;
    }

    /**
     * Release a bot's path reservation
     */
    releasePath(data) {
        const { botId } = data;
        this.pathReservations.delete(botId);
    }

    /**
     * Release all paths for a bot
     */
    releaseAllPaths(botId) {
        this.pathReservations.delete(botId);
    }

    /**
     * Get nearest unclaimed resource
     */
    getNearestResource(position, resourceType) {
        if (!position) return null;

        let nearest = null;
        let minDistance = Infinity;

        for (const resource of this.sharedResources.values()) {
            if (resource.claimed) continue;
            if (resourceType && !resource.type.includes(resourceType)) continue;

            const distance = this.calculateDistance(position, resource.location);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = resource;
            }
        }

        return nearest;
    }

    /**
     * Get known ore locations from mining network
     */
    getOreLocations(oreType) {
        if (this.miningNetwork.has(oreType)) {
            return [...this.miningNetwork.get(oreType)];
        }
        return [];
    }

    /**
     * Get all bots with a specific role
     */
    getBotsByRole(role) {
        return Array.from(this.bots.values()).filter(bot => bot.role === role);
    }

    /**
     * Get nearby threats for a position
     */
    getNearbyThreats(position, radius = 50) {
        const threats = [];

        for (const threat of this.sharedThreats.values()) {
            if (!threat.active) continue;

            const distance = this.calculateDistance(position, threat.location);
            if (distance < radius) {
                threats.push({ ...threat, distance });
            }
        }

        return threats.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Calculate distance between two positions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = (pos1.y || 0) - (pos2.y || 0);
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get swarm statistics
     */
    getStats() {
        const botArray = Array.from(this.bots.values());

        return {
            enabled: this.enabled,
            totalBots: this.bots.size,
            masterBotId: this.masterBotId,
            activeBots: botArray.filter(b => b.status === 'busy').length,
            idleBots: botArray.filter(b => b.status === 'idle').length,
            territories: this.territories.size,
            sharedResources: this.sharedResources.size,
            activeThreats: Array.from(this.sharedThreats.values()).filter(t => t.active).length,
            queuedTasks: this.taskQueue.length,
            avgEfficiency: botArray.length > 0
                ? botArray.reduce((sum, b) => sum + b.performance.efficiency, 0) / botArray.length
                : 0,
            ...this.stats,
            miningNetwork: {
                oreTypes: this.miningNetwork.size,
                totalLocations: Array.from(this.miningNetwork.values()).reduce((sum, arr) => sum + arr.length, 0)
            },
            roleDistribution: this.getRoleDistribution()
        };
    }

    /**
     * Get role distribution
     */
    getRoleDistribution() {
        const distribution = {};
        for (const bot of this.bots.values()) {
            distribution[bot.role] = (distribution[bot.role] || 0) + 1;
        }
        return distribution;
    }

    /**
     * Get bot info
     */
    getBotInfo(botId) {
        return this.bots.get(botId) || null;
    }

    /**
     * Get all bots
     */
    getAllBots() {
        return Array.from(this.bots.values());
    }

    /**
     * Cleanup and shutdown
     */
    cleanup() {
        this.stopHeartbeatMonitor();
        this.bots.clear();
        this.territories.clear();
        this.sharedResources.clear();
        this.sharedThreats.clear();
        this.taskQueue = [];
        this.miningNetwork.clear();
        this.pathReservations.clear();

        console.log('[Swarm] Coordinator cleanup complete');
    }
}

// Export class and constants
module.exports = SwarmCoordinator;
module.exports.TaskPriority = TaskPriority;
module.exports.BotRole = BotRole;
