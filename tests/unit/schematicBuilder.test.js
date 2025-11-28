/**
 * Tests for SchematicBuilder
 */

// Mock mineflayer-pathfinder before any imports
jest.mock('mineflayer-pathfinder', () => ({
    goals: {
        GoalNear: jest.fn().mockImplementation((x, y, z, range) => ({ x, y, z, range })),
        GoalBlock: jest.fn().mockImplementation((x, y, z) => ({ x, y, z }))
    },
    pathfinder: jest.fn(),
    Movements: jest.fn()
}));

// Mock Vec3 before import
jest.mock('vec3', () => {
    return function(x, y, z) {
        return {
            x, y, z,
            clone: function() { return { x: this.x, y: this.y, z: this.z }; },
            plus: function(other) { return { x: this.x + other.x, y: this.y + other.y, z: this.z + other.z }; }
        };
    };
});

// Mock EventBus
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

const SchematicBuilder = require('../../src/schematicBuilder');
const { Schematic, BuildJob, BuildPriority, BuildStatus, SchematicTemplates } = require('../../src/schematicBuilder');

describe('Schematic', () => {
    describe('creation', () => {
        it('should create empty schematic', () => {
            const schematic = new Schematic();

            expect(schematic.name).toBe('Unnamed');
            expect(schematic.width).toBe(0);
            expect(schematic.blocks.length).toBe(0);
        });

        it('should create schematic with data', () => {
            const schematic = new Schematic({
                name: 'Test Building',
                width: 10,
                height: 5,
                depth: 10,
                blocks: [{ x: 0, y: 0, z: 0, block: 'stone' }]
            });

            expect(schematic.name).toBe('Test Building');
            expect(schematic.width).toBe(10);
            expect(schematic.blocks.length).toBe(1);
        });
    });

    describe('material calculation', () => {
        it('should calculate materials', () => {
            const schematic = new Schematic({
                blocks: [
                    { x: 0, y: 0, z: 0, block: 'stone' },
                    { x: 1, y: 0, z: 0, block: 'stone' },
                    { x: 2, y: 0, z: 0, block: 'oak_planks' },
                    { x: 0, y: 1, z: 0, block: 'air' }
                ]
            });

            const materials = schematic.calculateMaterials();

            expect(materials.stone).toBe(2);
            expect(materials.oak_planks).toBe(1);
            expect(materials.air).toBeUndefined(); // Air not counted
        });
    });

    describe('build order', () => {
        it('should generate build order bottom to top', () => {
            const schematic = new Schematic({
                width: 3,
                height: 3,
                depth: 3,
                blocks: [
                    { x: 1, y: 2, z: 1, block: 'stone' },
                    { x: 1, y: 0, z: 1, block: 'stone' },
                    { x: 1, y: 1, z: 1, block: 'stone' }
                ]
            });

            const order = schematic.generateBuildOrder();

            expect(order[0].y).toBe(0);
            expect(order[1].y).toBe(1);
            expect(order[2].y).toBe(2);
        });

        it('should exclude air blocks from build order', () => {
            const schematic = new Schematic({
                blocks: [
                    { x: 0, y: 0, z: 0, block: 'stone' },
                    { x: 1, y: 0, z: 0, block: 'air' },
                    { x: 2, y: 0, z: 0, block: 'stone' }
                ]
            });

            const order = schematic.generateBuildOrder();

            expect(order.length).toBe(2);
        });
    });

    describe('validation', () => {
        it('should validate normal schematic', () => {
            const schematic = new Schematic({
                width: 10,
                height: 10,
                depth: 10,
                blocks: [{ x: 0, y: 0, z: 0, block: 'stone' }]
            });

            const result = schematic.validate();

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail validation for too large schematic', () => {
            const schematic = new Schematic({
                width: 100,
                height: 100,
                depth: 100,
                blocks: [{ x: 0, y: 0, z: 0, block: 'stone' }]
            });

            const result = schematic.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should fail validation for empty schematic', () => {
            const schematic = new Schematic({
                width: 10,
                height: 10,
                depth: 10,
                blocks: []
            });

            const result = schematic.validate();

            expect(result.valid).toBe(false);
        });
    });

    describe('serialization', () => {
        it('should convert to JSON', () => {
            const schematic = new Schematic({
                name: 'Test',
                width: 5,
                height: 5,
                depth: 5,
                blocks: [{ x: 0, y: 0, z: 0, block: 'stone' }],
                tags: ['test']
            });

            const json = schematic.toJSON();

            expect(json.name).toBe('Test');
            expect(json.tags).toContain('test');
        });

        it('should create from JSON', () => {
            const json = {
                name: 'FromJSON',
                width: 3,
                height: 3,
                depth: 3,
                blocks: [{ x: 0, y: 0, z: 0, block: 'stone' }]
            };

            const schematic = Schematic.fromJSON(json);

            expect(schematic.name).toBe('FromJSON');
            expect(schematic.materials).toBeDefined();
            expect(schematic.buildOrder.length).toBeGreaterThan(0);
        });
    });
});

describe('BuildJob', () => {
    let schematic;

    beforeEach(() => {
        schematic = new Schematic({
            name: 'Test',
            blocks: [
                { x: 0, y: 0, z: 0, block: 'stone' },
                { x: 1, y: 0, z: 0, block: 'stone' },
                { x: 2, y: 0, z: 0, block: 'stone' }
            ]
        });
        schematic.generateBuildOrder();
    });

    it('should create build job', () => {
        const job = new BuildJob(schematic, { x: 0, y: 64, z: 0 });

        expect(job.id).toBeDefined();
        expect(job.status).toBe(BuildStatus.QUEUED);
        expect(job.totalBlocks).toBe(3);
    });

    it('should calculate progress', () => {
        const job = new BuildJob(schematic, { x: 0, y: 64, z: 0 });
        job.blocksPlaced = 1;

        expect(job.getProgress()).toBeCloseTo(33.33, 1);
    });

    it('should track priority', () => {
        const job = new BuildJob(schematic, { x: 0, y: 64, z: 0 }, {
            priority: BuildPriority.CRITICAL
        });

        expect(job.priority).toBe(BuildPriority.CRITICAL);
    });
});

describe('SchematicTemplates', () => {
    it('should have starterBase template', () => {
        const schematic = SchematicTemplates.starterBase();

        expect(schematic.name).toBe('Starter Base');
        expect(schematic.blocks.length).toBeGreaterThan(0);
        expect(schematic.tags).toContain('starter');
    });

    it('should have storageRoom template', () => {
        const schematic = SchematicTemplates.storageRoom();

        expect(schematic.name).toBe('Storage Room');
        expect(schematic.blocks.length).toBeGreaterThan(0);
    });

    it('should have farmPlot template', () => {
        const schematic = SchematicTemplates.farmPlot();

        expect(schematic.name).toBe('Farm Plot');
        expect(schematic.tags).toContain('farm');
    });

    it('should have watchtower template', () => {
        const schematic = SchematicTemplates.watchtower();

        expect(schematic.name).toBe('Watchtower');
        expect(schematic.tags).toContain('defense');
    });

    it('should have miningOutpost template', () => {
        const schematic = SchematicTemplates.miningOutpost();

        expect(schematic.name).toBe('Mining Outpost');
        expect(schematic.tags).toContain('mining');
    });

    it('templates should have calculated materials', () => {
        const schematic = SchematicTemplates.starterBase();
        schematic.calculateMaterials();

        expect(Object.keys(schematic.materials).length).toBeGreaterThan(0);
    });
});

describe('SchematicBuilder', () => {
    let builder;
    let mockBot;
    let mockPathfinder;
    let mockNotifier;
    let mockInventory;

    beforeEach(() => {
        mockBot = {
            entity: {
                position: { x: 0, y: 64, z: 0 }
            },
            blockAt: jest.fn(),
            inventory: {
                items: jest.fn().mockReturnValue([
                    { name: 'oak_planks', count: 100 },
                    { name: 'cobblestone', count: 100 }
                ])
            },
            equip: jest.fn(),
            placeBlock: jest.fn()
        };

        mockPathfinder = {
            goto: jest.fn().mockResolvedValue(undefined)
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        mockInventory = {
            findItem: jest.fn().mockReturnValue({ name: 'stone', count: 64 })
        };

        builder = new SchematicBuilder(mockBot, mockPathfinder, mockNotifier, mockInventory);
    });

    describe('initialization', () => {
        it('should load templates on init', () => {
            expect(builder.schematics.size).toBeGreaterThan(0);
        });

        it('should have empty build queue', () => {
            expect(builder.buildQueue.length).toBe(0);
            expect(builder.isBuilding).toBe(false);
        });
    });

    describe('schematic management', () => {
        it('should get available schematics', () => {
            const available = builder.getAvailableSchematics();

            expect(available.length).toBeGreaterThan(0);
            expect(available[0].name).toBeDefined();
            expect(available[0].dimensions).toBeDefined();
        });
    });

    describe('build queue', () => {
        it('should queue build job', () => {
            const jobId = builder.queueBuild('starterBase', { x: 0, y: 64, z: 0 });

            expect(jobId).toBeDefined();
        });

        it('should return null for unknown schematic', () => {
            const jobId = builder.queueBuild('nonexistent', { x: 0, y: 64, z: 0 });

            expect(jobId).toBeNull();
        });

        it('should insert by priority', () => {
            // Make builder not start building automatically
            builder.isBuilding = true;

            builder.queueBuild('starterBase', { x: 0, y: 64, z: 0 }, { priority: BuildPriority.LOW });
            builder.queueBuild('storageRoom', { x: 20, y: 64, z: 0 }, { priority: BuildPriority.CRITICAL });
            builder.queueBuild('farmPlot', { x: 40, y: 64, z: 0 }, { priority: BuildPriority.MEDIUM });

            expect(builder.buildQueue[0].schematic.name).toBe('Storage Room');
            expect(builder.buildQueue[1].schematic.name).toBe('Farm Plot');
            expect(builder.buildQueue[2].schematic.name).toBe('Starter Base');
        });
    });

    describe('material checking', () => {
        it('should check available materials', () => {
            const schematic = new Schematic({
                materials: {
                    oak_planks: 50,
                    cobblestone: 50,
                    diamond_block: 100 // Not in inventory
                }
            });

            const missing = builder.checkMaterials(schematic);

            expect(missing.oak_planks).toBeUndefined();
            expect(missing.diamond_block).toBe(100);
        });
    });

    describe('build control', () => {
        it('should pause build', () => {
            builder.currentBuild = new BuildJob(
                SchematicTemplates.starterBase(),
                { x: 0, y: 64, z: 0 }
            );
            builder.currentBuild.status = BuildStatus.BUILDING;

            const result = builder.pauseBuild();

            expect(result).toBe(true);
            expect(builder.currentBuild.status).toBe(BuildStatus.PAUSED);
        });

        it('should not pause if not building', () => {
            const result = builder.pauseBuild();

            expect(result).toBe(false);
        });

        it('should cancel queued build', () => {
            builder.isBuilding = true;
            const jobId = builder.queueBuild('starterBase', { x: 0, y: 64, z: 0 });

            const result = builder.cancelBuild(jobId);

            expect(result).toBe(true);
            expect(builder.buildQueue.length).toBe(0);
        });
    });

    describe('queue status', () => {
        it('should return queue status', () => {
            builder.isBuilding = true;
            builder.queueBuild('starterBase', { x: 0, y: 64, z: 0 });

            const status = builder.getQueueStatus();

            expect(status.queue.length).toBe(1);
            expect(status.isBuilding).toBe(true);
        });
    });

    describe('statistics', () => {
        it('should return stats', () => {
            const stats = builder.getStats();

            expect(stats.totalBuilds).toBe(0);
            expect(stats.blocksPlaced).toBe(0);
            expect(stats.availableSchematics).toBeGreaterThan(0);
        });
    });

    describe('reference block finding', () => {
        it('should find reference block', () => {
            mockBot.blockAt = jest.fn((pos) => {
                if (pos.y === 63) return { name: 'stone' }; // Below
                return { name: 'air' };
            });

            const target = { x: 0, y: 64, z: 0, plus: (v) => ({ x: 0 + v.x, y: 64 + v.y, z: 0 + v.z }) };
            const reference = builder.findReferenceBlock(target);

            expect(reference).toBeDefined();
            expect(reference.name).toBe('stone');
        });

        it('should return null if no reference', () => {
            mockBot.blockAt = jest.fn().mockReturnValue({ name: 'air' });

            const target = { x: 0, y: 64, z: 0, plus: (v) => ({ x: v.x, y: 64 + v.y, z: v.z }) };
            const reference = builder.findReferenceBlock(target);

            expect(reference).toBeNull();
        });
    });
});
