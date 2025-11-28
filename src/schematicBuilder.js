/**
 * Schematic Builder - v4.2.0
 * 
 * Autonomous base construction system with schematic support
 * Features:
 * - Load/save building blueprints in JSON format
 * - 3D voxel-based structure definitions
 * - Material requirement calculations
 * - Intelligent building queue with priority
 * - Foundation preparation and terrain leveling
 * - Progress tracking and pause/resume support
 * - Pre-made base templates
 * 
 * Memory optimized for 512MB RAM environments
 */

const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const EventBus = require('./eventBus');
const fs = require('fs');
const path = require('path');

// Memory-efficient constants
const MAX_BUILD_QUEUE = 20;
const MAX_SCHEMATIC_SIZE = 50; // Max 50x50x50 blocks
const BUILD_TIMEOUT_MS = 600000; // 10 minutes per structure
const PLACE_DELAY_MS = 100; // Delay between block placements

/**
 * Build priority levels
 */
const BuildPriority = {
    CRITICAL: 100,    // Shelter, essential protection
    HIGH: 75,         // Storage, crafting stations
    MEDIUM: 50,       // Farms, decorations
    LOW: 25,          // Expansions, aesthetics
    BACKGROUND: 0     // Optional builds
};

/**
 * Build status
 */
const BuildStatus = {
    QUEUED: 'queued',
    PREPARING: 'preparing',
    BUILDING: 'building',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

/**
 * Schematic structure representation
 */
class Schematic {
    constructor(data = {}) {
        this.name = data.name || 'Unnamed';
        this.description = data.description || '';
        this.version = data.version || '1.0';
        this.author = data.author || 'bot';

        // Dimensions
        this.width = data.width || 0;
        this.height = data.height || 0;
        this.depth = data.depth || 0;

        // Block data: Array of { x, y, z, block, metadata }
        this.blocks = data.blocks || [];

        // Material requirements (calculated)
        this.materials = data.materials || {};

        // Build order (layers from bottom to top)
        this.buildOrder = data.buildOrder || [];

        // Metadata
        this.createdAt = data.createdAt || Date.now();
        this.tags = data.tags || [];
    }

    /**
     * Calculate material requirements
     */
    calculateMaterials() {
        const materials = {};

        for (const block of this.blocks) {
            if (block.block === 'air') continue;

            if (!materials[block.block]) {
                materials[block.block] = 0;
            }
            materials[block.block]++;
        }

        this.materials = materials;
        return materials;
    }

    /**
     * Generate optimized build order (bottom to top, inside to outside)
     */
    generateBuildOrder() {
        // Sort blocks by Y (bottom first), then by distance from center
        const centerX = this.width / 2;
        const centerZ = this.depth / 2;

        const sortedBlocks = [...this.blocks].filter(b => b.block !== 'air');

        sortedBlocks.sort((a, b) => {
            // First by Y level
            if (a.y !== b.y) return a.y - b.y;

            // Then by distance from center (inside first for structural integrity)
            const distA = Math.sqrt(Math.pow(a.x - centerX, 2) + Math.pow(a.z - centerZ, 2));
            const distB = Math.sqrt(Math.pow(b.x - centerX, 2) + Math.pow(b.z - centerZ, 2));
            return distA - distB;
        });

        this.buildOrder = sortedBlocks;
        return this.buildOrder;
    }

    /**
     * Validate schematic
     */
    validate() {
        const errors = [];

        if (this.width > MAX_SCHEMATIC_SIZE || this.height > MAX_SCHEMATIC_SIZE || this.depth > MAX_SCHEMATIC_SIZE) {
            errors.push(`Schematic too large. Max size: ${MAX_SCHEMATIC_SIZE}x${MAX_SCHEMATIC_SIZE}x${MAX_SCHEMATIC_SIZE}`);
        }

        if (this.blocks.length === 0) {
            errors.push('Schematic has no blocks');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Export to JSON
     */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            version: this.version,
            author: this.author,
            width: this.width,
            height: this.height,
            depth: this.depth,
            blocks: this.blocks,
            materials: this.materials,
            createdAt: this.createdAt,
            tags: this.tags
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        const schematic = new Schematic(json);
        schematic.calculateMaterials();
        schematic.generateBuildOrder();
        return schematic;
    }
}

/**
 * Build job tracking
 */
class BuildJob {
    constructor(schematic, position, options = {}) {
        this.id = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.schematic = schematic;
        this.position = position; // World position to build at
        this.priority = options.priority || BuildPriority.MEDIUM;
        this.status = BuildStatus.QUEUED;

        // Progress tracking
        this.blocksPlaced = 0;
        this.totalBlocks = schematic.buildOrder?.length || schematic.blocks.length;
        this.currentBlockIndex = 0;

        // Timing
        this.startTime = null;
        this.endTime = null;
        this.pausedAt = null;
        this.totalPausedTime = 0;

        // Error tracking
        this.errors = [];
        this.retries = 0;
        this.maxRetries = options.maxRetries || 3;
    }

    getProgress() {
        return this.totalBlocks > 0 ? (this.blocksPlaced / this.totalBlocks) * 100 : 0;
    }

    getEstimatedTimeRemaining() {
        if (!this.startTime || this.blocksPlaced === 0) return null;

        const elapsed = Date.now() - this.startTime - this.totalPausedTime;
        const blocksRemaining = this.totalBlocks - this.blocksPlaced;
        const avgTimePerBlock = elapsed / this.blocksPlaced;

        return blocksRemaining * avgTimePerBlock;
    }
}

/**
 * Pre-made schematic templates
 */
const SchematicTemplates = {
    /**
     * Starter base - 10x10 wood shelter
     */
    starterBase: () => {
        const blocks = [];
        const size = 10;
        const height = 5;

        // Floor
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                blocks.push({ x, y: 0, z, block: 'oak_planks' });
            }
        }

        // Walls
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < size; x++) {
                // Front and back walls
                if (y < height - 1 || x < 3 || x > size - 4) { // Leave gap for roof
                    blocks.push({ x, y, z: 0, block: 'oak_planks' });
                    blocks.push({ x, y, z: size - 1, block: 'oak_planks' });
                }
            }
            for (let z = 1; z < size - 1; z++) {
                // Side walls
                if (y < height - 1 || z < 3 || z > size - 4) {
                    blocks.push({ x: 0, y, z, block: 'oak_planks' });
                    blocks.push({ x: size - 1, y, z, block: 'oak_planks' });
                }
            }
        }

        // Roof
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                blocks.push({ x, y: height, z, block: 'oak_planks' });
            }
        }

        // Door opening (remove blocks)
        blocks.push({ x: Math.floor(size / 2), y: 1, z: 0, block: 'air' });
        blocks.push({ x: Math.floor(size / 2), y: 2, z: 0, block: 'air' });

        // Interior - crafting table
        blocks.push({ x: 1, y: 1, z: 1, block: 'crafting_table' });

        // Interior - furnace
        blocks.push({ x: 1, y: 1, z: size - 2, block: 'furnace' });

        // Interior - chest
        blocks.push({ x: size - 2, y: 1, z: 1, block: 'chest' });

        // Torches
        blocks.push({ x: 1, y: 2, z: Math.floor(size / 2), block: 'torch' });
        blocks.push({ x: size - 2, y: 2, z: Math.floor(size / 2), block: 'torch' });

        return new Schematic({
            name: 'Starter Base',
            description: '10x10 wooden shelter with basic amenities',
            width: size,
            height: height + 1,
            depth: size,
            blocks,
            tags: ['starter', 'shelter', 'wood']
        });
    },

    /**
     * Storage room
     */
    storageRoom: () => {
        const blocks = [];
        const width = 7;
        const depth = 7;
        const height = 4;

        // Floor
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                blocks.push({ x, y: 0, z, block: 'stone_bricks' });
            }
        }

        // Walls
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < width; x++) {
                blocks.push({ x, y, z: 0, block: 'stone_bricks' });
                blocks.push({ x, y, z: depth - 1, block: 'stone_bricks' });
            }
            for (let z = 1; z < depth - 1; z++) {
                blocks.push({ x: 0, y, z, block: 'stone_bricks' });
                blocks.push({ x: width - 1, y, z, block: 'stone_bricks' });
            }
        }

        // Roof
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                blocks.push({ x, y: height, z, block: 'stone_bricks' });
            }
        }

        // Chests along walls (double chests)
        for (let z = 1; z < depth - 1; z++) {
            blocks.push({ x: 1, y: 1, z, block: 'chest' });
            blocks.push({ x: width - 2, y: 1, z, block: 'chest' });
        }

        // Door opening
        blocks.push({ x: Math.floor(width / 2), y: 1, z: 0, block: 'air' });
        blocks.push({ x: Math.floor(width / 2), y: 2, z: 0, block: 'air' });

        // Lighting
        blocks.push({ x: Math.floor(width / 2), y: height - 1, z: Math.floor(depth / 2), block: 'lantern' });

        return new Schematic({
            name: 'Storage Room',
            description: '7x7 stone storage room with chests',
            width,
            height: height + 1,
            depth,
            blocks,
            tags: ['storage', 'stone', 'functional']
        });
    },

    /**
     * Farm plot (9x9 with water in center)
     */
    farmPlot: () => {
        const blocks = [];
        const size = 9;

        // Farmland
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (x === Math.floor(size / 2) && z === Math.floor(size / 2)) {
                    blocks.push({ x, y: 0, z, block: 'water' });
                } else {
                    blocks.push({ x, y: 0, z, block: 'farmland' });
                }
            }
        }

        // Border
        for (let x = -1; x <= size; x++) {
            blocks.push({ x, y: 0, z: -1, block: 'oak_log' });
            blocks.push({ x, y: 0, z: size, block: 'oak_log' });
        }
        for (let z = 0; z < size; z++) {
            blocks.push({ x: -1, y: 0, z, block: 'oak_log' });
            blocks.push({ x: size, y: 0, z, block: 'oak_log' });
        }

        // Corner torches
        blocks.push({ x: -1, y: 1, z: -1, block: 'torch' });
        blocks.push({ x: size, y: 1, z: -1, block: 'torch' });
        blocks.push({ x: -1, y: 1, z: size, block: 'torch' });
        blocks.push({ x: size, y: 1, z: size, block: 'torch' });

        return new Schematic({
            name: 'Farm Plot',
            description: '9x9 farm with water source and lighting',
            width: size + 2,
            height: 2,
            depth: size + 2,
            blocks,
            tags: ['farm', 'agriculture', 'functional']
        });
    },

    /**
     * Watchtower
     */
    watchtower: () => {
        const blocks = [];
        const baseSize = 5;
        const height = 12;

        // Foundation
        for (let x = 0; x < baseSize; x++) {
            for (let z = 0; z < baseSize; z++) {
                blocks.push({ x, y: 0, z, block: 'cobblestone' });
            }
        }

        // Tower walls
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < baseSize; x++) {
                blocks.push({ x, y, z: 0, block: 'cobblestone' });
                blocks.push({ x, y, z: baseSize - 1, block: 'cobblestone' });
            }
            for (let z = 1; z < baseSize - 1; z++) {
                blocks.push({ x: 0, y, z, block: 'cobblestone' });
                blocks.push({ x: baseSize - 1, y, z, block: 'cobblestone' });
            }
        }

        // Interior floors every 4 blocks
        for (let floorY = 4; floorY < height; floorY += 4) {
            for (let x = 1; x < baseSize - 1; x++) {
                for (let z = 1; z < baseSize - 1; z++) {
                    blocks.push({ x, y: floorY, z, block: 'oak_planks' });
                }
            }
        }

        // Top platform (wider)
        for (let x = -1; x < baseSize + 1; x++) {
            for (let z = -1; z < baseSize + 1; z++) {
                blocks.push({ x, y: height, z, block: 'stone_bricks' });
            }
        }

        // Battlements
        for (let x = -1; x < baseSize + 1; x++) {
            if (x % 2 === 0) {
                blocks.push({ x, y: height + 1, z: -1, block: 'stone_bricks' });
                blocks.push({ x, y: height + 1, z: baseSize, block: 'stone_bricks' });
            }
        }
        for (let z = 0; z < baseSize; z++) {
            if (z % 2 === 0) {
                blocks.push({ x: -1, y: height + 1, z, block: 'stone_bricks' });
                blocks.push({ x: baseSize, y: height + 1, z, block: 'stone_bricks' });
            }
        }

        // Door
        blocks.push({ x: Math.floor(baseSize / 2), y: 1, z: 0, block: 'air' });
        blocks.push({ x: Math.floor(baseSize / 2), y: 2, z: 0, block: 'air' });

        // Top lighting
        blocks.push({ x: Math.floor(baseSize / 2), y: height + 1, z: Math.floor(baseSize / 2), block: 'lantern' });

        return new Schematic({
            name: 'Watchtower',
            description: 'Defensive watchtower with observation platform',
            width: baseSize + 2,
            height: height + 2,
            depth: baseSize + 2,
            blocks,
            tags: ['defense', 'tower', 'stone']
        });
    },

    /**
     * Mining outpost
     */
    miningOutpost: () => {
        const blocks = [];
        const size = 6;
        const height = 4;

        // Floor
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                blocks.push({ x, y: 0, z, block: 'cobblestone' });
            }
        }

        // Walls (partial for ventilation)
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < size; x++) {
                if (y < height - 1) {
                    blocks.push({ x, y, z: 0, block: 'cobblestone' });
                    blocks.push({ x, y, z: size - 1, block: 'cobblestone' });
                }
            }
            for (let z = 1; z < size - 1; z++) {
                if (y < height - 1) {
                    blocks.push({ x: 0, y, z, block: 'cobblestone' });
                    blocks.push({ x: size - 1, y, z, block: 'cobblestone' });
                }
            }
        }

        // Roof
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                blocks.push({ x, y: height, z, block: 'oak_planks' });
            }
        }

        // Door
        blocks.push({ x: Math.floor(size / 2), y: 1, z: 0, block: 'air' });
        blocks.push({ x: Math.floor(size / 2), y: 2, z: 0, block: 'air' });

        // Furnaces for smelting
        blocks.push({ x: 1, y: 1, z: size - 2, block: 'furnace' });
        blocks.push({ x: 2, y: 1, z: size - 2, block: 'furnace' });

        // Chest
        blocks.push({ x: size - 2, y: 1, z: size - 2, block: 'chest' });

        // Crafting table
        blocks.push({ x: size - 2, y: 1, z: 1, block: 'crafting_table' });

        // Lighting
        blocks.push({ x: Math.floor(size / 2), y: height - 1, z: Math.floor(size / 2), block: 'lantern' });

        return new Schematic({
            name: 'Mining Outpost',
            description: 'Small outpost with furnaces for underground mining',
            width: size,
            height: height + 1,
            depth: size,
            blocks,
            tags: ['mining', 'outpost', 'functional']
        });
    }
};

/**
 * Main Schematic Builder class
 */
class SchematicBuilder {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;

        // Build queue
        this.buildQueue = [];
        this.currentBuild = null;
        this.isBuilding = false;

        // Loaded schematics
        this.schematics = new Map();

        // Statistics
        this.stats = {
            totalBuilds: 0,
            blocksPlaced: 0,
            failedBuilds: 0,
            totalBuildTime: 0
        };

        // Load templates
        this.loadTemplates();
    }

    /**
     * Load pre-made templates
     */
    loadTemplates() {
        for (const [name, generator] of Object.entries(SchematicTemplates)) {
            const schematic = generator();
            schematic.calculateMaterials();
            schematic.generateBuildOrder();
            this.schematics.set(name, schematic);
        }

        console.log(`[Schematic Builder] Loaded ${this.schematics.size} templates`);
    }

    /**
     * Load schematic from JSON file
     */
    loadSchematicFromFile(filePath) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const schematic = Schematic.fromJSON(data);

            const validation = schematic.validate();
            if (!validation.valid) {
                console.error(`[Schematic Builder] Invalid schematic: ${validation.errors.join(', ')}`);
                return null;
            }

            this.schematics.set(schematic.name, schematic);
            console.log(`[Schematic Builder] Loaded schematic: ${schematic.name}`);

            return schematic;
        } catch (error) {
            console.error(`[Schematic Builder] Error loading schematic: ${error.message}`);
            return null;
        }
    }

    /**
     * Save schematic to JSON file
     */
    saveSchematicToFile(schematic, filePath) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(schematic.toJSON(), null, 2));
            console.log(`[Schematic Builder] Saved schematic: ${schematic.name}`);
            return true;
        } catch (error) {
            console.error(`[Schematic Builder] Error saving schematic: ${error.message}`);
            return false;
        }
    }

    /**
     * Queue a build job
     */
    queueBuild(schematicName, position, options = {}) {
        const schematic = this.schematics.get(schematicName);
        if (!schematic) {
            console.error(`[Schematic Builder] Schematic not found: ${schematicName}`);
            return null;
        }

        if (this.buildQueue.length >= MAX_BUILD_QUEUE) {
            console.warn('[Schematic Builder] Build queue full');
            return null;
        }

        const job = new BuildJob(schematic, position, options);

        // Insert by priority
        const insertIndex = this.buildQueue.findIndex(j => j.priority < job.priority);
        if (insertIndex === -1) {
            this.buildQueue.push(job);
        } else {
            this.buildQueue.splice(insertIndex, 0, job);
        }

        console.log(`[Schematic Builder] Queued build: ${schematic.name} at ${position}`);

        EventBus.emit('build:queued', {
            jobId: job.id,
            schematic: schematic.name,
            position: { x: position.x, y: position.y, z: position.z },
            priority: job.priority
        });

        // Start building if not already building
        if (!this.isBuilding) {
            this.processQueue();
        }

        return job.id;
    }

    /**
     * Process the build queue
     */
    async processQueue() {
        if (this.isBuilding || this.buildQueue.length === 0) return;

        this.currentBuild = this.buildQueue.shift();
        this.isBuilding = true;

        console.log(`[Schematic Builder] Starting build: ${this.currentBuild.schematic.name}`);
        await this.notifier?.send?.(`🏗️ Starting build: ${this.currentBuild.schematic.name}`);

        try {
            await this.executeBuild(this.currentBuild);
        } catch (error) {
            console.error(`[Schematic Builder] Build failed: ${error.message}`);
            this.currentBuild.status = BuildStatus.FAILED;
            this.currentBuild.errors.push(error.message);
            this.stats.failedBuilds++;
        }

        this.isBuilding = false;
        this.currentBuild = null;

        // Process next build
        if (this.buildQueue.length > 0) {
            setTimeout(() => this.processQueue(), 1000);
        }
    }

    /**
     * Execute a build job
     */
    async executeBuild(job) {
        job.status = BuildStatus.PREPARING;
        job.startTime = Date.now();

        // Check materials
        const missingMaterials = this.checkMaterials(job.schematic);
        if (Object.keys(missingMaterials).length > 0) {
            console.log(`[Schematic Builder] Missing materials:`, missingMaterials);
            job.errors.push(`Missing materials: ${JSON.stringify(missingMaterials)}`);

            // Try to continue with available materials
            if (Object.values(missingMaterials).every(v => v > job.schematic.materials[Object.keys(missingMaterials)[0]] * 0.5)) {
                job.status = BuildStatus.FAILED;
                throw new Error('Insufficient materials');
            }
        }

        job.status = BuildStatus.BUILDING;

        // Navigate to build position
        try {
            await this.bot.pathfinder.goto(new goals.GoalNear(
                job.position.x,
                job.position.y,
                job.position.z,
                3
            ));
        } catch (error) {
            console.warn(`[Schematic Builder] Navigation failed: ${error.message}`);
        }

        // Build blocks in order
        const buildOrder = job.schematic.buildOrder.length > 0
            ? job.schematic.buildOrder
            : job.schematic.blocks;

        for (let i = job.currentBlockIndex; i < buildOrder.length; i++) {
            // Check for pause
            if (job.status === BuildStatus.PAUSED) {
                job.currentBlockIndex = i;
                return;
            }

            // Check timeout
            if (Date.now() - job.startTime - job.totalPausedTime > BUILD_TIMEOUT_MS) {
                job.status = BuildStatus.FAILED;
                job.errors.push('Build timeout');
                throw new Error('Build timeout exceeded');
            }

            const blockData = buildOrder[i];

            // Skip air blocks
            if (blockData.block === 'air') continue;

            const worldPos = new Vec3(
                job.position.x + blockData.x,
                job.position.y + blockData.y,
                job.position.z + blockData.z
            );

            const success = await this.placeBlock(worldPos, blockData.block);

            if (success) {
                job.blocksPlaced++;
                this.stats.blocksPlaced++;
            }

            job.currentBlockIndex = i + 1;

            // Emit progress
            if (job.blocksPlaced % 10 === 0) {
                EventBus.emit('build:progress', {
                    jobId: job.id,
                    progress: job.getProgress(),
                    blocksPlaced: job.blocksPlaced,
                    totalBlocks: job.totalBlocks
                });
            }

            await this.sleep(PLACE_DELAY_MS);
        }

        // Build complete
        job.status = BuildStatus.COMPLETED;
        job.endTime = Date.now();

        const buildTime = job.endTime - job.startTime - job.totalPausedTime;
        this.stats.totalBuilds++;
        this.stats.totalBuildTime += buildTime;

        console.log(`[Schematic Builder] Build complete: ${job.schematic.name} in ${Math.round(buildTime / 1000)}s`);
        await this.notifier?.send?.(`✅ Build complete: ${job.schematic.name}`);

        EventBus.emit('build:completed', {
            jobId: job.id,
            schematic: job.schematic.name,
            buildTime,
            blocksPlaced: job.blocksPlaced
        });
    }

    /**
     * Place a single block
     */
    async placeBlock(position, blockType) {
        try {
            // Check if there's already a block there
            const existingBlock = this.bot.blockAt(position);
            if (existingBlock && existingBlock.name !== 'air' && existingBlock.name !== 'cave_air') {
                return true; // Already has a block
            }

            // Find the block in inventory
            const blockItem = this.inventory?.findItem?.(blockType);
            if (!blockItem) {
                return false; // Don't have the block
            }

            // Equip the block
            await this.bot.equip(blockItem, 'hand');

            // Find a reference block to place against
            const referenceBlock = this.findReferenceBlock(position);
            if (!referenceBlock) {
                return false; // No reference to place against
            }

            // Calculate face vector
            const faceVector = new Vec3(
                position.x - referenceBlock.position.x,
                position.y - referenceBlock.position.y,
                position.z - referenceBlock.position.z
            );

            // Place the block
            await this.bot.placeBlock(referenceBlock, faceVector);

            return true;
        } catch (error) {
            // Silently fail for individual block placement errors
            return false;
        }
    }

    /**
     * Find a reference block to place against
     */
    findReferenceBlock(targetPosition) {
        const offsets = [
            new Vec3(0, -1, 0), // Below
            new Vec3(-1, 0, 0), // West
            new Vec3(1, 0, 0),  // East
            new Vec3(0, 0, -1), // North
            new Vec3(0, 0, 1),  // South
            new Vec3(0, 1, 0)   // Above
        ];

        for (const offset of offsets) {
            const checkPos = targetPosition.plus(offset);
            const block = this.bot.blockAt(checkPos);

            if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'water') {
                return block;
            }
        }

        return null;
    }

    /**
     * Check available materials
     */
    checkMaterials(schematic) {
        const missing = {};
        const inventory = this.bot.inventory?.items?.() || [];

        for (const [material, required] of Object.entries(schematic.materials)) {
            const available = inventory
                .filter(item => item.name === material || item.name.includes(material))
                .reduce((sum, item) => sum + item.count, 0);

            if (available < required) {
                missing[material] = required - available;
            }
        }

        return missing;
    }

    /**
     * Pause current build
     */
    pauseBuild() {
        if (this.currentBuild && this.currentBuild.status === BuildStatus.BUILDING) {
            this.currentBuild.status = BuildStatus.PAUSED;
            this.currentBuild.pausedAt = Date.now();
            console.log(`[Schematic Builder] Build paused: ${this.currentBuild.schematic.name}`);
            return true;
        }
        return false;
    }

    /**
     * Resume paused build
     */
    resumeBuild() {
        if (this.currentBuild && this.currentBuild.status === BuildStatus.PAUSED) {
            this.currentBuild.totalPausedTime += Date.now() - this.currentBuild.pausedAt;
            this.currentBuild.status = BuildStatus.BUILDING;
            console.log(`[Schematic Builder] Build resumed: ${this.currentBuild.schematic.name}`);

            // Re-execute
            this.executeBuild(this.currentBuild).catch(error => {
                console.error(`[Schematic Builder] Resume failed: ${error.message}`);
            });

            return true;
        }
        return false;
    }

    /**
     * Cancel current or queued build
     */
    cancelBuild(jobId) {
        // Check if it's the current build
        if (this.currentBuild && this.currentBuild.id === jobId) {
            this.currentBuild.status = BuildStatus.FAILED;
            this.currentBuild.errors.push('Cancelled by user');
            this.isBuilding = false;
            console.log(`[Schematic Builder] Build cancelled: ${this.currentBuild.schematic.name}`);
            return true;
        }

        // Check queue
        const index = this.buildQueue.findIndex(j => j.id === jobId);
        if (index !== -1) {
            this.buildQueue.splice(index, 1);
            console.log(`[Schematic Builder] Queued build cancelled`);
            return true;
        }

        return false;
    }

    /**
     * Get available schematics
     */
    getAvailableSchematics() {
        return Array.from(this.schematics.entries()).map(([name, schematic]) => ({
            name,
            description: schematic.description,
            dimensions: `${schematic.width}x${schematic.height}x${schematic.depth}`,
            materials: schematic.materials,
            tags: schematic.tags
        }));
    }

    /**
     * Get build queue status
     */
    getQueueStatus() {
        return {
            current: this.currentBuild ? {
                id: this.currentBuild.id,
                schematic: this.currentBuild.schematic.name,
                status: this.currentBuild.status,
                progress: this.currentBuild.getProgress(),
                estimatedTimeRemaining: this.currentBuild.getEstimatedTimeRemaining()
            } : null,
            queue: this.buildQueue.map(job => ({
                id: job.id,
                schematic: job.schematic.name,
                priority: job.priority,
                status: job.status
            })),
            isBuilding: this.isBuilding
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            availableSchematics: this.schematics.size,
            queueLength: this.buildQueue.length,
            avgBuildTime: this.stats.totalBuilds > 0
                ? this.stats.totalBuildTime / this.stats.totalBuilds
                : 0
        };
    }

    /**
     * Create custom schematic from current selection
     */
    createSchematicFromArea(corner1, corner2, name) {
        const blocks = [];
        const minX = Math.min(corner1.x, corner2.x);
        const maxX = Math.max(corner1.x, corner2.x);
        const minY = Math.min(corner1.y, corner2.y);
        const maxY = Math.max(corner1.y, corner2.y);
        const minZ = Math.min(corner1.z, corner2.z);
        const maxZ = Math.max(corner1.z, corner2.z);

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const depth = maxZ - minZ + 1;

        // Validate size
        if (width > MAX_SCHEMATIC_SIZE || height > MAX_SCHEMATIC_SIZE || depth > MAX_SCHEMATIC_SIZE) {
            console.error(`[Schematic Builder] Area too large for schematic`);
            return null;
        }

        // Capture blocks
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.bot.blockAt(new Vec3(x, y, z));
                    if (block && block.name !== 'air') {
                        blocks.push({
                            x: x - minX,
                            y: y - minY,
                            z: z - minZ,
                            block: block.name
                        });
                    }
                }
            }
        }

        const schematic = new Schematic({
            name,
            description: `Custom schematic captured from world`,
            width,
            height,
            depth,
            blocks,
            tags: ['custom']
        });

        schematic.calculateMaterials();
        schematic.generateBuildOrder();

        this.schematics.set(name, schematic);
        console.log(`[Schematic Builder] Created schematic: ${name} (${blocks.length} blocks)`);

        return schematic;
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export classes and constants
module.exports = SchematicBuilder;
module.exports.Schematic = Schematic;
module.exports.BuildJob = BuildJob;
module.exports.BuildPriority = BuildPriority;
module.exports.BuildStatus = BuildStatus;
module.exports.SchematicTemplates = SchematicTemplates;
