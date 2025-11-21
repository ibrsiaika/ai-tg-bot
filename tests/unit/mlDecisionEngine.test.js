/**
 * ML Decision Engine Tests
 */

const MLDecisionEngine = require('../../src/mlDecisionEngine');
const EventBus = require('../../src/eventBus');

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
    tensor2d: jest.fn((data) => ({
        data: () => Promise.resolve(data[0] || []),
        dispose: jest.fn()
    })),
    sequential: jest.fn(() => ({
        compile: jest.fn(),
        predict: jest.fn(() => ({
            data: () => Promise.resolve([0.8, 0.1, 0.05, 0.03, 0.02, 0, 0, 0, 0, 0]),
            dispose: jest.fn()
        })),
        dispose: jest.fn(),
        save: jest.fn()
    })),
    layers: {
        dense: jest.fn((config) => config),
        dropout: jest.fn((config) => config)
    },
    train: {
        adam: jest.fn()
    }
}));

describe('MLDecisionEngine', () => {
    let mlEngine;
    let mockBot;
    
    beforeEach(() => {
        // Clear environment
        process.env.ML_ENABLED = 'true';
        process.env.ML_MODEL_PATH = './models';
        process.env.ML_DECISION_THRESHOLD = '0.7';
        process.env.ML_INFERENCE_TIMEOUT = '50';
        
        mockBot = {
            entity: { position: { x: 0, y: 64, z: 0 } }
        };
        
        mlEngine = new MLDecisionEngine(mockBot);
    });
    
    afterEach(() => {
        if (mlEngine) {
            mlEngine.cache.clear();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize when ML_ENABLED is true', () => {
            expect(mlEngine.enabled).toBe(true);
            expect(mlEngine.decisionThreshold).toBe(0.7);
            expect(mlEngine.inferenceTimeout).toBe(50);
        });
        
        test('should disable when ML_ENABLED is false', () => {
            process.env.ML_ENABLED = 'false';
            const engine = new MLDecisionEngine(mockBot);
            expect(engine.enabled).toBe(false);
        });
        
        test('should use default values when env vars not set', () => {
            delete process.env.ML_DECISION_THRESHOLD;
            delete process.env.ML_INFERENCE_TIMEOUT;
            const engine = new MLDecisionEngine(mockBot);
            expect(engine.decisionThreshold).toBe(0.7);
            expect(engine.inferenceTimeout).toBe(50);
        });
    });
    
    describe('Action Prediction', () => {
        test('should predict action from state', async () => {
            await mlEngine.initialize();
            
            const state = {
                health: 0.8,
                food: 0.7,
                inventorySpace: 0.5,
                hasTools: true,
                nearbyMobs: 0,
                timeOfDay: 0.3
            };
            
            const result = await mlEngine.predictAction(state);
            
            expect(result).toBeDefined();
            expect(result.action).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.latency).toBeDefined();
            expect(typeof result.action).toBe('string');
            expect(result.confidence).toBeGreaterThan(0);
        });
        
        test('should return null when not enabled', async () => {
            mlEngine.enabled = false;
            const result = await mlEngine.predictAction({});
            expect(result).toBeNull();
        });
        
        test('should cache predictions', async () => {
            await mlEngine.initialize();
            
            const state = { health: 0.8, food: 0.7 };
            
            const result1 = await mlEngine.predictAction(state);
            const result2 = await mlEngine.predictAction(state);
            
            expect(mlEngine.stats.cacheHits).toBeGreaterThan(0);
        });
        
        test('should meet latency target', async () => {
            await mlEngine.initialize();
            
            const state = {
                health: 0.8,
                food: 0.7,
                inventorySpace: 0.5,
                hasTools: true
            };
            
            const result = await mlEngine.predictAction(state);
            
            expect(result.latency).toBeLessThan(mlEngine.inferenceTimeout);
        });
        
        test('should emit ml:prediction event', async () => {
            await mlEngine.initialize();
            
            const eventSpy = jest.fn();
            EventBus.on('ml:prediction', eventSpy);
            
            const state = { health: 0.8, food: 0.7 };
            await mlEngine.predictAction(state);
            
            expect(eventSpy).toHaveBeenCalled();
            EventBus.removeListener('ml:prediction', eventSpy);
        });
    });
    
    describe('Resource Prioritization', () => {
        test('should prioritize resources', async () => {
            await mlEngine.initialize();
            
            const resources = [
                { type: 'wood', distance: 10 },
                { type: 'stone', distance: 20 },
                { type: 'iron', distance: 30 }
            ];
            
            const state = { health: 0.8, food: 0.7 };
            
            const result = await mlEngine.prioritizeResources(resources, state);
            
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(3);
        });
        
        test('should return original array when not enabled', async () => {
            mlEngine.enabled = false;
            const resources = [{ type: 'wood' }];
            const result = await mlEngine.prioritizeResources(resources, {});
            expect(result).toEqual(resources);
        });
        
        test('should handle empty resources', async () => {
            await mlEngine.initialize();
            const result = await mlEngine.prioritizeResources([], {});
            expect(result).toEqual([]);
        });
    });
    
    describe('Risk Assessment', () => {
        test('should assess risk of action', async () => {
            await mlEngine.initialize();
            
            const action = { type: 'mine', requiresTools: true };
            const state = { health: 0.5, nearbyMobs: 2 };
            
            const result = await mlEngine.assessRisk(action, state);
            
            expect(result).toBeDefined();
            expect(result.risk).toBeDefined();
            expect(result.level).toBeDefined();
            expect(typeof result.risk).toBe('number');
            expect(result.risk).toBeGreaterThanOrEqual(0);
            expect(result.risk).toBeLessThanOrEqual(1);
        });
        
        test('should return default risk when not enabled', async () => {
            mlEngine.enabled = false;
            const result = await mlEngine.assessRisk({}, {});
            expect(result.risk).toBe(0.5);
            expect(result.confidence).toBe(0);
        });
        
        test('should cache risk assessments', async () => {
            await mlEngine.initialize();
            
            const action = { type: 'mine' };
            const state = { health: 0.8 };
            
            await mlEngine.assessRisk(action, state);
            await mlEngine.assessRisk(action, state);
            
            expect(mlEngine.stats.cacheHits).toBeGreaterThan(0);
        });
        
        test('should categorize risk levels correctly', () => {
            expect(mlEngine.getRiskLevel(0.2)).toBe('low');
            expect(mlEngine.getRiskLevel(0.4)).toBe('medium');
            expect(mlEngine.getRiskLevel(0.7)).toBe('high');
            expect(mlEngine.getRiskLevel(0.9)).toBe('critical');
        });
    });
    
    describe('Statistics', () => {
        test('should track inference statistics', async () => {
            await mlEngine.initialize();
            
            const state = { health: 0.8, food: 0.7 };
            await mlEngine.predictAction(state);
            
            const stats = mlEngine.getStats();
            
            expect(stats.totalInferences).toBeGreaterThan(0);
            expect(stats.avgLatencyMs).toBeDefined();
            expect(stats.cacheHitRate).toBeDefined();
            expect(stats.apiReduction).toBeDefined();
        });
        
        test('should calculate cache hit rate', async () => {
            await mlEngine.initialize();
            
            const state = { health: 0.8 };
            
            await mlEngine.predictAction(state);
            await mlEngine.predictAction(state);
            await mlEngine.predictAction(state);
            
            const stats = mlEngine.getStats();
            expect(parseFloat(stats.cacheHitRate)).toBeGreaterThan(0);
        });
        
        test('should track API reduction', async () => {
            await mlEngine.initialize();
            
            const state = { health: 0.8 };
            await mlEngine.predictAction(state);
            
            const stats = mlEngine.getStats();
            expect(stats.apiCallsSaved).toBeGreaterThan(0);
        });
    });
    
    describe('Cache Management', () => {
        test('should cache results', async () => {
            await mlEngine.initialize();
            
            const key = 'test:key';
            const data = { result: 'test' };
            
            mlEngine.addToCache(key, data);
            const cached = mlEngine.getFromCache(key);
            
            expect(cached).toEqual(data);
        });
        
        test('should expire old cache entries', async () => {
            await mlEngine.initialize();
            mlEngine.cacheTimeout = 10; // 10ms timeout
            
            const key = 'test:key';
            const data = { result: 'test' };
            
            mlEngine.addToCache(key, data);
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 20));
            
            const cached = mlEngine.getFromCache(key);
            expect(cached).toBeNull();
        });
        
        test('should limit cache size', async () => {
            await mlEngine.initialize();
            
            // Add 150 entries (exceeds 100 limit)
            for (let i = 0; i < 150; i++) {
                mlEngine.addToCache(`key:${i}`, { data: i });
            }
            
            expect(mlEngine.cache.size).toBeLessThanOrEqual(100);
        });
    });
    
    describe('Feature Extraction', () => {
        test('should extract action features', () => {
            const state = {
                health: 0.8,
                food: 0.7,
                inventorySpace: 0.5,
                hasTools: true,
                nearbyMobs: 2
            };
            
            const features = mlEngine.extractActionFeatures(state);
            
            expect(Array.isArray(features)).toBe(true);
            expect(features.length).toBe(20);
            expect(features[0]).toBe(0.8); // health
            expect(features[1]).toBe(0.7); // food
        });
        
        test('should extract resource features', () => {
            const resource = { distance: 10, quantity: 5, value: 0.8 };
            const state = { health: 0.8, food: 0.7 };
            
            const features = mlEngine.extractResourceFeatures(resource, state);
            
            expect(Array.isArray(features)).toBe(true);
            expect(features.length).toBe(15);
        });
        
        test('should extract risk features', () => {
            const action = { requiresTools: true, duration: 100 };
            const state = { health: 0.6, nearbyMobs: 3 };
            
            const features = mlEngine.extractRiskFeatures(action, state);
            
            expect(Array.isArray(features)).toBe(true);
            expect(features.length).toBe(12);
        });
    });
    
    describe('Model Management', () => {
        test('should create default models', () => {
            const actionModel = mlEngine.createDefaultActionModel();
            expect(actionModel).toBeDefined();
            
            const resourceModel = mlEngine.createDefaultResourceModel();
            expect(resourceModel).toBeDefined();
            
            const riskModel = mlEngine.createDefaultRiskModel();
            expect(riskModel).toBeDefined();
        });
    });
});
