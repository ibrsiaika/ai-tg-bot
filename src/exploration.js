const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

// Constants
const CHUNK_SIZE = 16;
const MAX_TREE_LOCATIONS = 100;
const TREE_LOCATION_EXPIRY_MS = 300000; // 5 minutes
const MIN_TREE_DISTANCE = 5; // Don't return trees too close (likely already chopped)

class ExplorationSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        this.visitedLocations = new Set();
        this.discoveredStructures = [];
        this.discoveredBiomes = new Set();
        this.waypoints = [];
        this.homeBase = null;
        this.lastDeathPosition = null;
        this.deathCount = 0;
        
        // Enhanced resource tracking
        this.knownTreeLocations = [];
        this.knownOreLocations = new Map();
        this.exploredChunks = new Set();
        
        // Setup death tracking
        this.setupDeathTracking();
    }

    setupDeathTracking() {
        this.bot.on('death', () => {
            this.lastDeathPosition = this.bot.entity.position.clone();
            this.deathCount++;
            console.log(`☠ Death #${this.deathCount} at ${this.lastDeathPosition.toString()}`);
            this.addWaypoint(`Death #${this.deathCount}`, this.lastDeathPosition);
            
            // Save to memory
            this.saveDeathLocation(this.lastDeathPosition);
        });
    }

    saveDeathLocation(position) {
        try {
            const fs = require('fs');
            const path = require('path');
            const memoryFile = path.join(__dirname, '../.bot-memory.json');
            
            let memory = {};
            if (fs.existsSync(memoryFile)) {
                memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
            }
            
            memory.lastDeath = {
                x: position.x,
                y: position.y,
                z: position.z,
                timestamp: Date.now(),
                count: this.deathCount
            };
            
            fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
            console.log('Death location saved to memory');
        } catch (error) {
            console.error('Error saving death location:', error.message);
        }
    }

    async recoverDeathItems() {
        if (!this.lastDeathPosition) {
            console.log('No death location recorded');
            return false;
        }

        console.log(`Attempting to recover items from death at ${this.lastDeathPosition.toString()}`);
        await this.notifier.send(`Recovering items from death location`);

        try {
            // Navigate to death location
            await this.bot.pathfinder.goto(new goals.GoalNear(
                this.lastDeathPosition.x,
                this.lastDeathPosition.y,
                this.lastDeathPosition.z,
                5
            ));

            // Wait and collect any items
            await this.sleep(2000);
            
            // Items should auto-pickup, but let's check for dropped items nearby
            const droppedItems = Object.values(this.bot.entities).filter(entity =>
                entity.type === 'object' &&
                entity.objectType === 'Item' &&
                entity.position.distanceTo(this.lastDeathPosition) < 10
            );

            if (droppedItems.length > 0) {
                console.log(`Found ${droppedItems.length} items at death location`);
                
                if (this.bot.collectBlock) {
                    for (const item of droppedItems) {
                        try {
                            await this.bot.collectBlock.collect(item);
                            await this.sleep(200);
                        } catch (e) {
                            // Continue
                        }
                    }
                }
            }

            console.log('Death recovery completed');
            await this.notifier.send('Death recovery completed');
            
            // Clear death position after successful recovery
            this.lastDeathPosition = null;
            return true;
        } catch (error) {
            console.error('Error during death recovery:', error.message);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setHomeBase(position) {
        this.homeBase = position.clone();
        this.addWaypoint('Home Base', position);
        console.log(`Home base established at ${position.toString()}`);
        
        // Save to file for persistence (optional but useful)
        this.saveHomeBaseToMemory(position);
    }

    saveHomeBaseToMemory(position) {
        // Store home base coordinates for future reference
        try {
            const fs = require('fs');
            const path = require('path');
            const memoryFile = path.join(__dirname, '../.bot-memory.json');
            
            let memory = {};
            if (fs.existsSync(memoryFile)) {
                memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
            }
            
            memory.homeBase = {
                x: position.x,
                y: position.y,
                z: position.z,
                timestamp: Date.now()
            };
            
            fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
            console.log('Home base saved to memory');
        } catch (error) {
            console.error('Error saving home base:', error.message);
        }
    }

    loadHomeBaseFromMemory() {
        try {
            const fs = require('fs');
            const path = require('path');
            const memoryFile = path.join(__dirname, '../.bot-memory.json');
            
            if (fs.existsSync(memoryFile)) {
                const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
                if (memory.homeBase) {
                    const pos = new Vec3(memory.homeBase.x, memory.homeBase.y, memory.homeBase.z);
                    this.homeBase = pos;
                    this.addWaypoint('Home Base (Loaded)', pos);
                    console.log(`Home base loaded from memory: ${pos.toString()}`);
                    return pos;
                }
            }
        } catch (error) {
            console.error('Error loading home base:', error.message);
        }
        return null;
    }

    async goToHomeBase() {
        if (!this.homeBase) {
            console.log('No home base set');
            return false;
        }

        console.log(`Navigating to home base at ${this.homeBase.toString()}`);
        
        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(
                this.homeBase.x,
                this.homeBase.y,
                this.homeBase.z,
                5
            ));
            
            console.log('Arrived at home base');
            return true;
        } catch (error) {
            console.error('Error navigating to home base:', error.message);
            return false;
        }
    }

    async goToWaypoint(waypointName) {
        const waypoint = this.waypoints.find(w => w.name.includes(waypointName));
        
        if (!waypoint) {
            console.log(`Waypoint '${waypointName}' not found`);
            return false;
        }

        console.log(`Navigating to waypoint: ${waypoint.name}`);
        
        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(
                waypoint.position.x,
                waypoint.position.y,
                waypoint.position.z,
                5
            ));
            
            console.log(`Arrived at ${waypoint.name}`);
            return true;
        } catch (error) {
            console.error(`Error navigating to ${waypoint.name}:`, error.message);
            return false;
        }
    }

    addWaypoint(name, position) {
        this.waypoints.push({
            name,
            position: position.clone(),
            timestamp: Date.now()
        });
        console.log(`Waypoint added: ${name} at ${position.toString()}`);
    }

    hasVisited(position, radius = CHUNK_SIZE) {
        const key = `${Math.floor(position.x / radius)},${Math.floor(position.z / radius)}`;
        return this.visitedLocations.has(key);
    }

    markVisited(position, radius = CHUNK_SIZE) {
        const key = `${Math.floor(position.x / radius)},${Math.floor(position.z / radius)}`;
        this.visitedLocations.add(key);
    }

    async smartExplore(distance = 200, duration = 60000) {
        console.log(`Starting smart exploration: ${distance} blocks for ${duration}ms`);
        
        const startTime = Date.now();
        const startPos = this.bot.entity.position.clone();
        let discoveries = 0;

        while (Date.now() - startTime < duration) {
            // Choose unexplored direction
            const targetPos = this.findUnexploredDirection(startPos, distance);
            
            try {
                await this.bot.pathfinder.goto(new goals.GoalNear(
                    targetPos.x,
                    targetPos.y,
                    targetPos.z,
                    10
                ));

                this.markVisited(this.bot.entity.position);

                // Scan for interesting things
                discoveries += await this.scanSurroundings();

                await this.sleep(1000);
            } catch (error) {
                console.log('Exploration interrupted, trying new direction');
            }
        }

        await this.notifier.send(`Exploration complete. Discovered ${discoveries} items of interest.`);
        console.log(`Exploration finished. Made ${discoveries} discoveries.`);
        
        return discoveries;
    }

    findUnexploredDirection(centerPos, maxDistance) {
        // Try to find a direction we haven't explored yet
        for (let attempt = 0; attempt < 10; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = maxDistance * (0.5 + Math.random() * 0.5);
            
            const targetX = centerPos.x + Math.cos(angle) * distance;
            const targetZ = centerPos.z + Math.sin(angle) * distance;
            const targetPos = new Vec3(targetX, centerPos.y, targetZ);

            if (!this.hasVisited(targetPos)) {
                return targetPos;
            }
        }

        // If all nearby areas explored, go further
        const angle = Math.random() * Math.PI * 2;
        return new Vec3(
            centerPos.x + Math.cos(angle) * maxDistance * 2,
            centerPos.y,
            centerPos.z + Math.sin(angle) * maxDistance * 2
        );
    }

    async scanSurroundings() {
        let discoveries = 0;

        // Look for villages
        const village = await this.detectStructure('village');
        if (village) {
            discoveries++;
            await this.notifier.send(`Village discovered at ${this.bot.entity.position.toString()}`);
            this.discoveredStructures.push({ type: 'village', position: village });
            this.addWaypoint('Village', village);
        }

        // Look for temples
        const temple = await this.detectStructure('temple');
        if (temple) {
            discoveries++;
            await this.notifier.send(`Temple found at ${this.bot.entity.position.toString()}`);
            this.discoveredStructures.push({ type: 'temple', position: temple });
            this.addWaypoint('Temple', temple);
        }

        // Detect biome
        const biome = await this.detectBiome();
        if (biome && !this.discoveredBiomes.has(biome)) {
            discoveries++;
            this.discoveredBiomes.add(biome);
            await this.notifier.send(`New biome discovered: ${biome}`);
        }

        // Look for valuable resources
        const oreResults = await this.scanForOres();
        if (oreResults.count > 0) {
            discoveries += oreResults.count;
            
            // Store discovered ore locations for later mining
            if (oreResults.ores.length > 0 && this.knownOreLocations) {
                for (const ore of oreResults.ores) {
                    if (!this.knownOreLocations.has(ore.type)) {
                        this.knownOreLocations.set(ore.type, []);
                    }
                    this.knownOreLocations.get(ore.type).push({
                        position: ore.position,
                        timestamp: Date.now()
                    });
                }
            }
        }

        return discoveries;
    }

    async detectStructure(structureType) {
        // Look for structure indicators
        const searchRadius = 50;
        const pos = this.bot.entity.position;

        if (structureType === 'village') {
            // Look for village buildings (wood planks, logs, etc.)
            const villageBlocks = ['oak_planks', 'cobblestone', 'oak_log', 'hay_block'];
            
            for (const blockName of villageBlocks) {
                const block = this.bot.findBlock({
                    matching: b => b.name === blockName,
                    maxDistance: searchRadius
                });
                
                if (block) {
                    return block.position;
                }
            }
        } else if (structureType === 'temple') {
            // Look for temple blocks
            const templeBlocks = ['sandstone', 'chiseled_sandstone', 'mossy_cobblestone'];
            
            for (const blockName of templeBlocks) {
                const block = this.bot.findBlock({
                    matching: b => b.name === blockName,
                    maxDistance: searchRadius
                });
                
                if (block) {
                    return block.position;
                }
            }
        }

        return null;
    }

    async detectBiome() {
        const pos = this.bot.entity.position;
        
        // Simple biome detection based on blocks around
        const nearbyBlocks = [];
        const radius = 10;
        
        for (let x = -radius; x <= radius; x += 5) {
            for (let z = -radius; z <= radius; z += 5) {
                const block = this.bot.blockAt(pos.offset(x, -1, z));
                if (block) {
                    nearbyBlocks.push(block.name);
                }
            }
        }

        // Analyze blocks to determine biome
        if (nearbyBlocks.some(b => b.includes('sand'))) {
            return 'desert';
        } else if (nearbyBlocks.some(b => b.includes('snow') || b.includes('ice'))) {
            return 'snowy';
        } else if (nearbyBlocks.some(b => b === 'grass_block')) {
            return 'plains/forest';
        } else if (nearbyBlocks.some(b => b === 'stone')) {
            return 'mountains';
        }

        return 'unknown';
    }

    async scanForOres() {
        const ores = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'lapis_ore'];
        let foundCount = 0;
        const foundOres = [];

        for (const ore of ores) {
            const found = this.bot.findBlock({
                matching: b => b.name.includes(ore),
                maxDistance: 32
            });

            if (found) {
                foundCount++;
                const oreName = ore.replace('_ore', '');
                await this.notifier.send(`${oreName} ore vein spotted nearby!`);
                
                // Store ore location for mining
                foundOres.push({
                    type: oreName,
                    position: found.position.clone(),
                    block: found
                });
            }
        }

        // Return both count and ore locations for mining
        return { count: foundCount, ores: foundOres };
    }

    async returnToWaypoint(waypointName) {
        const waypoint = this.waypoints.find(w => w.name === waypointName);
        
        if (!waypoint) {
            console.log(`Waypoint ${waypointName} not found`);
            return false;
        }

        console.log(`Returning to waypoint: ${waypointName}`);
        
        try {
            await this.bot.pathfinder.goto(new goals.GoalBlock(
                waypoint.position.x,
                waypoint.position.y,
                waypoint.position.z
            ));
            
            console.log(`Arrived at ${waypointName}`);
            return true;
        } catch (error) {
            console.error(`Error returning to ${waypointName}:`, error.message);
            return false;
        }
    }

    async returnHome() {
        if (!this.homeBase) {
            console.log('No home base set');
            return false;
        }

        return await this.returnToWaypoint('Home Base');
    }

    getExplorationStats() {
        return {
            visitedLocations: this.visitedLocations.size,
            discoveredStructures: this.discoveredStructures.length,
            discoveredBiomes: Array.from(this.discoveredBiomes),
            waypoints: this.waypoints.length
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Remember tree locations for efficient wood gathering
     */
    rememberTreeLocation(position, treeType) {
        this.knownTreeLocations.push({
            position: position.clone(),
            type: treeType,
            timestamp: Date.now()
        });
        
        // Keep only recent tree locations
        if (this.knownTreeLocations.length > MAX_TREE_LOCATIONS) {
            this.knownTreeLocations.shift();
        }
    }

    /**
     * Find nearest known tree location
     */
    findNearestKnownTree(maxAge = TREE_LOCATION_EXPIRY_MS) {
        const now = Date.now();
        const currentPos = this.bot.entity.position;
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const tree of this.knownTreeLocations) {
            // Skip old locations
            if (now - tree.timestamp > maxAge) continue;
            
            const distance = currentPos.distanceTo(tree.position);
            // Don't return trees too close (likely already chopped)
            if (distance < minDistance && distance > MIN_TREE_DISTANCE) {
                minDistance = distance;
                nearest = tree;
            }
        }
        
        return nearest;
    }

    /**
     * Mark a chunk as explored
     */
    markChunkExplored(position) {
        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;
        this.exploredChunks.add(key);
    }

    /**
     * Check if chunk has been explored
     */
    isChunkExplored(position) {
        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;
        return this.exploredChunks.has(key);
    }

    /**
     * Find an unexplored chunk nearby
     */
    findUnexploredChunk(maxDistance = 10) {
        const currentPos = this.bot.entity.position;
        const currentChunkX = Math.floor(currentPos.x / CHUNK_SIZE);
        const currentChunkZ = Math.floor(currentPos.z / CHUNK_SIZE);
        
        // Search in expanding rings
        for (let radius = 1; radius <= maxDistance; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const chunkX = currentChunkX + dx;
                    const chunkZ = currentChunkZ + dz;
                    const key = `${chunkX},${chunkZ}`;
                    
                    if (!this.exploredChunks.has(key)) {
                        // Return center of unexplored chunk
                        return new Vec3(chunkX * CHUNK_SIZE + 8, currentPos.y, chunkZ * CHUNK_SIZE + 8);
                    }
                }
            }
        }
        
        return null;
    }
}

module.exports = ExplorationSystem;
