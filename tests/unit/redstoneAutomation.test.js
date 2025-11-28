/**
 * Tests for Redstone Automation System
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const RedstoneAutomationSystem = require('../../src/redstoneAutomation');
const { ComponentType, AutomationType, ClockType, FarmBlueprints } = require('../../src/redstoneAutomation');

describe('RedstoneAutomationSystem', () => {
    let redstone;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: { position: { x: 0, y: 64, z: 0 } },
            inventory: {
                items: jest.fn().mockReturnValue([])
            }
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.REDSTONE_AUTOMATION_ENABLED = 'true';
        redstone = new RedstoneAutomationSystem(mockBot, null, mockNotifier, null, null);
    });

    afterEach(() => {
        redstone.cleanup();
        delete process.env.REDSTONE_AUTOMATION_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(redstone.enabled).toBe(true);
            expect(redstone.automations.size).toBe(0);
            expect(redstone.isBuilding).toBe(false);
        });

        it('should load built-in designs', () => {
            expect(redstone.customDesigns.size).toBeGreaterThan(0);
        });
    });

    describe('component types', () => {
        it('should have all component types defined', () => {
            expect(ComponentType.DUST).toBe('redstone');
            expect(ComponentType.TORCH).toBe('redstone_torch');
            expect(ComponentType.REPEATER).toBe('repeater');
            expect(ComponentType.COMPARATOR).toBe('comparator');
            expect(ComponentType.PISTON).toBe('piston');
            expect(ComponentType.HOPPER).toBe('hopper');
        });
    });

    describe('automation types', () => {
        it('should have all automation types defined', () => {
            expect(AutomationType.CLOCK).toBe('clock');
            expect(AutomationType.FARM).toBe('farm');
            expect(AutomationType.ITEM_SORTER).toBe('item_sorter');
            expect(AutomationType.FLYING_MACHINE).toBe('flying_machine');
            expect(AutomationType.TNT_CANNON).toBe('tnt_cannon');
        });
    });

    describe('clock types', () => {
        it('should have all clock types defined', () => {
            expect(ClockType.TORCH).toBe('torch_clock');
            expect(ClockType.REPEATER).toBe('repeater_clock');
            expect(ClockType.OBSERVER).toBe('observer_clock');
        });
    });

    describe('farm blueprints', () => {
        it('should have farm blueprints defined', () => {
            expect(FarmBlueprints.wheat_farm).toBeDefined();
            expect(FarmBlueprints.sugarcane_farm).toBeDefined();
            expect(FarmBlueprints.pumpkin_farm).toBeDefined();
        });

        it('should have correct farm structure', () => {
            const wheatFarm = FarmBlueprints.wheat_farm;
            expect(wheatFarm.name).toBe('Automatic Wheat Farm');
            expect(wheatFarm.size).toBeDefined();
            expect(wheatFarm.components.length).toBeGreaterThan(0);
            expect(wheatFarm.efficiency).toBeGreaterThan(0);
        });
    });

    describe('clock period calculation', () => {
        it('should calculate clock period', () => {
            const delays = [4, 4, 4, 4];
            const period = redstone.calculateClockPeriod(delays);
            expect(period).toBe(32); // (4+4+4+4) * 2
        });
    });

    describe('flying machine design', () => {
        it('should design flying machine', () => {
            const components = redstone.designFlyingMachine('north');
            expect(components.length).toBeGreaterThan(0);
            expect(components.some(c => c.type === ComponentType.STICKY_PISTON)).toBe(true);
            expect(components.some(c => c.type === ComponentType.OBSERVER)).toBe(true);
        });

        it('should add passenger block when requested', () => {
            const components = redstone.designFlyingMachine('north', { withPassenger: true });
            expect(components.some(c => c.type === 'honey_block')).toBe(true);
        });
    });

    describe('direction handling', () => {
        it('should get opposite direction', () => {
            expect(redstone.oppositeDirection('north')).toBe('south');
            expect(redstone.oppositeDirection('east')).toBe('west');
            expect(redstone.oppositeDirection('up')).toBe('down');
        });
    });

    describe('piston door design', () => {
        it('should design 2x2 piston door', () => {
            const components = redstone.designPistonDoor('2x2');
            expect(components.length).toBeGreaterThan(0);
            expect(components.some(c => c.type === ComponentType.STICKY_PISTON)).toBe(true);
        });
    });

    describe('TNT cannon design', () => {
        it('should design TNT cannon', () => {
            const components = redstone.designTNTCannon('north', 'medium', false);
            expect(components.length).toBeGreaterThan(0);
            expect(components.some(c => c.type === ComponentType.DISPENSER)).toBe(true);
        });

        it('should add auto-reload when requested', () => {
            const components = redstone.designTNTCannon('north', 'medium', true);
            expect(components.some(c => c.type === 'chest')).toBe(true);
        });
    });

    describe('material calculation', () => {
        it('should calculate sorter materials', () => {
            const materials = redstone.calculateSorterMaterials(5);
            expect(materials.hopper).toBe(10);
            expect(materials.chest).toBe(5);
            expect(materials.comparator).toBe(5);
        });

        it('should calculate farm materials', () => {
            const materials = redstone.calculateFarmMaterials(FarmBlueprints.wheat_farm);
            expect(Object.keys(materials).length).toBeGreaterThan(0);
        });
    });

    describe('automation status', () => {
        it('should return automation status', () => {
            const status = redstone.getAutomationStatus();
            expect(status.total).toBe(0);
            expect(status.byType).toBeDefined();
            expect(status.flyingMachines).toBe(0);
        });
    });

    describe('available designs', () => {
        it('should return available designs', () => {
            const designs = redstone.getAvailableDesigns();
            expect(designs.circuits.length).toBeGreaterThan(0);
            expect(designs.farms.length).toBeGreaterThan(0);
            expect(designs.clocks.length).toBeGreaterThan(0);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            const stats = redstone.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.automationsBuilt).toBe(0);
            expect(stats.farmsActive).toBe(0);
        });
    });

    describe('material checking', () => {
        it('should check if materials are available', async () => {
            mockBot.inventory.items.mockReturnValue([
                { name: 'redstone', count: 100 },
                { name: 'hopper', count: 50 }
            ]);

            const available = await redstone.checkMaterials({
                redstone: 10,
                hopper: 5
            });

            expect(available).toBe(true);
        });

        it('should return false for insufficient materials', async () => {
            mockBot.inventory.items.mockReturnValue([
                { name: 'redstone', count: 5 }
            ]);

            const available = await redstone.checkMaterials({
                redstone: 10
            });

            expect(available).toBe(false);
        });
    });
});
