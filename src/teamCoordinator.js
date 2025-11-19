const CONSTANTS = require('./constants');

/**
 * Team Coordinator - Manages multiple bot instances working as a team
 * 
 * Coordinates three specialized bots:
 * 1. Defender Bot - Protects the base from threats
 * 2. Builder Bot - Constructs and expands the base
 * 3. Miner Bot - Mines resources and returns to base
 * 
 * Enables teamwork, resource sharing, and collaborative operations
 */
class TeamCoordinator {
    constructor(notifier) {
        this.notifier = notifier;
        this.bots = new Map(); // botId -> bot instance
        this.roles = new Map(); // botId -> role
        this.sharedResources = {
            materials: new Map(),
            storageLocation: null,
            baseLocation: null,
            defensePerimeter: null
        };
        
        // Communication channels
        this.messages = [];
        this.requests = new Map(); // requestId -> { from, to, type, data, status }
        this.requestIdCounter = 0;
        
        // Team status
        this.teamStatus = {
            defender: { active: false, health: 0, position: null, alerts: 0 },
            builder: { active: false, health: 0, position: null, progress: 0 },
            miner: { active: false, health: 0, position: null, inventory: 0 }
        };
        
        // Coordination settings
        this.HELP_DISTANCE_THRESHOLD = 50; // Max distance to help another bot
        this.RESOURCE_SHARE_THRESHOLD = 0.7; // Share when inventory is 70% full
        
        console.log('✓ Team Coordinator initialized');
    }
    
    /**
     * Register a bot with the team
     * @param {string} botId - Unique bot identifier
     * @param {Object} botInstance - The bot instance
     * @param {string} role - Bot role: 'defender', 'builder', or 'miner'
     */
    registerBot(botId, botInstance, role) {
        if (!['defender', 'builder', 'miner'].includes(role)) {
            throw new Error(`Invalid role: ${role}. Must be 'defender', 'builder', or 'miner'`);
        }
        
        this.bots.set(botId, botInstance);
        this.roles.set(botId, role);
        this.teamStatus[role].active = true;
        
        console.log(`✓ Bot registered: ${botId} as ${role}`);
        this.notifier.send(`🤖 Team member joined: ${role.toUpperCase()}`);
    }
    
    /**
     * Set the shared base location for all bots
     * @param {Vec3} position - Base position
     */
    setBaseLocation(position) {
        this.sharedResources.baseLocation = position.clone();
        this.broadcastMessage('system', 'BASE_LOCATION_SET', { position });
        console.log(`Base location set: ${position}`);
    }
    
    /**
     * Set the shared storage location
     * @param {Vec3} position - Storage location
     */
    setStorageLocation(position) {
        this.sharedResources.storageLocation = position.clone();
        this.broadcastMessage('system', 'STORAGE_LOCATION_SET', { position });
        console.log(`Storage location set: ${position}`);
    }
    
    /**
     * Update team status for a specific bot
     * @param {string} botId - Bot identifier
     * @param {Object} status - Status update
     */
    updateBotStatus(botId, status) {
        const role = this.roles.get(botId);
        if (!role) return;
        
        this.teamStatus[role] = {
            ...this.teamStatus[role],
            ...status
        };
    }
    
    /**
     * Broadcast a message to all team members
     * @param {string} from - Sender bot ID
     * @param {string} type - Message type
     * @param {Object} data - Message data
     */
    broadcastMessage(from, type, data) {
        const message = {
            timestamp: Date.now(),
            from,
            type,
            data
        };
        
        this.messages.push(message);
        
        // Keep only last 100 messages
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        
        console.log(`[TEAM] ${from} -> ALL: ${type}`, data);
    }
    
    /**
     * Send a request from one bot to another
     * @param {string} fromId - Requesting bot
     * @param {string} toRole - Target role
     * @param {string} type - Request type
     * @param {Object} data - Request data
     * @returns {number} Request ID
     */
    sendRequest(fromId, toRole, type, data) {
        const requestId = this.requestIdCounter++;
        const targetBot = this.getBotByRole(toRole);
        
        if (!targetBot) {
            console.warn(`No bot found with role: ${toRole}`);
            return null;
        }
        
        const request = {
            id: requestId,
            from: fromId,
            to: toRole,
            type,
            data,
            status: 'pending',
            timestamp: Date.now()
        };
        
        this.requests.set(requestId, request);
        console.log(`[TEAM] Request #${requestId}: ${fromId} -> ${toRole}: ${type}`);
        
        return requestId;
    }
    
    /**
     * Respond to a request
     * @param {number} requestId - Request ID
     * @param {string} status - 'accepted', 'rejected', or 'completed'
     * @param {Object} response - Response data
     */
    respondToRequest(requestId, status, response = {}) {
        const request = this.requests.get(requestId);
        if (!request) return;
        
        request.status = status;
        request.response = response;
        request.completedAt = Date.now();
        
        console.log(`[TEAM] Request #${requestId} ${status}:`, response);
    }
    
    /**
     * Get pending requests for a specific bot role
     * @param {string} role - Bot role
     * @returns {Array} Pending requests
     */
    getPendingRequests(role) {
        return Array.from(this.requests.values())
            .filter(req => req.to === role && req.status === 'pending');
    }
    
    /**
     * Get a bot instance by role
     * @param {string} role - Bot role
     * @returns {Object|null} Bot instance
     */
    getBotByRole(role) {
        for (const [botId, botRole] of this.roles.entries()) {
            if (botRole === role) {
                return this.bots.get(botId);
            }
        }
        return null;
    }
    
    /**
     * Check if a bot needs help
     * @param {string} botId - Bot to check
     * @returns {boolean} True if help is needed
     */
    needsHelp(botId) {
        const role = this.roles.get(botId);
        if (!role) return false;
        
        const status = this.teamStatus[role];
        
        // Check if health is critically low
        if (status.health < 30) return true;
        
        // Role-specific help conditions
        if (role === 'defender' && status.alerts > 3) return true;
        if (role === 'miner' && status.inventory > 90) return true;
        
        return false;
    }
    
    /**
     * Find the best bot to help with a task
     * @param {string} requestingBotId - Bot requesting help
     * @param {Vec3} location - Location where help is needed
     * @returns {string|null} Bot ID that can help, or null
     */
    findHelperBot(requestingBotId, location) {
        const requestingRole = this.roles.get(requestingBotId);
        let bestBot = null;
        let minDistance = this.HELP_DISTANCE_THRESHOLD;
        
        for (const [botId, bot] of this.bots.entries()) {
            if (botId === requestingBotId) continue;
            
            const role = this.roles.get(botId);
            const status = this.teamStatus[role];
            
            // Skip if bot is not active or unhealthy
            if (!status.active || status.health < 50) continue;
            
            // Calculate distance
            if (status.position) {
                const distance = status.position.distanceTo(location);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestBot = botId;
                }
            }
        }
        
        return bestBot;
    }
    
    /**
     * Add resources to shared pool
     * @param {string} itemName - Item name
     * @param {number} quantity - Quantity to add
     */
    addSharedResource(itemName, quantity) {
        const current = this.sharedResources.materials.get(itemName) || 0;
        this.sharedResources.materials.set(itemName, current + quantity);
        
        this.broadcastMessage('system', 'RESOURCE_ADDED', { item: itemName, quantity, total: current + quantity });
    }
    
    /**
     * Take resources from shared pool
     * @param {string} itemName - Item name
     * @param {number} quantity - Quantity to take
     * @returns {number} Actual quantity taken
     */
    takeSharedResource(itemName, quantity) {
        const current = this.sharedResources.materials.get(itemName) || 0;
        const taken = Math.min(current, quantity);
        
        this.sharedResources.materials.set(itemName, current - taken);
        
        if (taken > 0) {
            this.broadcastMessage('system', 'RESOURCE_TAKEN', { item: itemName, quantity: taken, remaining: current - taken });
        }
        
        return taken;
    }
    
    /**
     * Get current team status summary
     * @returns {Object} Team status
     */
    getTeamStatus() {
        return {
            ...this.teamStatus,
            sharedResources: Object.fromEntries(this.sharedResources.materials),
            activeRequests: this.requests.size,
            recentMessages: this.messages.slice(-10)
        };
    }
    
    /**
     * Generate a team coordination report
     * @returns {string} Status report
     */
    generateReport() {
        const lines = [
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '        TEAM STATUS REPORT',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            ''
        ];
        
        // Defender status
        const def = this.teamStatus.defender;
        lines.push(`DEFENDER: ${def.active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
        lines.push(`  Health: ${def.health}/20 | Alerts: ${def.alerts}`);
        lines.push(`  Position: ${def.position || 'Unknown'}`);
        lines.push('');
        
        // Builder status
        const builder = this.teamStatus.builder;
        lines.push(`BUILDER: ${builder.active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
        lines.push(`  Health: ${builder.health}/20 | Progress: ${builder.progress}%`);
        lines.push(`  Position: ${builder.position || 'Unknown'}`);
        lines.push('');
        
        // Miner status
        const miner = this.teamStatus.miner;
        lines.push(`MINER: ${miner.active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
        lines.push(`  Health: ${miner.health}/20 | Inventory: ${miner.inventory}%`);
        lines.push(`  Position: ${miner.position || 'Unknown'}`);
        lines.push('');
        
        // Shared resources
        lines.push('SHARED RESOURCES:');
        if (this.sharedResources.materials.size === 0) {
            lines.push('  (none)');
        } else {
            for (const [item, qty] of this.sharedResources.materials.entries()) {
                lines.push(`  ${item}: ${qty}`);
            }
        }
        lines.push('');
        
        // Active requests
        const pending = Array.from(this.requests.values()).filter(r => r.status === 'pending');
        lines.push(`ACTIVE REQUESTS: ${pending.length}`);
        pending.slice(0, 5).forEach(req => {
            lines.push(`  #${req.id}: ${req.from} -> ${req.to} [${req.type}]`);
        });
        
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return lines.join('\n');
    }
}

module.exports = TeamCoordinator;
