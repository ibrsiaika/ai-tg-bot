/**
 * Tests for MLTrainingSystem
 */

const MLTrainingSystem = require('../../src/mlTrainingSystem');
const { ExperienceBuffer, ResourceForecaster, CombatStrategyLearner, PathfindingLearner } = require('../../src/mlTrainingSystem');

// Mock EventBus
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

// Mock TensorFlow
jest.mock('@tensorflow/tfjs', () => ({
    tensor2d: jest.fn(() => ({
        dispose: jest.fn()
    })),
    sequential: jest.fn(() => ({
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.1] } }),
        compile: jest.fn()
    })),
    layers: {
        dense: jest.fn(() => ({})),
        dropout: jest.fn(() => ({}))
    },
    train: {
        adam: jest.fn()
    }
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn()
}));

describe('ExperienceBuffer', () => {
    let buffer;

    beforeEach(() => {
        buffer = new ExperienceBuffer(10);
    });

    it('should add experiences', () => {
        buffer.add({ action: 'mine', reward: 1 });
        expect(buffer.size()).toBe(1);
    });

    it('should limit buffer size', () => {
        for (let i = 0; i < 15; i++) {
            buffer.add({ action: 'test', index: i });
        }
        expect(buffer.size()).toBe(10);
    });

    it('should remove oldest when full', () => {
        for (let i = 0; i < 15; i++) {
            buffer.add({ index: i });
        }
        // Should have indices 5-14
        expect(buffer.buffer[0].index).toBe(5);
    });

    it('should sample random experiences', () => {
        for (let i = 0; i < 10; i++) {
            buffer.add({ index: i });
        }

        const samples = buffer.sample(3);
        expect(samples.length).toBe(3);
    });

    it('should not sample more than available', () => {
        buffer.add({ index: 0 });
        buffer.add({ index: 1 });

        const samples = buffer.sample(5);
        expect(samples.length).toBe(2);
    });

    it('should clear buffer', () => {
        buffer.add({ index: 0 });
        buffer.clear();
        expect(buffer.size()).toBe(0);
    });
});

describe('ResourceForecaster', () => {
    let forecaster;

    beforeEach(() => {
        forecaster = new ResourceForecaster();
    });

    it('should record observations', () => {
        forecaster.recordObservation('diamond', 5, { x: 0, y: 11, z: 0 });
        expect(forecaster.resourceHistory.has('diamond')).toBe(true);
        expect(forecaster.resourceHistory.get('diamond').length).toBe(1);
    });

    it('should limit history size', () => {
        forecaster.maxHistory = 10;
        for (let i = 0; i < 20; i++) {
            forecaster.recordObservation('iron', i, { x: i, y: 30, z: i });
        }
        expect(forecaster.resourceHistory.get('iron').length).toBe(10);
    });

    it('should return insufficient data for small samples', () => {
        forecaster.recordObservation('gold', 1, { x: 0, y: 20, z: 0 });

        const prediction = forecaster.predict('gold', 30);
        expect(prediction.reason).toBe('insufficient_data');
    });

    it('should predict with enough data', () => {
        for (let i = 0; i < 20; i++) {
            forecaster.recordObservation('coal', 10 + Math.random() * 5, { x: i, y: 30, z: i });
        }

        const prediction = forecaster.predict('coal', 30);
        expect(prediction.prediction).toBeDefined();
        expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should identify optimal locations', () => {
        // Add observations at different locations
        for (let i = 0; i < 5; i++) {
            forecaster.recordObservation('iron', 10, { x: 0, y: 30, z: 0 }); // Chunk 0,0
        }
        for (let i = 0; i < 2; i++) {
            forecaster.recordObservation('iron', 5, { x: 100, y: 30, z: 100 }); // Chunk 6,6
        }

        const locations = forecaster.getOptimalLocations('iron', 5);
        expect(locations.length).toBe(2);
        // First should be the more productive location
        expect(locations[0].avgQuantity).toBeGreaterThan(locations[1].avgQuantity);
    });
});

describe('CombatStrategyLearner', () => {
    let learner;

    beforeEach(() => {
        learner = new CombatStrategyLearner();
    });

    it('should record combat experiences', () => {
        learner.recordCombat({
            mobType: 'zombie',
            strategy: 'melee',
            outcome: 'win',
            healthLost: 2,
            damageDealt: 20,
            duration: 5000
        });

        expect(learner.combatExperiences.size()).toBe(1);
    });

    it('should update strategy scores', () => {
        learner.recordCombat({ mobType: 'zombie', strategy: 'melee', outcome: 'win' });
        learner.recordCombat({ mobType: 'zombie', strategy: 'melee', outcome: 'win' });
        learner.recordCombat({ mobType: 'zombie', strategy: 'melee', outcome: 'death' });

        const scores = learner.strategyScores.get('zombie:melee');
        expect(scores.wins).toBe(2);
        expect(scores.losses).toBe(1);
    });

    it('should get best strategy', () => {
        // Record many wins with kiting
        for (let i = 0; i < 10; i++) {
            learner.recordCombat({ mobType: 'skeleton', strategy: 'kiting', outcome: 'win' });
        }
        // Record losses with melee
        for (let i = 0; i < 5; i++) {
            learner.recordCombat({ mobType: 'skeleton', strategy: 'melee', outcome: 'death' });
        }

        const best = learner.getBestStrategy('skeleton');
        expect(best.strategy).toBe('kiting');
        expect(best.confidence).toBeGreaterThan(0.5);
    });

    it('should return default strategy with no data', () => {
        const best = learner.getBestStrategy('unknown_mob');
        expect(best.strategy).toBe('melee');
        expect(best.confidence).toBe(0.5);
    });
});

describe('PathfindingLearner', () => {
    let learner;

    beforeEach(() => {
        learner = new PathfindingLearner();
    });

    it('should record path completions', () => {
        learner.recordPath({
            startPos: { x: 0, y: 64, z: 0 },
            endPos: { x: 100, y: 64, z: 100 },
            duration: 10000,
            blocksTraversed: 150,
            success: true
        });

        expect(learner.pathExperiences.size()).toBe(1);
    });

    it('should update route scores', () => {
        const path = {
            startPos: { x: 0, y: 64, z: 0 },
            endPos: { x: 100, y: 64, z: 100 },
            duration: 10000,
            blocksTraversed: 150,
            success: true
        };

        learner.recordPath(path);
        learner.recordPath(path);

        const routeKey = learner.getRouteKey(path.startPos, path.endPos);
        const score = learner.routeScores.get(routeKey);

        expect(score.successes).toBe(2);
    });

    it('should track failures', () => {
        learner.recordPath({
            startPos: { x: 0, y: 64, z: 0 },
            endPos: { x: 100, y: 64, z: 100 },
            success: false
        });

        const routeKey = learner.getRouteKey({ x: 0, y: 64, z: 0 }, { x: 100, y: 64, z: 100 });
        const score = learner.routeScores.get(routeKey);

        expect(score.failures).toBe(1);
    });

    it('should suggest optimal route', () => {
        // Record successful paths
        for (let i = 0; i < 5; i++) {
            learner.recordPath({
                startPos: { x: 0, y: 64, z: 0 },
                endPos: { x: 50, y: 64, z: 50 },
                duration: 5000,
                blocksTraversed: 75,
                success: true
            });
        }

        const suggestion = learner.getOptimalRoute({ x: 0, y: 64, z: 0 }, { x: 50, y: 64, z: 50 });

        expect(suggestion.recommendation).toBe('use_cached');
        expect(suggestion.successRate).toBe(1);
    });

    it('should suggest exploring new route with failures', () => {
        // Record failed paths
        for (let i = 0; i < 5; i++) {
            learner.recordPath({
                startPos: { x: 0, y: 64, z: 0 },
                endPos: { x: 50, y: 64, z: 50 },
                success: false
            });
        }

        const suggestion = learner.getOptimalRoute({ x: 0, y: 64, z: 0 }, { x: 50, y: 64, z: 50 });

        expect(suggestion.recommendation).toBe('explore_new');
    });
});

describe('MLTrainingSystem', () => {
    let trainingSystem;
    let mockMLEngine;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMLEngine = {
            models: {
                actionPredictor: {
                    fit: jest.fn().mockResolvedValue({ history: { loss: [0.1] } })
                }
            }
        };

        process.env.ML_TRAINING_ENABLED = 'true';
        trainingSystem = new MLTrainingSystem(mockMLEngine);
    });

    afterEach(() => {
        trainingSystem.cleanup();
        delete process.env.ML_TRAINING_ENABLED;
    });

    it('should initialize with components', () => {
        expect(trainingSystem.experienceBuffer).toBeDefined();
        expect(trainingSystem.resourceForecaster).toBeDefined();
        expect(trainingSystem.combatLearner).toBeDefined();
        expect(trainingSystem.pathfindingLearner).toBeDefined();
    });

    it('should record decisions', () => {
        trainingSystem.recordDecision({
            action: 'mine',
            state: { health: 20, food: 20 },
            confidence: 0.8
        });

        expect(trainingSystem.experienceBuffer.size()).toBe(1);
        expect(trainingSystem.stats.totalExperiences).toBe(1);
    });

    it('should record outcomes', () => {
        trainingSystem.recordDecision({
            action: 'mine',
            state: { health: 20, food: 20 },
            confidence: 0.8
        });

        trainingSystem.recordOutcome({
            action: 'mine',
            success: true,
            reward: 10,
            duration: 5000
        });

        const exp = trainingSystem.experienceBuffer.buffer[0];
        expect(exp.outcome).toBeDefined();
        expect(exp.outcome.success).toBe(true);
    });

    it('should normalize state', () => {
        const state = {
            health: 10,
            food: 15,
            inventorySpace: 18,
            timeOfDay: 12000
        };

        const normalized = trainingSystem.normalizeState(state);

        expect(normalized.health).toBe(0.5); // 10/20
        expect(normalized.food).toBe(0.75); // 15/20
        expect(normalized.inventorySpace).toBe(0.5); // 18/36
        expect(normalized.timeOfDay).toBe(0.5); // 12000/24000
    });

    it('should get resource forecast', () => {
        // Add observations
        for (let i = 0; i < 20; i++) {
            trainingSystem.resourceForecaster.recordObservation('wood', 10, { x: i, y: 64, z: i });
        }

        const forecast = trainingSystem.getResourceForecast('wood', 30);
        expect(forecast.prediction).toBeDefined();
    });

    it('should get best combat strategy', () => {
        for (let i = 0; i < 5; i++) {
            trainingSystem.combatLearner.recordCombat({
                mobType: 'creeper',
                strategy: 'bow',
                outcome: 'win'
            });
        }

        const strategy = trainingSystem.getBestCombatStrategy('creeper');
        expect(strategy.strategy).toBe('bow');
    });

    it('should get route optimization', () => {
        for (let i = 0; i < 5; i++) {
            trainingSystem.pathfindingLearner.recordPath({
                startPos: { x: 0, y: 64, z: 0 },
                endPos: { x: 50, y: 64, z: 50 },
                duration: 5000,
                blocksTraversed: 75,
                success: true
            });
        }

        const optimization = trainingSystem.getRouteOptimization(
            { x: 0, y: 64, z: 0 },
            { x: 50, y: 64, z: 50 }
        );

        expect(optimization.recommendation).toBe('use_cached');
    });

    it('should return accurate stats', () => {
        trainingSystem.recordDecision({ action: 'mine', state: {}, confidence: 0.8 });
        trainingSystem.recordDecision({ action: 'farm', state: {}, confidence: 0.7 });

        const stats = trainingSystem.getStats();

        expect(stats.totalExperiences).toBe(2);
        expect(stats.experienceBufferSize).toBe(2);
    });
});
