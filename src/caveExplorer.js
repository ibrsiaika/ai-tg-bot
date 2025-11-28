/**
 * Cave Explorer - v4.2.0
 * 
 * Advanced autonomous cave and dungeon exploration system with:
 * - Safe cave mapping with danger detection
 * - 3D cave map generation with resource hotspots
 * - Dungeon raiding with spawner detection
 * - Optimized mining route generation
 * - Unknown chunk discovery with biome detection
 * - Risk assessment for each exploration route
 * 
 * Memory optimized for 512MB RAM environments
 */

const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const EventBus = require('./eventBus');

// Memory-efficient constants
const MAX_CAVE_POINTS = 500;
const MAX_DANGER_ZONES = 100;
const MAX_DUNGEON_CACHE = 20;
const MAX_MINING_ROUTES = 10;
const CAVE_SCAN_RADIUS = 32;
const CHUNK_SIZE = 16;
const EXPLORATION_TIMEOUT = 120000; // 2 minutes

/**
 * Danger levels
 */
const DangerLevel = {
    SAFE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};

/**
 * Resource types for hotspot tracking
 */
const ResourceType = {
    DIAMOND: 'diamond',
    IRON: 'iron',
    GOLD: 'gold',
    COAL: 'coal',
    REDSTONE: 'redstone',
    LAPIS: 'lapis',
    EMERALD: 'emerald',
    COPPER: 'copper',
    ANCIENT_DEBRIS: 'ancient_debris'
};

class CaveExplorer {
    constructor(bot, pathfinder, notifier, inventoryManager, safetyMonitor) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.safety = safetyMonitor;

        // Cave mapping data (memory-optimized with size limits)
        this.cavePoints = new Map(); // key: "x,y,z" -> { danger, resources, explored }
        this.dangerZones = new Map(); // key: "x,y,z" -> { type, severity, timestamp }
        this.resourceHotspots = new Map(); // key: resourceType -> [locations]
        this.dungeons = [];
        this.miningRoutes = [];

        // Exploration state
        this.isExploring = false;
        this.currentCave = null;
        this.homePosition = null;
        this.lastSafePosition = null;

        // Dangerous block definitions
        this.DANGEROUS_BLOCKS = ['lava', 'flowing_lava', 'fire', 'magma_block', 'cactus', 'sweet_berry_bush'];
        this.SPAWNER_BLOCK = 'spawner';
        this.DUNGEON_BLOCKS = ['mossy_cobblestone', 'cobblestone', 'spawner'];

        // Ore blocks for resource detection
        this.ORE_BLOCKS = {
            'diamond_ore': ResourceType.DIAMOND,
            'deepslate_diamond_ore': ResourceType.DIAMOND,
            'iron_ore': ResourceType.IRON,
            'deepslate_iron_ore': ResourceType.IRON,
            'gold_ore': ResourceType.GOLD,
            'deepslate_gold_ore': ResourceType.GOLD,
            'coal_ore': ResourceType.COAL,
            'deepslate_coal_ore': ResourceType.COAL,
            'redstone_ore': ResourceType.REDSTONE,
            'deepslate_redstone_ore': ResourceType.REDSTONE,
            'lapis_ore': ResourceType.LAPIS,
            'deepslate_lapis_ore': ResourceType.LAPIS,
            'emerald_ore': ResourceType.EMERALD,
            'deepslate_emerald_ore': ResourceType.EMERALD,
            'copper_ore': ResourceType.COPPER,
            'deepslate_copper_ore': ResourceType.COPPER,
            'ancient_debris': ResourceType.ANCIENT_DEBRIS
        };

        // Statistics
        this.stats = {
            cavesExplored: 0,
            resourcesFound: 0,
            dungeonsFound: 0,
            dangerousAreasMarked: 0,
            totalExplorationTime: 0
        };
    }

    /**
     * Set home position for return navigation
     */
    setHomePosition(position) {
        this.homePosition = position ? position.clone() : null;
        console.log(`[Cave Explorer] Home position set: ${this.homePosition}`);
    }

    /**
     * Start exploring a cave system
     * @param {Vec3} entryPoint - Cave entrance position
     * @param {number} maxDuration - Maximum exploration time in ms
     */
    async exploreCave(entryPoint, maxDuration = EXPLORATION_TIMEOUT) {
        if (this.isExploring) {
            console.log('[Cave Explorer] Already exploring');
            return { success: false, reason: 'already_exploring' };
        }

        this.isExploring = true;
        this.currentCave = {
            entryPoint: entryPoint ? entryPoint.clone() : this.bot.entity.position.clone(),
            startTime: Date.now(),
            pointsExplored: 0,
            resourcesFound: [],
            dangersFound: []
        };

        console.log(`[Cave Explorer] Starting cave exploration from ${this.currentCave.entryPoint}`);
        await this.notifier?.send?.(`🕳️ Starting cave exploration`);

        const startTime = Date.now();
        let explorationSuccess = true;

        try {
            // Save last safe position
            this.lastSafePosition = this.bot.entity.position.clone();

            while (this.isExploring && (Date.now() - startTime) < maxDuration) {
                // Safety check
                if (this.safety && !this.safety.isSafe()) {
                    console.log('[Cave Explorer] Safety check failed, retreating');
                    await this.retreatToSafety();
                    break;
                }

                // Scan current area
                await this.scanCurrentArea();

                // Find next exploration target
                const nextTarget = this.findNextExplorationTarget();

                if (!nextTarget) {
                    console.log('[Cave Explorer] No more areas to explore in this cave');
                    break;
                }

                // Check if path is safe
                if (this.isPathDangerous(this.bot.entity.position, nextTarget)) {
                    console.log('[Cave Explorer] Dangerous path detected, finding alternative');
                    continue;
                }

                // Move to target
                try {
                    await this.bot.pathfinder.goto(new goals.GoalNear(
                        nextTarget.x,
                        nextTarget.y,
                        nextTarget.z,
                        2
                    ));
                    this.lastSafePosition = this.bot.entity.position.clone();
                    this.currentCave.pointsExplored++;
                } catch (pathError) {
                    console.log(`[Cave Explorer] Path failed: ${pathError.message}`);
                    continue;
                }

                // Small delay to prevent overwhelming
                await this.sleep(500);
            }
        } catch (error) {
            console.error(`[Cave Explorer] Exploration error: ${error.message}`);
            explorationSuccess = false;
        }

        // Complete exploration
        const duration = Date.now() - startTime;
        this.stats.cavesExplored++;
        this.stats.totalExplorationTime += duration;

        const result = {
            success: explorationSuccess,
            duration,
            pointsExplored: this.currentCave.pointsExplored,
            resourcesFound: this.currentCave.resourcesFound,
            dangersFound: this.currentCave.dangersFound
        };

        this.isExploring = false;
        this.currentCave = null;

        console.log(`[Cave Explorer] Exploration complete: ${JSON.stringify(result)}`);
        await this.notifier?.send?.(`🕳️ Cave explored: ${result.pointsExplored} points, ${result.resourcesFound.length} resources`);

        EventBus.emit('cave:exploration:complete', result);

        return result;
    }

    /**
     * Scan the current area for dangers and resources
     */
    async scanCurrentArea() {
        const pos = this.bot.entity.position;
        const scanRadius = CAVE_SCAN_RADIUS;

        // Scan for dangers
        this.scanForDangers(pos, scanRadius);

        // Scan for resources
        this.scanForResources(pos, scanRadius);

        // Scan for dungeons
        this.scanForDungeons(pos, scanRadius);

        // Mark area as explored
        this.markExplored(pos);
    }

    /**
     * Scan for dangerous blocks and mark danger zones
     */
    scanForDangers(centerPos, radius) {
        for (const dangerBlock of this.DANGEROUS_BLOCKS) {
            const blocks = this.bot.findBlocks({
                matching: block => block.name === dangerBlock,
                maxDistance: radius,
                count: 10
            });

            for (const blockPos of blocks) {
                this.markDangerZone(blockPos, dangerBlock, this.getDangerSeverity(dangerBlock));
            }
        }

        // Check for deep drops
        this.checkForDeepDrops(centerPos, radius);
    }

    /**
     * Check for dangerous drops
     */
    checkForDeepDrops(centerPos, radius) {
        const checkPositions = this.getPositionsInRadius(centerPos, Math.min(radius, 10));

        for (const checkPos of checkPositions) {
            let dropDepth = 0;
            for (let y = 0; y < 20; y++) {
                const belowBlock = this.bot.blockAt(checkPos.offset(0, -y, 0));
                if (belowBlock && belowBlock.name !== 'air' && belowBlock.name !== 'cave_air') {
                    break;
                }
                dropDepth++;
            }

            if (dropDepth > 6) { // More than 6 blocks is dangerous
                this.markDangerZone(checkPos, 'deep_drop', DangerLevel.HIGH);
            }
        }
    }

    /**
     * Get positions in a radius (memory-efficient sampling)
     */
    getPositionsInRadius(center, radius) {
        const positions = [];
        const step = Math.max(2, Math.floor(radius / 5)); // Sample every few blocks

        for (let x = -radius; x <= radius; x += step) {
            for (let z = -radius; z <= radius; z += step) {
                positions.push(center.offset(x, 0, z));
            }
        }

        return positions;
    }

    /**
     * Get danger severity for a block type
     */
    getDangerSeverity(blockName) {
        switch (blockName) {
            case 'lava':
            case 'flowing_lava':
                return DangerLevel.CRITICAL;
            case 'fire':
            case 'magma_block':
                return DangerLevel.HIGH;
            case 'cactus':
            case 'sweet_berry_bush':
                return DangerLevel.LOW;
            default:
                return DangerLevel.MEDIUM;
        }
    }

    /**
     * Mark a danger zone
     */
    markDangerZone(position, type, severity) {
        const key = `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`;

        // Memory limit check
        if (this.dangerZones.size >= MAX_DANGER_ZONES) {
            // Remove oldest entry
            const firstKey = this.dangerZones.keys().next().value;
            this.dangerZones.delete(firstKey);
        }

        this.dangerZones.set(key, {
            type,
            severity,
            position: { x: position.x, y: position.y, z: position.z },
            timestamp: Date.now()
        });

        if (this.currentCave) {
            this.currentCave.dangersFound.push({ type, position: key, severity });
        }

        this.stats.dangerousAreasMarked++;
    }

    /**
     * Scan for ore resources
     */
    scanForResources(centerPos, radius) {
        for (const [blockName, resourceType] of Object.entries(this.ORE_BLOCKS)) {
            const blocks = this.bot.findBlocks({
                matching: block => block.name === blockName,
                maxDistance: radius,
                count: 20
            });

            for (const blockPos of blocks) {
                this.addResourceHotspot(resourceType, blockPos);
            }
        }
    }

    /**
     * Add a resource hotspot
     */
    addResourceHotspot(resourceType, position) {
        if (!this.resourceHotspots.has(resourceType)) {
            this.resourceHotspots.set(resourceType, []);
        }

        const hotspots = this.resourceHotspots.get(resourceType);
        const posKey = `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`;

        // Check if already recorded (avoid duplicates)
        const exists = hotspots.some(h => h.key === posKey);

        if (!exists) {
            // Memory limit per resource type
            if (hotspots.length >= 50) {
                hotspots.shift();
            }

            hotspots.push({
                key: posKey,
                position: { x: position.x, y: position.y, z: position.z },
                timestamp: Date.now()
            });

            if (this.currentCave) {
                this.currentCave.resourcesFound.push({ type: resourceType, position: posKey });
            }

            this.stats.resourcesFound++;

            EventBus.emit('cave:resource:found', {
                type: resourceType,
                position: { x: position.x, y: position.y, z: position.z }
            });
        }
    }

    /**
     * Scan for dungeons (spawners)
     */
    scanForDungeons(centerPos, radius) {
        const spawners = this.bot.findBlocks({
            matching: block => block.name === this.SPAWNER_BLOCK,
            maxDistance: radius,
            count: 5
        });

        for (const spawnerPos of spawners) {
            this.addDungeon(spawnerPos);
        }
    }

    /**
     * Add a dungeon location
     */
    addDungeon(position) {
        const posKey = `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`;

        // Check if already recorded
        const exists = this.dungeons.some(d => d.key === posKey);

        if (!exists) {
            // Memory limit
            if (this.dungeons.length >= MAX_DUNGEON_CACHE) {
                this.dungeons.shift();
            }

            this.dungeons.push({
                key: posKey,
                position: { x: position.x, y: position.y, z: position.z },
                explored: false,
                lootCollected: false,
                spawnerDisabled: false,
                timestamp: Date.now()
            });

            this.stats.dungeonsFound++;

            console.log(`[Cave Explorer] Dungeon found at ${posKey}`);

            EventBus.emit('cave:dungeon:found', {
                position: { x: position.x, y: position.y, z: position.z }
            });
        }
    }

    /**
     * Mark a position as explored
     */
    markExplored(position) {
        const key = `${Math.floor(position.x / 8)},${Math.floor(position.y / 8)},${Math.floor(position.z / 8)}`;

        // Memory limit check
        if (this.cavePoints.size >= MAX_CAVE_POINTS) {
            // Remove oldest 10%
            const keysToRemove = Array.from(this.cavePoints.keys()).slice(0, Math.floor(MAX_CAVE_POINTS * 0.1));
            for (const k of keysToRemove) {
                this.cavePoints.delete(k);
            }
        }

        if (!this.cavePoints.has(key)) {
            this.cavePoints.set(key, {
                explored: true,
                danger: this.getAreaDangerLevel(position),
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get danger level for an area
     */
    getAreaDangerLevel(position) {
        let maxDanger = DangerLevel.SAFE;

        for (const zone of this.dangerZones.values()) {
            const distance = Math.sqrt(
                Math.pow(position.x - zone.position.x, 2) +
                Math.pow(position.y - zone.position.y, 2) +
                Math.pow(position.z - zone.position.z, 2)
            );

            if (distance < 10 && zone.severity > maxDanger) {
                maxDanger = zone.severity;
            }
        }

        return maxDanger;
    }

    /**
     * Check if a position has been explored
     */
    isExplored(position) {
        const key = `${Math.floor(position.x / 8)},${Math.floor(position.y / 8)},${Math.floor(position.z / 8)}`;
        return this.cavePoints.has(key);
    }

    /**
     * Find next unexplored target
     */
    findNextExplorationTarget() {
        const currentPos = this.bot.entity.position;
        const searchRadius = 20;

        // Look for unexplored cave air nearby
        const caveAirBlocks = this.bot.findBlocks({
            matching: block => block.name === 'cave_air' || block.name === 'air',
            maxDistance: searchRadius,
            count: 50
        });

        // Filter to unexplored positions
        const unexplored = caveAirBlocks.filter(pos => {
            if (this.isExplored(pos)) return false;

            // Check if accessible (has solid ground nearby)
            const below = this.bot.blockAt(pos.offset(0, -1, 0));
            if (!below || below.name === 'air' || below.name === 'cave_air') return false;

            // Check if not in danger zone
            if (this.getAreaDangerLevel(pos) >= DangerLevel.HIGH) return false;

            return true;
        });

        if (unexplored.length === 0) return null;

        // Sort by distance and return closest
        unexplored.sort((a, b) => {
            const distA = currentPos.distanceTo(a);
            const distB = currentPos.distanceTo(b);
            return distA - distB;
        });

        return unexplored[0];
    }

    /**
     * Check if path between two points is dangerous
     */
    isPathDangerous(from, to) {
        // Simple ray-cast style check
        const steps = Math.ceil(from.distanceTo(to) / 2);
        const dx = (to.x - from.x) / steps;
        const dy = (to.y - from.y) / steps;
        const dz = (to.z - from.z) / steps;

        for (let i = 1; i < steps; i++) {
            const checkPos = new Vec3(
                from.x + dx * i,
                from.y + dy * i,
                from.z + dz * i
            );

            if (this.getAreaDangerLevel(checkPos) >= DangerLevel.HIGH) {
                return true;
            }
        }

        return false;
    }

    /**
     * Retreat to the last known safe position
     */
    async retreatToSafety() {
        console.log('[Cave Explorer] Retreating to safety');

        if (this.lastSafePosition) {
            try {
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    this.lastSafePosition.x,
                    this.lastSafePosition.y,
                    this.lastSafePosition.z,
                    2
                ));
            } catch (error) {
                console.error(`[Cave Explorer] Failed to retreat: ${error.message}`);
            }
        }

        this.isExploring = false;
    }

    /**
     * Raid a dungeon (disable spawner, collect loot)
     * @param {string} dungeonKey - Key of the dungeon to raid
     */
    async raidDungeon(dungeonKey) {
        const dungeon = this.dungeons.find(d => d.key === dungeonKey);

        if (!dungeon) {
            console.log(`[Cave Explorer] Dungeon not found: ${dungeonKey}`);
            return { success: false, reason: 'dungeon_not_found' };
        }

        if (dungeon.explored && dungeon.lootCollected) {
            console.log(`[Cave Explorer] Dungeon already raided: ${dungeonKey}`);
            return { success: false, reason: 'already_raided' };
        }

        console.log(`[Cave Explorer] Raiding dungeon at ${dungeonKey}`);
        await this.notifier?.send?.(`⚔️ Raiding dungeon`);

        try {
            // Navigate to dungeon
            await this.bot.pathfinder.goto(new goals.GoalNear(
                dungeon.position.x,
                dungeon.position.y,
                dungeon.position.z,
                5
            ));

            // Disable spawner by placing torches or mining
            await this.disableSpawner(dungeon.position);

            // Collect loot from chests
            const loot = await this.collectDungeonLoot(dungeon.position);

            dungeon.explored = true;
            dungeon.lootCollected = true;
            dungeon.spawnerDisabled = true;

            EventBus.emit('cave:dungeon:raided', {
                dungeonKey,
                loot
            });

            return { success: true, loot };

        } catch (error) {
            console.error(`[Cave Explorer] Dungeon raid failed: ${error.message}`);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Disable a spawner by placing torches around it
     */
    async disableSpawner(spawnerPos) {
        // Try to place torches on all sides
        const torchPositions = [
            spawnerPos.offset(1, 0, 0),
            spawnerPos.offset(-1, 0, 0),
            spawnerPos.offset(0, 0, 1),
            spawnerPos.offset(0, 0, -1),
            spawnerPos.offset(0, 1, 0)
        ];

        const torchItem = this.inventory?.findItem?.('torch');

        if (torchItem) {
            for (const pos of torchPositions) {
                try {
                    const block = this.bot.blockAt(pos);
                    if (block && (block.name === 'air' || block.name === 'cave_air')) {
                        const referenceBlock = this.bot.blockAt(pos.offset(0, -1, 0));
                        if (referenceBlock && referenceBlock.name !== 'air') {
                            await this.bot.equip(torchItem, 'hand');
                            await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                            await this.sleep(200);
                        }
                    }
                } catch (e) {
                    // Continue trying other positions
                }
            }
        }
    }

    /**
     * Collect loot from dungeon chests
     */
    async collectDungeonLoot(dungeonPos) {
        const loot = [];

        // Find nearby chests
        const chests = this.bot.findBlocks({
            matching: block => block.name === 'chest',
            maxDistance: 10,
            count: 5,
            point: new Vec3(dungeonPos.x, dungeonPos.y, dungeonPos.z)
        });

        for (const chestPos of chests) {
            try {
                const chestBlock = this.bot.blockAt(chestPos);
                if (chestBlock) {
                    const chest = await this.bot.openContainer(chestBlock);

                    if (chest && chest.containerItems) {
                        for (const item of chest.containerItems()) {
                            loot.push({ name: item.name, count: item.count });
                        }
                        await chest.withdraw(0, null, null); // Withdraw all
                    }

                    chest?.close?.();
                    await this.sleep(500);
                }
            } catch (e) {
                console.log(`[Cave Explorer] Failed to loot chest: ${e.message}`);
            }
        }

        return loot;
    }

    /**
     * Generate optimized mining routes
     * @param {string} targetResource - Target resource type
     * @param {number} maxRoutes - Maximum number of routes to generate
     */
    generateMiningRoutes(targetResource, maxRoutes = 5) {
        const currentPos = this.bot.entity.position;
        const hotspots = this.resourceHotspots.get(targetResource) || [];

        if (hotspots.length === 0) {
            console.log(`[Cave Explorer] No ${targetResource} hotspots found`);
            return [];
        }

        // Calculate routes to each hotspot
        const routes = hotspots.map(hotspot => {
            const distance = Math.sqrt(
                Math.pow(currentPos.x - hotspot.position.x, 2) +
                Math.pow(currentPos.y - hotspot.position.y, 2) +
                Math.pow(currentPos.z - hotspot.position.z, 2)
            );

            const dangerLevel = this.getAreaDangerLevel(
                new Vec3(hotspot.position.x, hotspot.position.y, hotspot.position.z)
            );

            // Calculate profitability score
            const profitability = this.calculateRouteProfitability(targetResource, distance, dangerLevel);

            return {
                target: hotspot.position,
                distance,
                dangerLevel,
                profitability,
                resourceType: targetResource
            };
        });

        // Sort by profitability and return top routes
        routes.sort((a, b) => b.profitability - a.profitability);

        const topRoutes = routes.slice(0, Math.min(maxRoutes, MAX_MINING_ROUTES));

        // Cache routes
        this.miningRoutes = topRoutes;

        return topRoutes;
    }

    /**
     * Calculate profitability score for a mining route
     */
    calculateRouteProfitability(resourceType, distance, dangerLevel) {
        // Base value of resource
        const resourceValues = {
            [ResourceType.DIAMOND]: 100,
            [ResourceType.EMERALD]: 90,
            [ResourceType.ANCIENT_DEBRIS]: 150,
            [ResourceType.GOLD]: 50,
            [ResourceType.IRON]: 30,
            [ResourceType.LAPIS]: 40,
            [ResourceType.REDSTONE]: 35,
            [ResourceType.COPPER]: 20,
            [ResourceType.COAL]: 10
        };

        const baseValue = resourceValues[resourceType] || 10;

        // Distance penalty (longer distance = less profitable)
        const distancePenalty = distance * 0.5;

        // Danger penalty (higher danger = less profitable)
        const dangerPenalty = dangerLevel * 20;

        return Math.max(0, baseValue - distancePenalty - dangerPenalty);
    }

    /**
     * Find unexplored chunks nearby
     * @param {number} radius - Search radius in chunks
     */
    findUnexploredChunks(radius = 5) {
        const currentPos = this.bot.entity.position;
        const currentChunkX = Math.floor(currentPos.x / CHUNK_SIZE);
        const currentChunkZ = Math.floor(currentPos.z / CHUNK_SIZE);
        const unexplored = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const chunkX = currentChunkX + dx;
                const chunkZ = currentChunkZ + dz;
                const chunkKey = `chunk_${chunkX},${chunkZ}`;

                if (!this.cavePoints.has(chunkKey)) {
                    unexplored.push({
                        chunkX,
                        chunkZ,
                        centerX: chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
                        centerZ: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
                        distance: Math.sqrt(dx * dx + dz * dz)
                    });
                }
            }
        }

        // Sort by distance
        unexplored.sort((a, b) => a.distance - b.distance);

        return unexplored;
    }

    /**
     * Get current exploration statistics
     */
    getStats() {
        return {
            ...this.stats,
            cavePointsMapped: this.cavePoints.size,
            dangerZonesMarked: this.dangerZones.size,
            dungeonsDiscovered: this.dungeons.length,
            dungeonsRaided: this.dungeons.filter(d => d.explored).length,
            resourceHotspots: Object.fromEntries(
                Array.from(this.resourceHotspots.entries()).map(([type, spots]) => [type, spots.length])
            ),
            isExploring: this.isExploring,
            currentCave: this.currentCave ? {
                pointsExplored: this.currentCave.pointsExplored,
                resourcesFound: this.currentCave.resourcesFound.length,
                dangersFound: this.currentCave.dangersFound.length
            } : null
        };
    }

    /**
     * Get nearest resource hotspot
     * @param {string} resourceType - Type of resource
     */
    getNearestHotspot(resourceType) {
        const hotspots = this.resourceHotspots.get(resourceType);
        if (!hotspots || hotspots.length === 0) return null;

        const currentPos = this.bot.entity.position;
        let nearest = null;
        let minDistance = Infinity;

        for (const hotspot of hotspots) {
            const distance = Math.sqrt(
                Math.pow(currentPos.x - hotspot.position.x, 2) +
                Math.pow(currentPos.y - hotspot.position.y, 2) +
                Math.pow(currentPos.z - hotspot.position.z, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...hotspot, distance };
            }
        }

        return nearest;
    }

    /**
     * Get all dungeon locations
     */
    getDungeons() {
        return [...this.dungeons];
    }

    /**
     * Get danger zones in an area
     */
    getDangerZonesInArea(centerPos, radius) {
        const zones = [];

        for (const zone of this.dangerZones.values()) {
            const distance = Math.sqrt(
                Math.pow(centerPos.x - zone.position.x, 2) +
                Math.pow(centerPos.y - zone.position.y, 2) +
                Math.pow(centerPos.z - zone.position.z, 2)
            );

            if (distance <= radius) {
                zones.push({ ...zone, distance });
            }
        }

        return zones.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Clear old exploration data (memory cleanup)
     */
    cleanup() {
        const now = Date.now();
        const MAX_AGE = 3600000; // 1 hour

        // Clean old cave points
        for (const [key, point] of this.cavePoints.entries()) {
            if (now - point.timestamp > MAX_AGE) {
                this.cavePoints.delete(key);
            }
        }

        // Clean old danger zones
        for (const [key, zone] of this.dangerZones.entries()) {
            if (now - zone.timestamp > MAX_AGE) {
                this.dangerZones.delete(key);
            }
        }

        // Clean old resource hotspots
        for (const [type, hotspots] of this.resourceHotspots.entries()) {
            const filtered = hotspots.filter(h => now - h.timestamp < MAX_AGE);
            this.resourceHotspots.set(type, filtered);
        }

        console.log('[Cave Explorer] Cleanup complete');
    }

    /**
     * Stop current exploration
     */
    stopExploration() {
        this.isExploring = false;
        console.log('[Cave Explorer] Exploration stopped');
    }

    /**
     * Helper sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export class and constants
module.exports = CaveExplorer;
module.exports.DangerLevel = DangerLevel;
module.exports.ResourceType = ResourceType;
