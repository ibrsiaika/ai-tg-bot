const { goals, Movements } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Advanced Pathfinding System v4.2.0
 * Implements chunk-based pathfinding, waypoint shortcuts, A* optimization, 
 * terrain cost mapping, path smoothing, and enhanced caching
 */
class AdvancedPathfinding {
    constructor(bot, notifier) {
        this.bot = bot;
        this.notifier = notifier;
        
        // Path caching
        this.pathCache = new Map(); // key: "x1,y1,z1->x2,y2,z2", value: {path, timestamp}
        this.CACHE_EXPIRY_MS = 300000; // 5 minutes
        this.MAX_CACHE_SIZE = 100;
        
        // Waypoint shortcuts
        this.waypoints = new Map(); // key: waypointName, value: position
        this.waypointShortcuts = new Map(); // Pre-calculated routes between waypoints
        this.MAX_WAYPOINTS = 50; // Limit waypoints to prevent memory leak
        
        // Chunk-based pathfinding
        this.CHUNK_SIZE = 16;
        this.visitedChunks = new Set();
        this.MAX_VISITED_CHUNKS = 500; // Limit visited chunks to prevent memory leak
        
        // Timeout prediction
        this.pathfindingTimeouts = 0;
        this.avgPathfindingTime = 5000; // Initial estimate
        this.pathfindingTimes = []; // Track recent times
        this.MAX_TIMEOUT_PREDICTION = 30000; // 30 seconds max
        
        // A* optimization settings
        this.movements = null;
        this.setupOptimizedMovements();
        
        // v4.2.0: Terrain cost mapping for smarter pathfinding
        this.terrainCostsEnabled = process.env.PATHFINDING_TERRAIN_COSTS !== 'false';
        this.pathSmoothingEnabled = process.env.PATHFINDING_SMOOTH_PATHS !== 'false';
        this.terrainCosts = this.initializeTerrainCosts();
        
        // v4.2.0: Statistics tracking
        this.stats = {
            totalPaths: 0,
            smoothedPaths: 0,
            terrainOptimized: 0,
            avgCalculationTime: 0
        };
    }
    
    setupOptimizedMovements() {
        const mcData = require('minecraft-data')(this.bot.version);
        this.movements = new Movements(this.bot, mcData);
        
        // Optimize movements for faster pathfinding
        this.movements.canDig = false; // Don't dig during pathfinding (faster)
        this.movements.allow1by1towers = false; // Safer
        this.movements.allowFreeMotion = false; // More predictable
        this.movements.scafoldingBlocks = []; // No scaffolding by default
        
        // Set reasonable limits
        this.movements.maxDropDown = 4; // Don't drop more than 4 blocks
        this.movements.infiniteLiquidDropdownDistance = false;
    }
    
    /**
     * Get chunk key from position
     */
    getChunkKey(position) {
        const chunkX = Math.floor(position.x / this.CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / this.CHUNK_SIZE);
        return `${chunkX},${chunkZ}`;
    }
    
    /**
     * Mark chunk as visited
     */
    markChunkVisited(position) {
        const key = this.getChunkKey(position);
        
        // Limit visited chunks to prevent memory leak
        if (this.visitedChunks.size >= this.MAX_VISITED_CHUNKS) {
            // Remove 20% of entries to make room
            // Sets maintain insertion order in ES6+, so this removes older entries
            const iterator = this.visitedChunks.values();
            const entriesToRemove = Math.floor(this.MAX_VISITED_CHUNKS * 0.2);
            for (let i = 0; i < entriesToRemove; i++) {
                const entry = iterator.next();
                if (!entry.done) {
                    this.visitedChunks.delete(entry.value);
                }
            }
        }
        
        this.visitedChunks.add(key);
    }
    
    /**
     * Check if chunk has been visited
     */
    isChunkVisited(position) {
        const key = this.getChunkKey(position);
        return this.visitedChunks.has(key);
    }
    
    /**
     * Add waypoint for quick navigation
     */
    addWaypoint(name, position) {
        // Limit waypoints to prevent memory leak
        if (this.waypoints.size >= this.MAX_WAYPOINTS) {
            // Remove oldest entry
            const firstKey = this.waypoints.keys().next().value;
            this.waypoints.delete(firstKey);
            // Also clean up shortcuts related to this waypoint
            for (const [key, _] of this.waypointShortcuts) {
                if (key.includes(firstKey)) {
                    this.waypointShortcuts.delete(key);
                }
            }
        }
        
        this.waypoints.set(name, position.clone());
        console.log(`Waypoint added: ${name} at ${position.toString()}`);
    }
    
    /**
     * Get cached path if available and still valid
     */
    getCachedPath(from, to) {
        const key = this.getPathKey(from, to);
        const cached = this.pathCache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
            console.log('Using cached path');
            return cached.path;
        }
        
        return null;
    }
    
    /**
     * Cache a path for future use
     */
    cachePath(from, to, path) {
        // Limit cache size
        if (this.pathCache.size >= this.MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }
        
        const key = this.getPathKey(from, to);
        this.pathCache.set(key, {
            path: path,
            timestamp: Date.now()
        });
    }
    
    /**
     * Generate path cache key
     */
    getPathKey(from, to) {
        return `${Math.floor(from.x)},${Math.floor(from.y)},${Math.floor(from.z)}->${Math.floor(to.x)},${Math.floor(to.y)},${Math.floor(to.z)}`;
    }
    
    /**
     * Predict if pathfinding will timeout based on distance and history
     */
    willLikelyTimeout(distance) {
        // If distance is very large and we've had timeouts, predict timeout
        if (distance > 200 && this.pathfindingTimeouts > 3) {
            return true;
        }
        
        // Estimate time based on distance and average
        const estimatedTime = (distance / 50) * this.avgPathfindingTime;
        return estimatedTime > this.MAX_TIMEOUT_PREDICTION;
    }
    
    /**
     * Update pathfinding time statistics
     */
    recordPathfindingTime(timeMs, success) {
        if (!success) {
            this.pathfindingTimeouts++;
            return;
        }
        
        this.pathfindingTimes.push(timeMs);
        
        // Keep only last 10 times
        if (this.pathfindingTimes.length > 10) {
            this.pathfindingTimes.shift();
        }
        
        // Update average
        this.avgPathfindingTime = this.pathfindingTimes.reduce((a, b) => a + b, 0) / this.pathfindingTimes.length;
    }
    
    /**
     * Advanced goto with optimizations
     * - Checks cache first
     * - Predicts timeouts
     * - Uses chunk-based routing for long distances
     * - Implements early termination
     */
    async goto(goal, options = {}) {
        const startTime = Date.now();
        const currentPos = this.bot.entity.position;
        
        try {
            // Get target position from goal
            let targetPos;
            if (goal instanceof goals.GoalBlock) {
                targetPos = new Vec3(goal.x, goal.y, goal.z);
            } else if (goal instanceof goals.GoalNear) {
                targetPos = new Vec3(goal.x, goal.y, goal.z);
            } else if (goal.x !== undefined) {
                targetPos = new Vec3(goal.x, goal.y, goal.z);
            } else {
                // Fallback to standard pathfinding
                return await this.bot.pathfinder.goto(goal);
            }
            
            const distance = currentPos.distanceTo(targetPos);
            
            // Check for timeout prediction
            if (this.willLikelyTimeout(distance)) {
                console.log(`Path to ${targetPos.toString()} likely to timeout (distance: ${distance.toFixed(1)}), using chunk-based routing`);
                return await this.chunkBasedGoto(targetPos, options);
            }
            
            // Check cache for frequently used paths
            const cachedPath = this.getCachedPath(currentPos, targetPos);
            if (cachedPath && options.useCache !== false) {
                // Use cached waypoints to navigate
                return await this.followCachedPath(cachedPath, options);
            }
            
            // Set optimized movements
            this.bot.pathfinder.setMovements(this.movements);
            
            // Standard pathfinding with timeout
            const timeout = options.timeout || 20000; // 20 second default
            await this.bot.pathfinder.goto(goal, { timeout });
            
            // Record success
            const elapsed = Date.now() - startTime;
            this.recordPathfindingTime(elapsed, true);
            
            // Cache the path
            this.cachePath(currentPos, targetPos, [targetPos]);
            
            // Mark chunk as visited
            this.markChunkVisited(targetPos);
            
            return true;
        } catch (error) {
            const elapsed = Date.now() - startTime;
            
            // Check if it's a timeout
            if (error.message?.includes('timeout') || error.message?.includes('too long')) {
                console.log(`Pathfinding timeout after ${elapsed}ms`);
                this.recordPathfindingTime(elapsed, false);
                
                // Try chunk-based as fallback
                if (options.retryWithChunks !== false) {
                    console.log('Retrying with chunk-based pathfinding');
                    return await this.chunkBasedGoto(targetPos, { ...options, retryWithChunks: false });
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Chunk-based pathfinding for long distances
     * Calculates route through chunk waypoints instead of block-by-block
     */
    async chunkBasedGoto(targetPos, options = {}) {
        const currentPos = this.bot.entity.position;
        
        // Calculate intermediate chunk waypoints
        const waypoints = this.calculateChunkWaypoints(currentPos, targetPos);
        
        console.log(`Chunk-based routing with ${waypoints.length} waypoints`);
        
        // Navigate through each waypoint
        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            console.log(`Navigating to chunk waypoint ${i + 1}/${waypoints.length}`);
            
            try {
                const goal = new goals.GoalNear(waypoint.x, waypoint.y, waypoint.z, 5);
                await this.bot.pathfinder.goto(goal, { timeout: 15000 });
                
                // Mark chunk as visited
                this.markChunkVisited(waypoint);
            } catch (error) {
                console.log(`Failed to reach waypoint ${i + 1}, trying next`);
                // Continue to next waypoint
            }
        }
        
        // Final approach to target
        const finalGoal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2);
        await this.bot.pathfinder.goto(finalGoal, { timeout: 10000 });
        
        return true;
    }
    
    /**
     * Calculate waypoints through chunks for long-distance travel
     */
    calculateChunkWaypoints(from, to) {
        const waypoints = [];
        const distance = from.distanceTo(to);
        
        // Create waypoint every ~2 chunks (32 blocks)
        const waypointInterval = 32;
        const numWaypoints = Math.floor(distance / waypointInterval);
        
        for (let i = 1; i <= numWaypoints; i++) {
            const t = i / (numWaypoints + 1);
            const waypoint = new Vec3(
                from.x + (to.x - from.x) * t,
                from.y + (to.y - from.y) * t,
                from.z + (to.z - from.z) * t
            );
            waypoints.push(waypoint);
        }
        
        return waypoints;
    }
    
    /**
     * Follow a cached path using waypoints
     */
    async followCachedPath(cachedWaypoints, options = {}) {
        for (const waypoint of cachedWaypoints) {
            const goal = new goals.GoalNear(waypoint.x, waypoint.y, waypoint.z, 3);
            await this.bot.pathfinder.goto(goal, { timeout: 10000 });
        }
        return true;
    }
    
    /**
     * Navigate to named waypoint
     */
    async gotoWaypoint(waypointName, options = {}) {
        const waypoint = this.waypoints.get(waypointName);
        if (!waypoint) {
            throw new Error(`Waypoint '${waypointName}' not found`);
        }
        
        console.log(`Navigating to waypoint: ${waypointName}`);
        const goal = new goals.GoalNear(waypoint.x, waypoint.y, waypoint.z, 2);
        return await this.goto(goal, options);
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            cachedPaths: this.pathCache.size,
            waypoints: this.waypoints.size,
            visitedChunks: this.visitedChunks.size,
            avgPathfindingTime: this.avgPathfindingTime,
            timeouts: this.pathfindingTimeouts,
            // v4.2.0 stats
            ...this.stats,
            terrainCostsEnabled: this.terrainCostsEnabled,
            pathSmoothingEnabled: this.pathSmoothingEnabled
        };
    }
    
    /**
     * v4.2.0: Initialize terrain cost mappings for smarter pathfinding
     * Higher costs mean less desirable terrain
     */
    initializeTerrainCosts() {
        return {
            // Dangerous blocks - avoid these
            lava: 1000,
            fire: 500,
            magma_block: 100,
            cactus: 80,
            sweet_berry_bush: 30,
            powder_snow: 50,
            
            // Water blocks - moderate cost
            water: 20,
            
            // Slow blocks
            soul_sand: 15,
            honey_block: 15,
            slime_block: 10,
            cobweb: 50,
            
            // Normal blocks - default cost
            default: 1,
            
            // Preferred blocks - lower cost
            grass_block: 0.8,
            stone: 0.9,
            cobblestone: 0.9,
            dirt: 0.8,
            path: 0.5,  // Grass path is fastest
            planks: 0.7
        };
    }
    
    /**
     * v4.2.0: Calculate terrain cost for a position
     * @param {Vec3} position - Block position to evaluate
     * @returns {number} Cost multiplier for this terrain
     */
    getTerrainCost(position) {
        if (!this.terrainCostsEnabled) {
            return 1;
        }
        
        try {
            const block = this.bot.blockAt(position);
            if (!block) {
                return 1;
            }
            
            const blockName = block.name;
            
            // Check for exact match
            if (this.terrainCosts[blockName] !== undefined) {
                return this.terrainCosts[blockName];
            }
            
            // Check for partial matches (e.g., "oak_planks" matches "planks")
            for (const [pattern, cost] of Object.entries(this.terrainCosts)) {
                if (blockName.includes(pattern)) {
                    return cost;
                }
            }
            
            return this.terrainCosts.default;
        } catch (error) {
            return 1;
        }
    }
    
    /**
     * v4.2.0: Smooth a path by removing unnecessary waypoints
     * Uses line-of-sight checks to skip intermediate points
     * @param {Vec3[]} path - Original path waypoints
     * @returns {Vec3[]} Smoothed path with fewer waypoints
     */
    smoothPath(path) {
        if (!this.pathSmoothingEnabled || !path || path.length < 3) {
            return path;
        }
        
        const smoothed = [path[0]];
        let currentIndex = 0;
        
        while (currentIndex < path.length - 1) {
            // Try to skip to the furthest visible point
            let furthestVisible = currentIndex + 1;
            
            for (let i = path.length - 1; i > currentIndex + 1; i--) {
                if (this.hasLineOfSight(path[currentIndex], path[i])) {
                    furthestVisible = i;
                    break;
                }
            }
            
            smoothed.push(path[furthestVisible]);
            currentIndex = furthestVisible;
        }
        
        this.stats.smoothedPaths++;
        console.log(`Path smoothed: ${path.length} -> ${smoothed.length} waypoints`);
        
        return smoothed;
    }
    
    /**
     * v4.2.0: Check if there's a clear line of sight between two points
     * @param {Vec3} from - Start position
     * @param {Vec3} to - End position
     * @returns {boolean} True if clear line of sight exists
     */
    hasLineOfSight(from, to) {
        const distance = from.distanceTo(to);
        const steps = Math.ceil(distance);
        
        if (steps <= 1) {
            return true;
        }
        
        const direction = to.minus(from).normalize();
        
        for (let i = 1; i < steps; i++) {
            const checkPos = from.plus(direction.scaled(i));
            const block = this.bot.blockAt(checkPos);
            
            // Check if block is solid (blocking line of sight)
            if (block && block.boundingBox === 'block') {
                return false;
            }
            
            // Check the block above (for head clearance)
            const aboveBlock = this.bot.blockAt(checkPos.offset(0, 1, 0));
            if (aboveBlock && aboveBlock.boundingBox === 'block') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * v4.2.0: Find the safest path considering terrain costs
     * @param {Vec3} from - Start position
     * @param {Vec3} to - End position  
     * @returns {Vec3[]} Array of waypoints with terrain-optimized routing
     */
    findTerrainOptimizedPath(from, to) {
        const waypoints = this.calculateChunkWaypoints(from, to);
        
        if (!this.terrainCostsEnabled || waypoints.length === 0) {
            return waypoints;
        }
        
        const optimized = [];
        
        for (const waypoint of waypoints) {
            // Check nearby positions for better terrain
            const bestPosition = this.findBestTerrainNearby(waypoint, 3);
            optimized.push(bestPosition);
        }
        
        this.stats.terrainOptimized++;
        return optimized;
    }
    
    /**
     * v4.2.0: Find the best terrain position within a radius
     * @param {Vec3} center - Center position to search from
     * @param {number} radius - Search radius in blocks
     * @returns {Vec3} Best position found
     */
    findBestTerrainNearby(center, radius = 3) {
        let bestPos = center;
        let bestCost = this.getTerrainCost(center);
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const checkPos = center.offset(dx, 0, dz);
                const cost = this.getTerrainCost(checkPos);
                
                // Check if this position is walkable
                const block = this.bot.blockAt(checkPos);
                const above = this.bot.blockAt(checkPos.offset(0, 1, 0));
                const above2 = this.bot.blockAt(checkPos.offset(0, 2, 0));
                
                // Position must be solid ground with 2 blocks clearance
                if (block && block.boundingBox === 'block' &&
                    above && above.boundingBox === 'empty' &&
                    above2 && above2.boundingBox === 'empty') {
                    
                    if (cost < bestCost) {
                        bestCost = cost;
                        bestPos = checkPos.offset(0, 1, 0); // Stand on top of the block
                    }
                }
            }
        }
        
        return bestPos;
    }
    
    /**
     * v4.2.0: Enhanced goto with path smoothing and terrain optimization
     */
    async gotoOptimized(goal, options = {}) {
        const startTime = Date.now();
        
        try {
            const result = await this.goto(goal, options);
            
            const elapsed = Date.now() - startTime;
            this.stats.totalPaths++;
            this.stats.avgCalculationTime = 
                (this.stats.avgCalculationTime * (this.stats.totalPaths - 1) + elapsed) / 
                this.stats.totalPaths;
            
            return result;
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * v4.2.0: Get dangerous blocks nearby
     * @param {number} radius - Search radius
     * @returns {Object[]} Array of dangerous block positions with threat levels
     */
    getDangerousBlocksNearby(radius = 10) {
        const dangers = [];
        const pos = this.bot.entity.position;
        
        const dangerousBlocks = ['lava', 'fire', 'magma_block', 'cactus'];
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const checkPos = pos.offset(dx, dy, dz);
                    const block = this.bot.blockAt(checkPos);
                    
                    if (block && dangerousBlocks.includes(block.name)) {
                        dangers.push({
                            position: checkPos,
                            type: block.name,
                            threatLevel: this.terrainCosts[block.name] || 100,
                            distance: pos.distanceTo(checkPos)
                        });
                    }
                }
            }
        }
        
        return dangers.sort((a, b) => a.distance - b.distance);
    }
}

module.exports = AdvancedPathfinding;
