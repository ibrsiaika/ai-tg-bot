/**
 * Tests for Advanced Trading System
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const AdvancedTradingSystem = require('../../src/advancedTrading');
const { VillagerProfession, BasePrices, MarketState } = require('../../src/advancedTrading');

describe('AdvancedTradingSystem', () => {
    let trading;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: { position: { x: 0, y: 64, z: 0 } },
            entities: {},
            inventory: {
                items: jest.fn().mockReturnValue([])
            }
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.TRADING_SYSTEM_ENABLED = 'true';
        trading = new AdvancedTradingSystem(mockBot, null, mockNotifier, null);
    });

    afterEach(() => {
        trading.cleanup();
        delete process.env.TRADING_SYSTEM_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(trading.enabled).toBe(true);
            expect(trading.emeraldBalance).toBe(0);
            expect(trading.knownVillagers.size).toBe(0);
        });
    });

    describe('villager professions', () => {
        it('should have all professions defined', () => {
            expect(VillagerProfession.FARMER).toBe('farmer');
            expect(VillagerProfession.LIBRARIAN).toBe('librarian');
            expect(VillagerProfession.WEAPONSMITH).toBe('weaponsmith');
        });
    });

    describe('base prices', () => {
        it('should have prices for common items', () => {
            expect(BasePrices.diamond).toBe(1.0);
            expect(BasePrices.emerald).toBe(1.0);
            expect(BasePrices.wheat).toBe(0.05);
        });
    });

    describe('MarketState', () => {
        let market;

        beforeEach(() => {
            market = new MarketState();
        });

        it('should update supply', () => {
            market.updateSupply('diamond', 10);
            expect(market.supply.diamond).toBe(10);
        });

        it('should update demand', () => {
            market.updateDemand('diamond', 20);
            expect(market.demand.diamond).toBe(20);
        });

        it('should calculate price based on supply/demand', () => {
            market.updateSupply('diamond', 10);
            market.updateDemand('diamond', 20);
            
            const price = market.getPrice('diamond');
            expect(price).toBeGreaterThan(BasePrices.diamond);
        });

        it('should track trends', () => {
            market.updateSupply('diamond', 10);
            market.updateDemand('diamond', 20);
            
            expect(market.trends.diamond).toBe('rising');
        });
    });

    describe('villager discovery', () => {
        it('should analyze villager data', async () => {
            const villager = {
                id: 123,
                position: { x: 100, y: 64, z: 100, clone: () => ({ x: 100, y: 64, z: 100 }) }
            };

            const data = await trading.analyzeVillager(villager);
            expect(data.id).toBe(123);
            expect(trading.stats.villagersDiscovered).toBe(1);
        });
    });

    describe('trade offers', () => {
        it('should create trade offer', () => {
            const offerId = trading.createTradeOffer({
                offerItem: 'diamond',
                offerCount: 5,
                requestItem: 'emerald',
                requestCount: 10
            });

            expect(offerId).toBeDefined();
            expect(trading.tradeOffers.size).toBe(1);
        });

        it('should get open offers', () => {
            trading.createTradeOffer({
                offerItem: 'diamond',
                offerCount: 5,
                requestItem: 'emerald',
                requestCount: 10
            });

            const offers = trading.getOpenOffers();
            expect(offers.length).toBe(1);
            expect(offers[0].status).toBe('open');
        });
    });

    describe('trade value calculation', () => {
        it('should calculate trade value', () => {
            const trade = {
                inputItem: 'wheat',
                inputCount: 20,
                outputItem: 'emerald',
                outputCount: 1
            };

            const value = trading.calculateTradeValue(trade);
            expect(value).toBeGreaterThan(0);
        });
    });

    describe('price trends', () => {
        it('should get price trend', () => {
            trading.market.updateSupply('diamond', 10);
            trading.market.updateDemand('diamond', 20);

            const trend = trading.getPriceTrend('diamond');
            expect(trend).toBe('rising');
        });
    });

    describe('recommendations', () => {
        it('should provide trade recommendations', () => {
            trading.market.updateSupply('diamond', 10);
            trading.market.updateDemand('diamond', 20);

            mockBot.inventory.items.mockReturnValue([
                { name: 'diamond', count: 10 }
            ]);

            const recommendations = trading.getRecommendations();
            expect(recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('market summary', () => {
        it('should return market summary', () => {
            const summary = trading.getMarketSummary();
            expect(summary.prices).toBeDefined();
            expect(summary.trends).toBeDefined();
        });
    });

    describe('villager summary', () => {
        it('should return villager summary', () => {
            const summary = trading.getVillagerSummary();
            expect(summary.total).toBe(0);
            expect(summary.byProfession).toBeDefined();
        });
    });

    describe('profit calculation', () => {
        it('should calculate profit', () => {
            trading.stats.emeraldEarned = 100;
            trading.stats.emeraldSpent = 50;

            const profit = trading.calculateProfit();
            expect(profit).toBe(50);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            const stats = trading.getStats();
            expect(stats.enabled).toBe(true);
            expect(stats.totalTrades).toBe(0);
            expect(stats.emeraldBalance).toBe(0);
        });
    });

    describe('inventory checking', () => {
        it('should check inventory for items', () => {
            mockBot.inventory.items.mockReturnValue([
                { name: 'diamond', count: 10 }
            ]);

            const hasItems = trading.checkInventory('diamond', 5);
            expect(hasItems).toBe(true);
        });

        it('should return false for insufficient items', () => {
            mockBot.inventory.items.mockReturnValue([
                { name: 'diamond', count: 2 }
            ]);

            const hasItems = trading.checkInventory('diamond', 5);
            expect(hasItems).toBe(false);
        });
    });
});
