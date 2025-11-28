/**
 * Tests for Dimension Conquest System
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const DimensionConquestSystem = require('../../src/dimensionConquest');
const { DimensionType, DragonCombatState, NetherStructure, EndStructure } = require('../../src/dimensionConquest');

describe('DimensionConquestSystem', () => {
    let conquest;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: { 
                position: { 
                    x: 0, y: 64, z: 0,
                    offset: (dx, dy, dz) => ({ x: dx, y: 64 + dy, z: dz })
                } 
            },
            entities: {},
            blockAt: jest.fn().mockReturnValue({ name: 'stone' }),
            findBlocks: jest.fn().mockReturnValue([])
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.DIMENSION_CONQUEST_ENABLED = 'true';
        conquest = new DimensionConquestSystem(mockBot, null, mockNotifier, null, null);
    });

    afterEach(() => {
        conquest.cleanup();
        delete process.env.DIMENSION_CONQUEST_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(conquest.enabled).toBe(true);
            expect(conquest.currentDimension).toBe(DimensionType.OVERWORLD);
            expect(conquest.dragonDefeated).toBe(false);
        });
    });

    describe('dimension types', () => {
        it('should have all dimension types defined', () => {
            expect(DimensionType.OVERWORLD).toBe('overworld');
            expect(DimensionType.NETHER).toBe('nether');
            expect(DimensionType.END).toBe('end');
        });
    });

    describe('structure types', () => {
        it('should have nether structures defined', () => {
            expect(NetherStructure.FORTRESS).toBe('fortress');
            expect(NetherStructure.BASTION).toBe('bastion');
        });

        it('should have end structures defined', () => {
            expect(EndStructure.END_CITY).toBe('end_city');
            expect(EndStructure.END_SHIP).toBe('end_ship');
        });
    });

    describe('dragon combat states', () => {
        it('should have all combat states defined', () => {
            expect(DragonCombatState.PREPARING).toBe('preparing');
            expect(DragonCombatState.DESTROYING_CRYSTALS).toBe('destroying_crystals');
            expect(DragonCombatState.FIGHTING_DRAGON).toBe('fighting_dragon');
            expect(DragonCombatState.COMPLETED).toBe('completed');
        });
    });

    describe('coordinate conversion', () => {
        it('should convert overworld to nether coordinates', () => {
            const nether = conquest.overworldToNether({ x: 800, y: 64, z: 800 });
            expect(nether.x).toBe(100);
            expect(nether.z).toBe(100);
        });

        it('should convert nether to overworld coordinates', () => {
            const overworld = conquest.netherToOverworld({ x: 100, y: 64, z: 100 });
            expect(overworld.x).toBe(800);
            expect(overworld.z).toBe(800);
        });
    });

    describe('fortress tracking', () => {
        it('should add fortress location', () => {
            conquest.addFortress({ x: 100, y: 64, z: 100 });
            expect(conquest.fortressLocations.length).toBe(1);
            expect(conquest.stats.fortressesFound).toBe(1);
        });

        it('should not duplicate nearby fortresses', () => {
            conquest.addFortress({ x: 100, y: 64, z: 100 });
            conquest.addFortress({ x: 150, y: 64, z: 150 }); // Within 100 block radius (~71 distance)
            expect(conquest.fortressLocations.length).toBe(1);
        });
    });

    describe('bastion tracking', () => {
        it('should add bastion location', () => {
            conquest.addBastion({ x: 200, y: 64, z: 200 });
            expect(conquest.bastionLocations.length).toBe(1);
            expect(conquest.stats.bastionsFound).toBe(1);
        });
    });

    describe('end city tracking', () => {
        it('should add end city location', () => {
            conquest.addEndCity({ x: 300, y: 64, z: 300 });
            expect(conquest.endCities.length).toBe(1);
            expect(conquest.stats.endCitiesFound).toBe(1);
        });
    });

    describe('resource collection', () => {
        it('should track blaze rod collection', () => {
            conquest.collectBlazeRod();
            expect(conquest.stats.blazeRodsCollected).toBe(1);
        });

        it('should track ender pearl collection', () => {
            conquest.collectEnderPearl();
            expect(conquest.stats.enderPearlsCollected).toBe(1);
        });
    });

    describe('ancient debris mining', () => {
        it('should require nether dimension', async () => {
            conquest.currentDimension = DimensionType.OVERWORLD;
            const result = await conquest.mineAncientDebris();
            expect(result.success).toBe(false);
            expect(result.reason).toBe('wrong_dimension');
        });
    });

    describe('dragon fight', () => {
        it('should require end dimension', async () => {
            conquest.currentDimension = DimensionType.OVERWORLD;
            const result = await conquest.startDragonFight();
            expect(result.success).toBe(false);
            expect(result.reason).toBe('wrong_dimension');
        });
    });

    describe('portal linking', () => {
        it('should link portals', () => {
            conquest.linkPortals(
                { x: 800, y: 64, z: 800 },
                { x: 100, y: 64, z: 100 }
            );
            expect(conquest.portalLinks.size).toBe(1);
        });
    });

    describe('dimension status', () => {
        it('should return dimension status', () => {
            conquest.addFortress({ x: 100, y: 64, z: 100 });
            conquest.addEndCity({ x: 300, y: 64, z: 300 });

            const status = conquest.getDimensionStatus();
            expect(status.currentDimension).toBe(DimensionType.OVERWORLD);
            expect(status.nether.fortresses).toBe(1);
            expect(status.end.endCities).toBe(1);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            conquest.collectBlazeRod();
            conquest.collectEnderPearl();

            const stats = conquest.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.blazeRodsCollected).toBe(1);
            expect(stats.enderPearlsCollected).toBe(1);
        });
    });

    describe('utility methods', () => {
        it('should calculate center of positions', () => {
            const positions = [
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 10, z: 10 }
            ];

            const center = conquest.calculateCenter(positions);
            expect(center.x).toBe(5);
            expect(center.y).toBe(5);
            expect(center.z).toBe(5);
        });

        it('should calculate distance', () => {
            const dist = conquest.distance(
                { x: 0, y: 0, z: 0 },
                { x: 3, y: 4, z: 0 }
            );
            expect(dist).toBe(5);
        });
    });
});
