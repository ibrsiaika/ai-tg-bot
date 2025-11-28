/**
 * Tests for Enchantment Optimizer System
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const EnchantmentOptimizer = require('../../src/enchantmentOptimizer');
const { EnchantmentCategory, EnchantmentData, ItemCategoryMap } = require('../../src/enchantmentOptimizer');

describe('EnchantmentOptimizer', () => {
    let optimizer;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: { position: { x: 0, y: 64, z: 0 } },
            inventory: {
                items: jest.fn().mockReturnValue([])
            },
            experience: { level: 30 },
            findBlock: jest.fn().mockReturnValue(null)
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.ENCHANTMENT_OPTIMIZER_ENABLED = 'true';
        optimizer = new EnchantmentOptimizer(mockBot, null, mockNotifier, null);
    });

    afterEach(() => {
        optimizer.cleanup();
        delete process.env.ENCHANTMENT_OPTIMIZER_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(optimizer.enabled).toBe(true);
            expect(optimizer.enchantingTable).toBeNull();
            expect(optimizer.anvilLocation).toBeNull();
        });
    });

    describe('enchantment categories', () => {
        it('should have all categories defined', () => {
            expect(EnchantmentCategory.TOOL).toBe('tool');
            expect(EnchantmentCategory.WEAPON).toBe('weapon');
            expect(EnchantmentCategory.ARMOR).toBe('armor');
            expect(EnchantmentCategory.UNIVERSAL).toBe('universal');
        });
    });

    describe('enchantment data', () => {
        it('should have data for common enchantments', () => {
            expect(EnchantmentData.unbreaking).toBeDefined();
            expect(EnchantmentData.unbreaking.maxLevel).toBe(3);
            expect(EnchantmentData.efficiency).toBeDefined();
            expect(EnchantmentData.efficiency.maxLevel).toBe(5);
        });

        it('should have correct priorities', () => {
            expect(EnchantmentData.unbreaking.priority).toBe(100);
            expect(EnchantmentData.mending.priority).toBe(95);
        });
    });

    describe('item category mapping', () => {
        it('should map tools correctly', () => {
            expect(ItemCategoryMap['diamond_pickaxe']).toBe(EnchantmentCategory.TOOL);
            expect(ItemCategoryMap['diamond_sword']).toBe(EnchantmentCategory.WEAPON);
            expect(ItemCategoryMap['diamond_helmet']).toBe(EnchantmentCategory.ARMOR);
        });
    });

    describe('optimal enchantments', () => {
        it('should get optimal enchantments for pickaxe', () => {
            const optimal = optimizer.getOptimalEnchantments('diamond_pickaxe');
            expect(optimal.length).toBeGreaterThan(0);
            expect(optimal.some(e => e.name === 'efficiency')).toBe(true);
            expect(optimal.some(e => e.name === 'unbreaking')).toBe(true);
        });

        it('should get optimal enchantments for sword', () => {
            const optimal = optimizer.getOptimalEnchantments('diamond_sword');
            expect(optimal.some(e => e.name === 'sharpness')).toBe(true);
            expect(optimal.some(e => e.name === 'looting')).toBe(true);
        });

        it('should return empty for unknown items', () => {
            const optimal = optimizer.getOptimalEnchantments('unknown_item');
            expect(optimal).toEqual([]);
        });
    });

    describe('enchantment scoring', () => {
        it('should calculate score for enchanted item', () => {
            const item = {
                name: 'diamond_pickaxe',
                enchants: [
                    { name: 'efficiency', lvl: 5 },
                    { name: 'unbreaking', lvl: 3 }
                ]
            };

            const score = optimizer.calculateEnchantmentScore(item);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should return 0 for unenchanted item', () => {
            const item = {
                name: 'diamond_pickaxe',
                enchants: []
            };

            const score = optimizer.calculateEnchantmentScore(item);
            expect(score).toBe(0);
        });
    });

    describe('enchantment predictions', () => {
        it('should predict enchantments at level 30', () => {
            const prediction = optimizer.predictEnchantments('diamond_pickaxe', 30);
            
            expect(prediction).toBeDefined();
            expect(prediction.xpLevel).toBe(30);
            expect(prediction.predictions.length).toBeGreaterThan(0);
        });
    });

    describe('book tracking', () => {
        it('should track enchantment books', () => {
            optimizer.trackEnchantmentBook({ enchantment: 'mending', level: 1 });
            
            const books = optimizer.findMatchingBooks('mending', 1);
            expect(books.length).toBe(1);
        });
    });

    describe('XP calculations', () => {
        it('should calculate XP needed for level', () => {
            optimizer.currentXPLevel = 20;
            const xpNeeded = optimizer.calculateXPNeeded(30);
            expect(xpNeeded).toBeGreaterThan(0);
        });

        it('should return 0 if already at target level', () => {
            optimizer.currentXPLevel = 30;
            const xpNeeded = optimizer.calculateXPNeeded(30);
            expect(xpNeeded).toBe(0);
        });
    });

    describe('recommendations', () => {
        it('should recommend next enchantment', () => {
            const item = {
                name: 'diamond_pickaxe',
                enchants: [
                    { name: 'efficiency', lvl: 5 }
                ]
            };

            const recommendation = optimizer.getRecommendedEnchantment(item);
            expect(recommendation).toBeDefined();
            expect(recommendation.enchantment).not.toBe('efficiency');
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            const stats = optimizer.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.itemsEnchanted).toBe(0);
        });
    });
});
