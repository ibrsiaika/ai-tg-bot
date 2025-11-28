/**
 * Tests for Potion Brewing System
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const PotionBrewingSystem = require('../../src/potionBrewing');
const { PotionType, MissionPotionPriority, PotionRecipes } = require('../../src/potionBrewing');

describe('PotionBrewingSystem', () => {
    let potionSystem;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: { position: { x: 0, y: 64, z: 0 } },
            inventory: {
                items: jest.fn().mockReturnValue([])
            },
            findBlocks: jest.fn().mockReturnValue([])
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.POTION_BREWING_ENABLED = 'true';
        potionSystem = new PotionBrewingSystem(mockBot, null, mockNotifier, null);
    });

    afterEach(() => {
        potionSystem.cleanup();
        delete process.env.POTION_BREWING_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(potionSystem.enabled).toBe(true);
            expect(potionSystem.brewingQueue).toEqual([]);
            expect(potionSystem.isBrewing).toBe(false);
        });

        it('should have potion types defined', () => {
            expect(PotionType.HEALING).toBe('healing');
            expect(PotionType.FIRE_RESISTANCE).toBe('fire_resistance');
            expect(PotionType.STRENGTH).toBe('strength');
        });
    });

    describe('potion recipes', () => {
        it('should have recipes for all potion types', () => {
            expect(PotionRecipes[PotionType.HEALING]).toBeDefined();
            expect(PotionRecipes[PotionType.REGENERATION]).toBeDefined();
            expect(PotionRecipes[PotionType.FIRE_RESISTANCE]).toBeDefined();
        });

        it('should have correct recipe structure', () => {
            const healingRecipe = PotionRecipes[PotionType.HEALING];
            expect(healingRecipe.base).toBe('awkward_potion');
            expect(healingRecipe.ingredient).toBe('glistering_melon_slice');
            expect(healingRecipe.instant).toBe(true);
        });
    });

    describe('mission potion priorities', () => {
        it('should have priorities for nether missions', () => {
            expect(MissionPotionPriority.nether).toContain(PotionType.FIRE_RESISTANCE);
        });

        it('should have priorities for combat missions', () => {
            expect(MissionPotionPriority.combat).toContain(PotionType.STRENGTH);
            expect(MissionPotionPriority.combat).toContain(PotionType.HEALING);
        });

        it('should have priorities for end missions', () => {
            expect(MissionPotionPriority.end).toContain(PotionType.SLOW_FALLING);
        });
    });

    describe('ingredient checking', () => {
        it('should return missing ingredients when unavailable', () => {
            const result = potionSystem.checkIngredients(PotionType.HEALING);
            expect(result.available).toBe(false);
            expect(result.missing.length).toBeGreaterThan(0);
        });
    });

    describe('potion inventory', () => {
        it('should return empty inventory initially', () => {
            const inventory = potionSystem.getPotionInventory();
            expect(inventory.total).toBe(0);
            expect(inventory.activeBuffs).toEqual({});
        });
    });

    describe('queue operations', () => {
        it('should get queue status', () => {
            const status = potionSystem.getQueueStatus();
            expect(status.queue).toEqual([]);
            expect(status.isBrewing).toBe(false);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            const stats = potionSystem.getStats();
            expect(stats.potionsBrewed).toBe(0);
            expect(stats.enabled).toBe(true);
        });
    });

    describe('buff recommendations', () => {
        it('should recommend healing for low health', () => {
            potionSystem.potionCounts[PotionType.HEALING] = 3;
            const recommendations = potionSystem.getRecommendedPotions('low_health');
            expect(recommendations).toContain(PotionType.HEALING);
        });

        it('should recommend fire resistance near lava', () => {
            potionSystem.potionCounts[PotionType.FIRE_RESISTANCE] = 3;
            const recommendations = potionSystem.getRecommendedPotions('near_lava');
            expect(recommendations).toContain(PotionType.FIRE_RESISTANCE);
        });
    });
});
