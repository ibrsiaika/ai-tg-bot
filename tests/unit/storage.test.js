const StorageSystem = require('../../src/storage');
const fs = require('fs');
const path = require('path');

describe('StorageSystem', () => {
    let storage;
    const testDbPath = './tmp/test-storage.db';

    beforeEach(async () => {
        // Ensure tmp directory exists
        const dir = path.dirname(testDbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        storage = new StorageSystem(testDbPath);
        await storage.initialize();
    });

    afterEach(() => {
        if (storage && storage.db) {
            storage.close();
        }
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialization', () => {
        test('should initialize successfully', async () => {
            expect(storage.isInitialized).toBe(true);
        });

        test('should create tables', async () => {
            const tables = storage.db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table'
            `).all();
            
            const tableNames = tables.map(t => t.name);
            expect(tableNames).toContain('bot_state');
            expect(tableNames).toContain('exploration_data');
            expect(tableNames).toContain('decision_history');
            expect(tableNames).toContain('performance_metrics');
        });
    });

    describe('saveState and loadState', () => {
        test('should save and load bot state', async () => {
            const state = {
                position: { x: 100, y: 64, z: 200 },
                health: 20,
                food: 18,
                inventory: [{ name: 'diamond', count: 3 }],
                goals: ['mine_diamond', 'build_base'],
                currentGoal: 'mine_diamond',
                metadata: { lastAction: 'mining' }
            };

            await storage.saveState(state);
            const loaded = await storage.loadState();

            expect(loaded).not.toBeNull();
            expect(loaded.position.x).toBe(100);
            expect(loaded.position.y).toBe(64);
            expect(loaded.position.z).toBe(200);
            expect(loaded.health).toBe(20);
            expect(loaded.food).toBe(18);
            expect(loaded.inventory).toHaveLength(1);
            expect(loaded.inventory[0].name).toBe('diamond');
            expect(loaded.goals).toContain('mine_diamond');
            expect(loaded.currentGoal).toBe('mine_diamond');
        });

        test('should return null when no state exists', async () => {
            const loaded = await storage.loadState();
            expect(loaded).toBeNull();
        });

        test('should load most recent state', async () => {
            await storage.saveState({
                position: { x: 0, y: 64, z: 0 },
                health: 10,
                food: 10,
                inventory: [],
                goals: []
            });

            await storage.saveState({
                position: { x: 100, y: 64, z: 100 },
                health: 20,
                food: 20,
                inventory: [],
                goals: []
            });

            const loaded = await storage.loadState();
            expect(loaded.position.x).toBe(100);
            expect(loaded.health).toBe(20);
        });

        test('should handle state with complete position object', async () => {
            const state = {
                position: { x: 50, y: 80, z: -30 },
                health: 15,
                food: 12,
                inventory: [],
                goals: []
            };

            await storage.saveState(state);
            const loaded = await storage.loadState();

            expect(loaded).not.toBeNull();
            expect(loaded.position.x).toBe(50);
            expect(loaded.position.y).toBe(80);
            expect(loaded.position.z).toBe(-30);
        });
    });

    describe('saveExploration and queryExploration', () => {
        test('should save and query exploration data', async () => {
            const chunkX = 10;
            const chunkZ = 20;
            const data = {
                biome: 'plains',
                resources: ['oak_tree', 'iron_ore'],
                structures: ['village'],
                isExplored: true
            };

            await storage.saveExploration(chunkX, chunkZ, data);
            const loaded = await storage.queryExploration(chunkX, chunkZ);

            expect(loaded).not.toBeNull();
            expect(loaded.chunkX).toBe(chunkX);
            expect(loaded.chunkZ).toBe(chunkZ);
            expect(loaded.biome).toBe('plains');
            expect(loaded.resources).toContain('oak_tree');
            expect(loaded.structures).toContain('village');
            expect(loaded.isExplored).toBe(true);
        });

        test('should return null for unexplored chunk', async () => {
            const loaded = await storage.queryExploration(99, 99);
            expect(loaded).toBeNull();
        });

        test('should update existing exploration data', async () => {
            const chunkX = 5;
            const chunkZ = 5;

            await storage.saveExploration(chunkX, chunkZ, {
                biome: 'plains',
                resources: ['oak_tree'],
                isExplored: false
            });

            await storage.saveExploration(chunkX, chunkZ, {
                biome: 'plains',
                resources: ['oak_tree', 'coal_ore'],
                isExplored: true
            });

            const loaded = await storage.queryExploration(chunkX, chunkZ);
            expect(loaded.resources).toContain('coal_ore');
            expect(loaded.isExplored).toBe(true);
        });
    });

    describe('saveDecision and queryHistory', () => {
        test('should save and query decision history', async () => {
            const decision = {
                type: 'gather_wood',
                context: { position: { x: 0, y: 64, z: 0 } },
                outcome: { woodGathered: 10 },
                success: true,
                confidence: 0.95,
                aiSource: 'gemini',
                executionTime: 5000
            };

            await storage.saveDecision(decision);
            const history = await storage.queryHistory({ limit: 10 });

            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('gather_wood');
            expect(history[0].success).toBe(true);
            expect(history[0].confidence).toBe(0.95);
            expect(history[0].aiSource).toBe('gemini');
        });

        test('should filter history by decision type', async () => {
            await storage.saveDecision({ type: 'gather_wood', success: true });
            await storage.saveDecision({ type: 'mine_stone', success: true });
            await storage.saveDecision({ type: 'gather_wood', success: false });

            const history = await storage.queryHistory({ type: 'gather_wood' });
            expect(history).toHaveLength(2);
            expect(history.every(d => d.type === 'gather_wood')).toBe(true);
        });

        test('should limit query results', async () => {
            for (let i = 0; i < 10; i++) {
                await storage.saveDecision({ type: 'test', success: true });
            }

            const history = await storage.queryHistory({ limit: 5 });
            expect(history).toHaveLength(5);
        });
    });

    describe('saveMetric and getMetrics', () => {
        test('should save and retrieve metrics', async () => {
            await storage.saveMetric('decisions_per_minute', 2.5, { source: 'test' });
            const metrics = await storage.getMetrics('decisions_per_minute');

            expect(metrics).toHaveLength(1);
            expect(metrics[0].type).toBe('decisions_per_minute');
            expect(metrics[0].value).toBe(2.5);
            expect(metrics[0].metadata.source).toBe('test');
        });

        test('should filter metrics by timestamp', async () => {
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);

            await storage.saveMetric('test_metric', 1.0);
            
            // Metrics from the last 10 minutes
            const recent = await storage.getMetrics('test_metric', fiveMinutesAgo);
            expect(recent.length).toBeGreaterThan(0);
        });
    });

    describe('getStats', () => {
        test('should return aggregate statistics', async () => {
            await storage.saveState({
                position: { x: 0, y: 64, z: 0 },
                health: 20,
                food: 20,
                inventory: [],
                goals: []
            });

            await storage.saveExploration(1, 1, { isExplored: true });
            await storage.saveDecision({ type: 'test', success: true });
            await storage.saveMetric('test', 1);

            const stats = await storage.getStats();

            expect(stats.totalStates).toBeGreaterThan(0);
            expect(stats.chunksExplored).toBe(1);
            expect(stats.totalDecisions).toBe(1);
            expect(stats.totalMetrics).toBe(1);
        });
    });

    describe('memory fallback', () => {
        test('should use memory fallback when database fails', async () => {
            const invalidStorage = new StorageSystem('/invalid/path/db.sqlite');
            await invalidStorage.initialize();

            expect(invalidStorage.useMemoryOnly).toBe(true);

            // Should still work with memory
            await invalidStorage.saveState({
                position: { x: 0, y: 64, z: 0 },
                health: 20,
                food: 20,
                inventory: [],
                goals: []
            });

            const state = await invalidStorage.loadState();
            expect(state).not.toBeNull();
            expect(state.health).toBe(20);
        });
    });
});
