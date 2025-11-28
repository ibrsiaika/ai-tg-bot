/**
 * Tests for CaveExplorer
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
            clone: function() { return { x: this.x, y: this.y, z: this.z, clone: this.clone, distanceTo: this.distanceTo, offset: this.offset }; },
            distanceTo: function(other) {
                return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2) + Math.pow(this.z - other.z, 2));
            },
            offset: function(dx, dy, dz) { return { x: this.x + dx, y: this.y + dy, z: this.z + dz, clone: this.clone, distanceTo: this.distanceTo, offset: this.offset }; }
        };
    };
});

// Mock EventBus
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const CaveExplorer = require('../../src/caveExplorer');
const { DangerLevel, ResourceType } = require('../../src/caveExplorer');

describe('CaveExplorer', () => {
    let caveExplorer;
    let mockBot;
    let mockPathfinder;
    let mockNotifier;
    let mockInventory;
    let mockSafety;

    beforeEach(() => {
        mockBot = {
            entity: {
                position: { x: 0, y: 64, z: 0, clone: () => ({ x: 0, y: 64, z: 0 }), distanceTo: jest.fn() }
            },
            blockAt: jest.fn(),
            findBlocks: jest.fn().mockReturnValue([]),
            inventory: {
                items: jest.fn().mockReturnValue([])
            },
            equip: jest.fn(),
            placeBlock: jest.fn(),
            openContainer: jest.fn()
        };

        mockPathfinder = {
            goto: jest.fn().mockResolvedValue(undefined)
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        mockInventory = {
            findItem: jest.fn()
        };

        mockSafety = {
            isSafe: jest.fn().mockReturnValue(true)
        };

        caveExplorer = new CaveExplorer(mockBot, mockPathfinder, mockNotifier, mockInventory, mockSafety);
    });

    describe('initialization', () => {
        it('should initialize with empty data structures', () => {
            expect(caveExplorer.cavePoints.size).toBe(0);
            expect(caveExplorer.dangerZones.size).toBe(0);
            expect(caveExplorer.dungeons.length).toBe(0);
            expect(caveExplorer.isExploring).toBe(false);
        });

        it('should have correct dangerous block definitions', () => {
            expect(caveExplorer.DANGEROUS_BLOCKS).toContain('lava');
            expect(caveExplorer.DANGEROUS_BLOCKS).toContain('flowing_lava');
            expect(caveExplorer.DANGEROUS_BLOCKS).toContain('fire');
        });
    });

    describe('home position', () => {
        it('should set home position', () => {
            const position = { x: 100, y: 64, z: 100, clone: () => ({ x: 100, y: 64, z: 100 }) };
            caveExplorer.setHomePosition(position);

            expect(caveExplorer.homePosition).toEqual({ x: 100, y: 64, z: 100 });
        });
    });

    describe('danger zone management', () => {
        it('should mark danger zone', () => {
            const position = { x: 10, y: 30, z: 10 };
            caveExplorer.markDangerZone(position, 'lava', DangerLevel.CRITICAL);

            expect(caveExplorer.dangerZones.size).toBe(1);
            expect(caveExplorer.stats.dangerousAreasMarked).toBe(1);
        });

        it('should get correct danger severity', () => {
            expect(caveExplorer.getDangerSeverity('lava')).toBe(DangerLevel.CRITICAL);
            expect(caveExplorer.getDangerSeverity('fire')).toBe(DangerLevel.HIGH);
            expect(caveExplorer.getDangerSeverity('cactus')).toBe(DangerLevel.LOW);
        });

        it('should calculate area danger level', () => {
            const dangerPos = { x: 10, y: 30, z: 10 };
            caveExplorer.markDangerZone(dangerPos, 'lava', DangerLevel.CRITICAL);

            // Near the danger zone
            const nearPos = { x: 12, y: 30, z: 12, clone: () => ({ x: 12, y: 30, z: 12 }) };
            const dangerLevel = caveExplorer.getAreaDangerLevel(nearPos);

            expect(dangerLevel).toBe(DangerLevel.CRITICAL);
        });

        it('should limit danger zones to max size', () => {
            // Add more than MAX_DANGER_ZONES
            for (let i = 0; i < 150; i++) {
                caveExplorer.markDangerZone({ x: i, y: 30, z: i }, 'lava', DangerLevel.HIGH);
            }

            expect(caveExplorer.dangerZones.size).toBeLessThanOrEqual(100);
        });
    });

    describe('resource hotspots', () => {
        it('should add resource hotspot', () => {
            const position = { x: 50, y: 11, z: 50 };
            caveExplorer.addResourceHotspot(ResourceType.DIAMOND, position);

            expect(caveExplorer.resourceHotspots.has(ResourceType.DIAMOND)).toBe(true);
            expect(caveExplorer.resourceHotspots.get(ResourceType.DIAMOND).length).toBe(1);
        });

        it('should not add duplicate hotspots', () => {
            const position = { x: 50, y: 11, z: 50 };
            caveExplorer.addResourceHotspot(ResourceType.DIAMOND, position);
            caveExplorer.addResourceHotspot(ResourceType.DIAMOND, position);

            expect(caveExplorer.resourceHotspots.get(ResourceType.DIAMOND).length).toBe(1);
        });

        it('should get nearest hotspot', () => {
            caveExplorer.addResourceHotspot(ResourceType.IRON, { x: 100, y: 30, z: 100 });
            caveExplorer.addResourceHotspot(ResourceType.IRON, { x: 20, y: 30, z: 20 });

            mockBot.entity.position = { x: 0, y: 64, z: 0 };

            const nearest = caveExplorer.getNearestHotspot(ResourceType.IRON);

            expect(nearest).toBeDefined();
            expect(nearest.position.x).toBe(20);
        });
    });

    describe('dungeon management', () => {
        it('should add dungeon', () => {
            const position = { x: 100, y: 20, z: 100 };
            caveExplorer.addDungeon(position);

            expect(caveExplorer.dungeons.length).toBe(1);
            expect(caveExplorer.stats.dungeonsFound).toBe(1);
        });

        it('should not add duplicate dungeons', () => {
            const position = { x: 100, y: 20, z: 100 };
            caveExplorer.addDungeon(position);
            caveExplorer.addDungeon(position);

            expect(caveExplorer.dungeons.length).toBe(1);
        });

        it('should get all dungeons', () => {
            caveExplorer.addDungeon({ x: 100, y: 20, z: 100 });
            caveExplorer.addDungeon({ x: 200, y: 20, z: 200 });

            const dungeons = caveExplorer.getDungeons();

            expect(dungeons.length).toBe(2);
        });
    });

    describe('exploration marking', () => {
        it('should mark area as explored', () => {
            const position = { x: 100, y: 30, z: 100 };
            caveExplorer.markExplored(position);

            expect(caveExplorer.cavePoints.size).toBe(1);
        });

        it('should check if explored', () => {
            const position = { x: 100, y: 30, z: 100 };
            caveExplorer.markExplored(position);

            expect(caveExplorer.isExplored(position)).toBe(true);
            expect(caveExplorer.isExplored({ x: 1000, y: 30, z: 1000 })).toBe(false);
        });
    });

    describe('mining routes', () => {
        it('should generate mining routes', () => {
            caveExplorer.addResourceHotspot(ResourceType.DIAMOND, { x: 50, y: 11, z: 50 });
            caveExplorer.addResourceHotspot(ResourceType.DIAMOND, { x: 100, y: 11, z: 100 });

            const routes = caveExplorer.generateMiningRoutes(ResourceType.DIAMOND, 5);

            expect(routes.length).toBe(2);
            expect(routes[0].resourceType).toBe(ResourceType.DIAMOND);
        });

        it('should calculate route profitability', () => {
            const profitability = caveExplorer.calculateRouteProfitability(
                ResourceType.DIAMOND,
                50, // distance
                DangerLevel.SAFE // danger
            );

            expect(profitability).toBeGreaterThan(0);
        });

        it('should return empty for unknown resource', () => {
            const routes = caveExplorer.generateMiningRoutes('unknown_resource', 5);
            expect(routes.length).toBe(0);
        });
    });

    describe('unexplored chunks', () => {
        it('should find unexplored chunks', () => {
            const unexplored = caveExplorer.findUnexploredChunks(3);

            // Should find chunks in 3 chunk radius (7x7 = 49 chunks, minus center)
            expect(unexplored.length).toBeGreaterThan(0);
        });

        it('should sort by distance', () => {
            const unexplored = caveExplorer.findUnexploredChunks(5);

            // First should be closer than last
            expect(unexplored[0].distance).toBeLessThanOrEqual(unexplored[unexplored.length - 1].distance);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            caveExplorer.addDungeon({ x: 100, y: 20, z: 100 });
            caveExplorer.markDangerZone({ x: 10, y: 30, z: 10 }, 'lava', DangerLevel.CRITICAL);
            caveExplorer.addResourceHotspot(ResourceType.IRON, { x: 50, y: 30, z: 50 });

            const stats = caveExplorer.getStats();

            expect(stats.dungeonsDiscovered).toBe(1);
            expect(stats.dangerZonesMarked).toBe(1);
            expect(stats.resourceHotspots[ResourceType.IRON]).toBe(1);
        });
    });

    describe('cleanup', () => {
        it('should clean old data', () => {
            // Add some data with old timestamps
            caveExplorer.cavePoints.set('old_point', {
                explored: true,
                timestamp: Date.now() - 7200000 // 2 hours ago
            });

            caveExplorer.dangerZones.set('old_zone', {
                type: 'lava',
                timestamp: Date.now() - 7200000
            });

            caveExplorer.cleanup();

            expect(caveExplorer.cavePoints.size).toBe(0);
            expect(caveExplorer.dangerZones.size).toBe(0);
        });
    });

    describe('path danger check', () => {
        it('should detect dangerous path', () => {
            const from = { x: 0, y: 64, z: 0, distanceTo: (other) => Math.sqrt(Math.pow(0 - other.x, 2) + Math.pow(64 - other.y, 2) + Math.pow(0 - other.z, 2)) };
            const to = { x: 20, y: 64, z: 20 };

            // Mark a danger zone along the path
            caveExplorer.markDangerZone({ x: 10, y: 64, z: 10 }, 'lava', DangerLevel.HIGH);

            const isDangerous = caveExplorer.isPathDangerous(from, to);

            expect(isDangerous).toBe(true);
        });

        it('should allow safe path', () => {
            const from = { x: 0, y: 64, z: 0, distanceTo: (other) => Math.sqrt(Math.pow(0 - other.x, 2) + Math.pow(64 - other.y, 2) + Math.pow(0 - other.z, 2)) };
            const to = { x: 20, y: 64, z: 20 };

            const isDangerous = caveExplorer.isPathDangerous(from, to);

            expect(isDangerous).toBe(false);
        });
    });
});
