const { goals, Movements } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Advanced Pathfinding System
 * Implements chunk-based pathfinding, waypoint shortcuts, A* optimization, and path caching
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
        
        // Chunk-based pathfinding
        this.CHUNK_SIZE = 16;
        this.visitedChunks = new Set();
        
        // Timeout prediction
        this.pathfindingTimeouts = 0;
        this.avgPathfindingTime = 5000; // Initial estimate
        this.pathfindingTimes = []; // Track recent times
        this.MAX_TIMEOUT_PREDICTION = 30000; // 30 seconds max
        
        // A* optimization settings
        this.movements = null;
        this.setupOptimizedMovements();
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
            timeouts: this.pathfindingTimeouts
        };
    }
}

module.exports = AdvancedPathfinding;
