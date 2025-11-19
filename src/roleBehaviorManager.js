const { getRoleConfig, isTaskEnabled, getTaskPriority, getBehaviorSettings } = require('./roleConfigs');

/**
 * Role-Based Behavior Manager
 * 
 * Manages bot behavior based on its assigned role within the team
 * Coordinates with TeamCoordinator for team-based operations
 */
class RoleBehaviorManager {
    constructor(bot, systems, notifier, role, teamCoordinator) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        this.role = role;
        this.teamCoordinator = teamCoordinator;
        this.roleConfig = getRoleConfig(role);
        this.behaviorSettings = getBehaviorSettings(role);
        
        this.currentGoal = null;
        this.isActive = false;
        this.lastUpdate = Date.now();
        this.performanceMetrics = {
            tasksCompleted: 0,
            resourcesGathered: 0,
            threatsEliminated: 0,
            distanceTraveled: 0
        };
        
        console.log(`✓ Role Behavior Manager initialized for ${this.roleConfig.name}`);
    }
    
    async start() {
        console.log(`${this.roleConfig.name} bot starting autonomous operations...`);
        this.isActive = true;
        
        await this.notifier.send(`🤖 ${this.roleConfig.name} bot activated`);
        
        // Start role-specific behavior loop
        this.behaviorLoop();
    }
    
    stop() {
        this.isActive = false;
        console.log(`${this.roleConfig.name} bot stopped`);
    }
    
    /**
     * Main behavior loop - continuously evaluates and executes tasks
     */
    async behaviorLoop() {
        while (this.isActive) {
            try {
                // Check if bot is still connected
                if (!this.bot || !this.bot.entity) {
                    console.log(`[${this.role}] Bot disconnected, stopping behavior loop`);
                    this.isActive = false;
                    break;
                }
                
                // Update team coordinator with current status
                this.updateTeamStatus();
                
                // Check for team requests
                await this.checkTeamRequests();
                
                // Evaluate and execute next task
                await this.evaluateAndExecute();
                
                // Wait before next iteration
                await this.sleep(2000); // 2 second delay
            } catch (error) {
                console.error(`Error in ${this.role} behavior loop:`, error.message);
                
                // If error is critical, stop the loop
                if (error.message?.includes('bot is not connected') || 
                    error.message?.includes('Cannot read') ||
                    !this.bot) {
                    console.log(`[${this.role}] Critical error, stopping behavior loop`);
                    this.isActive = false;
                    break;
                }
                
                await this.sleep(5000); // Longer delay on error
            }
        }
        
        console.log(`[${this.role}] Behavior loop ended`);
    }
    
    /**
     * Update team coordinator with current status
     */
    updateTeamStatus() {
        const health = this.bot.health || 0;
        const position = this.bot.entity?.position || null;
        
        let roleSpecificStatus = {};
        
        if (this.role === 'defender') {
            roleSpecificStatus.alerts = this.getNearbyThreats().length;
        } else if (this.role === 'builder') {
            roleSpecificStatus.progress = this.calculateBuildProgress();
        } else if (this.role === 'miner') {
            roleSpecificStatus.inventory = this.calculateInventoryFullness();
        }
        
        this.teamCoordinator.updateBotStatus(this.bot.username, {
            active: this.isActive,
            health,
            position,
            ...roleSpecificStatus
        });
    }
    
    /**
     * Check for and respond to team requests
     */
    async checkTeamRequests() {
        const requests = this.teamCoordinator.getPendingRequests(this.role);
        
        for (const request of requests) {
            await this.handleTeamRequest(request);
        }
    }
    
    /**
     * Handle a team request
     * @param {Object} request - Request object
     */
    async handleTeamRequest(request) {
        console.log(`[${this.role}] Handling request #${request.id}: ${request.type}`);
        
        switch (request.type) {
            case 'HELP_NEEDED':
                await this.respondToHelpRequest(request);
                break;
            case 'RESOURCE_REQUEST':
                await this.respondToResourceRequest(request);
                break;
            case 'DEFEND_LOCATION':
                if (this.role === 'defender') {
                    await this.defendLocation(request.data.location);
                    this.teamCoordinator.respondToRequest(request.id, 'completed');
                }
                break;
            case 'BUILD_STRUCTURE':
                if (this.role === 'builder') {
                    await this.buildStructure(request.data.structure);
                    this.teamCoordinator.respondToRequest(request.id, 'completed');
                }
                break;
            case 'MINE_RESOURCE':
                if (this.role === 'miner') {
                    await this.mineResource(request.data.resource);
                    this.teamCoordinator.respondToRequest(request.id, 'completed');
                }
                break;
            default:
                console.log(`Unknown request type: ${request.type}`);
                this.teamCoordinator.respondToRequest(request.id, 'rejected', { reason: 'unknown_type' });
        }
    }
    
    /**
     * Respond to a help request from another bot
     */
    async respondToHelpRequest(request) {
        const { location, reason } = request.data;
        
        // Check if we can help (distance, health, etc.)
        if (this.bot.health < 50) {
            this.teamCoordinator.respondToRequest(request.id, 'rejected', { reason: 'low_health' });
            return;
        }
        
        if (this.bot.entity.position.distanceTo(location) > this.teamCoordinator.HELP_DISTANCE_THRESHOLD) {
            this.teamCoordinator.respondToRequest(request.id, 'rejected', { reason: 'too_far' });
            return;
        }
        
        // Accept and move to help
        this.teamCoordinator.respondToRequest(request.id, 'accepted');
        
        console.log(`[${this.role}] Moving to help at ${location}`);
        await this.systems.pathfinding.navigateToPosition(location);
        
        this.teamCoordinator.respondToRequest(request.id, 'completed');
    }
    
    /**
     * Respond to a resource request
     */
    async respondToResourceRequest(request) {
        const { item, quantity } = request.data;
        
        // Check if we have the resource
        const available = this.systems.inventory.countItem(item);
        
        if (available < quantity) {
            this.teamCoordinator.respondToRequest(request.id, 'rejected', { reason: 'insufficient_resources' });
            return;
        }
        
        // Accept request
        this.teamCoordinator.respondToRequest(request.id, 'accepted');
        
        // Drop items for pickup or store in shared storage
        const storageLocation = this.teamCoordinator.sharedResources.storageLocation;
        if (storageLocation) {
            await this.systems.pathfinding.navigateToPosition(storageLocation);
            // Store items in chest
            this.teamCoordinator.addSharedResource(item, quantity);
        }
        
        this.teamCoordinator.respondToRequest(request.id, 'completed', { delivered: quantity });
    }
    
    /**
     * Evaluate priorities and execute next task
     */
    async evaluateAndExecute() {
        // Role-specific task evaluation
        switch (this.role) {
            case 'defender':
                await this.executeDefenderTasks();
                break;
            case 'builder':
                await this.executeBuilderTasks();
                break;
            case 'miner':
                await this.executeMinerTasks();
                break;
        }
    }
    
    /**
     * Execute defender-specific tasks
     */
    async executeDefenderTasks() {
        // Priority 1: Check for nearby threats
        const threats = this.getNearbyThreats();
        if (threats.length > 0) {
            await this.engageThreats(threats);
            return;
        }
        
        // Priority 2: Patrol base perimeter
        if (isTaskEnabled('defender', 'patrol')) {
            await this.patrolBase();
        }
        
        // Priority 3: Check and maintain lighting
        if (isTaskEnabled('defender', 'lighting')) {
            await this.maintainLighting();
        }
    }
    
    /**
     * Execute builder-specific tasks
     */
    async executeBuilderTasks() {
        // Priority 1: Check if we need materials
        const needsMaterials = await this.checkMaterialNeeds();
        if (needsMaterials) {
            await this.gatherBuildingMaterials();
            return;
        }
        
        // Priority 2: Continue current construction project
        if (this.currentGoal && this.currentGoal.type === 'build') {
            await this.continueBuildingProject();
            return;
        }
        
        // Priority 3: Start new construction project
        if (isTaskEnabled('builder', 'building')) {
            await this.startNewBuildingProject();
        }
    }
    
    /**
     * Execute miner-specific tasks
     */
    async executeMinerTasks() {
        // Priority 1: Return to base if inventory is full
        const inventoryFullness = this.calculateInventoryFullness();
        if (inventoryFullness > (this.behaviorSettings.inventoryReturnThreshold * 100)) {
            await this.returnToBaseAndDeposit();
            return;
        }
        
        // Priority 2: Continue mining if in progress
        if (this.currentGoal && this.currentGoal.type === 'mine') {
            await this.continueMining();
            return;
        }
        
        // Priority 3: Find new mining location
        if (isTaskEnabled('miner', 'mining')) {
            await this.findAndStartMining();
        }
    }
    
    // Helper methods for specific tasks
    
    getNearbyThreats() {
        if (!this.bot || !this.bot.entities || !this.bot.entity) {
            return [];
        }
        
        const hostile = [];
        try {
            for (const entity of Object.values(this.bot.entities)) {
                if (entity.type === 'mob' && entity.mobType) {
                    const hostileMobs = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'];
                    if (hostileMobs.includes(entity.mobType)) {
                        const distance = this.bot.entity.position.distanceTo(entity.position);
                        if (distance < this.behaviorSettings.combatRange) {
                            hostile.push(entity);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[${this.role}] Error checking threats:`, error.message);
        }
        return hostile;
    }
    
    async engageThreats(threats) {
        console.log(`[${this.role}] Engaging ${threats.length} threats`);
        this.teamCoordinator.broadcastMessage(this.bot.username, 'THREAT_DETECTED', { count: threats.length });
        
        if (this.systems.combat) {
            for (const threat of threats) {
                await this.systems.combat.attackEntity(threat);
            }
        }
    }
    
    async patrolBase() {
        const baseLocation = this.teamCoordinator.sharedResources.baseLocation;
        if (!baseLocation || !this.bot || !this.bot.entity) return;
        
        try {
            // Simple patrol pattern around base
            const radius = this.behaviorSettings.patrolRadius;
            const angle = (Date.now() / 10000) % (Math.PI * 2);
            const patrolPoint = baseLocation.offset(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
            if (this.systems.pathfinding) {
                await this.systems.pathfinding.navigateToPosition(patrolPoint);
            }
        } catch (error) {
            console.error(`[${this.role}] Error during patrol:`, error.message);
        }
    }
    
    async maintainLighting() {
        // Check for dark spots near base and place torches
        if (this.systems.building) {
            await this.systems.building.placeTorchesNearby();
        }
    }
    
    async checkMaterialNeeds() {
        // Check if we have enough building materials
        const wood = this.systems.inventory.countItem('oak_planks') || 0;
        const stone = this.systems.inventory.countItem('cobblestone') || 0;
        
        return wood < 64 || stone < 64;
    }
    
    async gatherBuildingMaterials() {
        console.log(`[${this.role}] Gathering building materials`);
        
        // Gather wood
        if (this.systems.gathering) {
            await this.systems.gathering.gatherWood(32);
        }
    }
    
    async continueBuildingProject() {
        // Continue with current building project
        if (this.systems.building) {
            await this.systems.building.continueCurrentProject();
        }
    }
    
    async startNewBuildingProject() {
        console.log(`[${this.role}] Starting new building project`);
        
        if (this.systems.advancedBase) {
            await this.systems.advancedBase.buildNextStructure();
        }
    }
    
    calculateInventoryFullness() {
        if (!this.bot.inventory) return 0;
        
        let filledSlots = 0;
        const totalSlots = 36; // Standard inventory size
        
        for (const item of this.bot.inventory.items()) {
            if (item) filledSlots++;
        }
        
        return (filledSlots / totalSlots) * 100;
    }
    
    async returnToBaseAndDeposit() {
        console.log(`[${this.role}] Returning to base to deposit resources`);
        
        const baseLocation = this.teamCoordinator.sharedResources.baseLocation;
        if (!baseLocation) return;
        
        // Navigate to base
        if (this.systems.pathfinding) {
            await this.systems.pathfinding.navigateToPosition(baseLocation);
        }
        
        // Deposit valuable items to shared storage
        if (this.systems.inventory) {
            const valuableItems = ['diamond', 'iron_ore', 'gold_ore', 'coal', 'redstone'];
            for (const item of valuableItems) {
                const count = this.systems.inventory.countItem(item);
                if (count > 0) {
                    this.teamCoordinator.addSharedResource(item, count);
                }
            }
        }
        
        this.teamCoordinator.broadcastMessage(this.bot.username, 'RESOURCES_DEPOSITED', { 
            location: baseLocation 
        });
    }
    
    async continueMining() {
        if (this.systems.mining) {
            await this.systems.mining.continueMining();
        }
    }
    
    async findAndStartMining() {
        console.log(`[${this.role}] Finding new mining location`);
        
        if (this.systems.mining) {
            const depth = this.behaviorSettings.miningDepth || 12;
            await this.systems.mining.mineAtDepth(depth);
        }
    }
    
    async defendLocation(location) {
        console.log(`[${this.role}] Defending location: ${location}`);
        
        if (this.systems.pathfinding) {
            await this.systems.pathfinding.navigateToPosition(location);
        }
        
        // Stay and defend
        const threats = this.getNearbyThreats();
        await this.engageThreats(threats);
    }
    
    async buildStructure(structure) {
        console.log(`[${this.role}] Building structure: ${structure}`);
        
        if (this.systems.building) {
            await this.systems.building.buildStructure(structure);
        }
    }
    
    async mineResource(resource) {
        console.log(`[${this.role}] Mining resource: ${resource}`);
        
        if (this.systems.mining) {
            await this.systems.mining.mineOre(resource);
        }
    }
    
    calculateBuildProgress() {
        // Simplified progress calculation
        return this.performanceMetrics.tasksCompleted % 100;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RoleBehaviorManager;
