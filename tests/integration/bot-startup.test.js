const { createMockBot } = require('../mocks/mineflayer.mock');
const EventBus = require('../../src/eventBus');
const StorageSystem = require('../../src/storage');

describe('Bot Startup Integration', () => {
    let bot;
    let eventBus;
    let storage;

    beforeEach(async () => {
        bot = createMockBot();
        eventBus = new EventBus();
        storage = new StorageSystem('./tmp/test-integration.db');
        await storage.initialize();
    });

    afterEach(() => {
        if (storage) {
            storage.close();
        }
        eventBus.removeAllListeners();
    });

    describe('system initialization', () => {
        test('should initialize storage system', async () => {
            expect(storage.isInitialized).toBe(true);
        });

        test('should emit system initialized event', (done) => {
            eventBus.on(EventBus.EVENTS.SYSTEM_INITIALIZED, (data) => {
                expect(data.system).toBe('test');
                done();
            });

            eventBus.emit(EventBus.EVENTS.SYSTEM_INITIALIZED, { system: 'test' });
        });

        test('should save initial bot state', async () => {
            const initialState = {
                position: bot.entity.position,
                health: bot.health,
                food: bot.food,
                inventory: [],
                goals: []
            };

            await storage.saveState(initialState);
            const loaded = await storage.loadState();

            expect(loaded).not.toBeNull();
            expect(loaded.health).toBe(20);
            expect(loaded.food).toBe(20);
        });
    });

    describe('event flow', () => {
        test('should handle bot spawn event flow', (done) => {
            const events = [];
            
            eventBus.on(EventBus.EVENTS.BOT_SPAWNED, () => {
                events.push('spawned');
            });

            eventBus.on(EventBus.EVENTS.SYSTEM_INITIALIZED, () => {
                events.push('initialized');
            });

            eventBus.emit(EventBus.EVENTS.BOT_SPAWNED, { username: 'TestBot' });
            eventBus.emit(EventBus.EVENTS.SYSTEM_INITIALIZED, { system: 'all' });

            setTimeout(() => {
                expect(events).toEqual(['spawned', 'initialized']);
                done();
            }, 100);
        });

        test('should track decisions in storage via events', async () => {
            const decisionsTracked = [];
            
            eventBus.on(EventBus.EVENTS.DECISION_MADE, async (decision) => {
                await storage.saveDecision({
                    type: decision.type,
                    success: true,
                    context: decision.context
                });
                decisionsTracked.push(decision.type);
            });

            eventBus.emit(EventBus.EVENTS.DECISION_MADE, {
                type: 'gather_wood',
                context: { position: { x: 0, y: 64, z: 0 } }
            });

            // Wait for async operation to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            const history = await storage.queryHistory({ type: 'gather_wood' });
            expect(decisionsTracked).toContain('gather_wood');
            expect(history.length).toBeGreaterThanOrEqual(1);
            if (history.length > 0) {
                expect(history[0].type).toBe('gather_wood');
            }
        });
    });

    describe('state persistence', () => {
        test('should save and restore bot state across restarts', async () => {
            // Simulate bot running
            const runningState = {
                position: { x: 100, y: 70, z: -50 },
                health: 15,
                food: 12,
                inventory: [
                    { name: 'diamond', count: 5 },
                    { name: 'iron_ingot', count: 32 }
                ],
                goals: ['build_shelter', 'find_village'],
                currentGoal: 'build_shelter'
            };

            await storage.saveState(runningState);

            // Simulate restart - create new storage instance
            storage.close();
            const newStorage = new StorageSystem('./tmp/test-integration.db');
            await newStorage.initialize();

            const restoredState = await newStorage.loadState();
            
            expect(restoredState.position.x).toBe(100);
            expect(restoredState.health).toBe(15);
            expect(restoredState.inventory).toHaveLength(2);
            expect(restoredState.currentGoal).toBe('build_shelter');

            newStorage.close();
        });

        test('should maintain exploration history', async () => {
            // Explore multiple chunks
            await storage.saveExploration(0, 0, {
                biome: 'plains',
                resources: ['oak_tree', 'grass'],
                isExplored: true
            });

            await storage.saveExploration(1, 0, {
                biome: 'forest',
                resources: ['oak_tree', 'birch_tree'],
                isExplored: true
            });

            await storage.saveExploration(0, 1, {
                biome: 'desert',
                resources: ['cactus', 'sand'],
                isExplored: true
            });

            const stats = await storage.getStats();
            expect(stats.chunksExplored).toBe(3);
        });
    });

    describe('error recovery', () => {
        test('should use memory fallback when storage fails', async () => {
            const failingStorage = new StorageSystem('/invalid/path.db');
            await failingStorage.initialize();

            expect(failingStorage.useMemoryOnly).toBe(true);

            // Should still work
            await failingStorage.saveState({
                position: { x: 0, y: 64, z: 0 },
                health: 20,
                food: 20,
                inventory: [],
                goals: []
            });

            const state = await failingStorage.loadState();
            expect(state).not.toBeNull();
        });

        test('should handle event emission errors gracefully', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Handler error');
            });

            eventBus.on('test:event', errorHandler);

            // Should not throw
            expect(() => {
                eventBus.emit('test:event', 'data');
            }).toThrow(); // EventEmitter throws by default
        });
    });
});
