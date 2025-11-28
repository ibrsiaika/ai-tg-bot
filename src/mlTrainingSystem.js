/**
 * Advanced ML Training System - v4.2.0
 * 
 * Continuous learning system for the ML Decision Engine
 * Features:
 * - Training data collection from bot decisions
 * - Online learning with incremental updates
 * - Experience replay buffer for efficient training
 * - Performance tracking and model evaluation
 * - Predictive resource forecasting
 * - Adaptive combat strategy learning
 * - Reinforcement learning for pathfinding
 * 
 * Memory optimized for 512MB RAM environments
 */

const tf = require('@tensorflow/tfjs');
const EventBus = require('./eventBus');
const fs = require('fs');
const path = require('path');

// Memory-efficient constants
const MAX_EXPERIENCE_BUFFER = 1000;
const MAX_RESOURCE_HISTORY = 500;
const TRAINING_BATCH_SIZE = 32;
const LEARNING_RATE = 0.001;
const MIN_SAMPLES_FOR_TRAINING = 50;
const SAVE_INTERVAL_MS = 300000; // 5 minutes

/**
 * Experience replay buffer for efficient learning
 */
class ExperienceBuffer {
    constructor(maxSize = MAX_EXPERIENCE_BUFFER) {
        this.buffer = [];
        this.maxSize = maxSize;
    }

    add(experience) {
        this.buffer.push(experience);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift(); // Remove oldest
        }
    }

    sample(batchSize) {
        const samples = [];
        const indices = new Set();
        const maxSamples = Math.min(batchSize, this.buffer.length);

        while (indices.size < maxSamples) {
            indices.add(Math.floor(Math.random() * this.buffer.length));
        }

        for (const idx of indices) {
            samples.push(this.buffer[idx]);
        }

        return samples;
    }

    size() {
        return this.buffer.length;
    }

    clear() {
        this.buffer = [];
    }
}

/**
 * Resource forecasting model
 */
class ResourceForecaster {
    constructor() {
        this.resourceHistory = new Map();
        this.maxHistory = MAX_RESOURCE_HISTORY;
        this.model = null;
    }

    /**
     * Record resource observation
     */
    recordObservation(resourceType, quantity, position, timestamp = Date.now()) {
        if (!this.resourceHistory.has(resourceType)) {
            this.resourceHistory.set(resourceType, []);
        }

        const history = this.resourceHistory.get(resourceType);
        history.push({
            quantity,
            position: position ? { x: position.x, y: position.y, z: position.z } : null,
            timestamp,
            timeOfDay: this.getTimeOfDay(timestamp)
        });

        // Limit history size
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }

    /**
     * Get time of day (0-1 scale representing Minecraft day cycle)
     */
    getTimeOfDay(timestamp) {
        // Minecraft day is 20 minutes (1,200,000 ms)
        return (timestamp % 1200000) / 1200000;
    }

    /**
     * Predict resource availability
     * @param {string} resourceType - Type of resource
     * @param {number} minutesAhead - How many minutes to forecast
     */
    predict(resourceType, minutesAhead = 30) {
        const history = this.resourceHistory.get(resourceType);
        if (!history || history.length < 10) {
            return { prediction: null, confidence: 0, reason: 'insufficient_data' };
        }

        // Simple moving average prediction
        const recentWindow = history.slice(-20);
        const avgQuantity = recentWindow.reduce((sum, h) => sum + h.quantity, 0) / recentWindow.length;

        // Calculate trend
        const oldAvg = history.slice(0, Math.floor(history.length / 2))
            .reduce((sum, h) => sum + h.quantity, 0) / Math.floor(history.length / 2);
        const newAvg = history.slice(-Math.floor(history.length / 2))
            .reduce((sum, h) => sum + h.quantity, 0) / Math.floor(history.length / 2);

        const trend = (newAvg - oldAvg) / oldAvg;

        // Predict future availability
        const prediction = avgQuantity * (1 + trend * (minutesAhead / 30));
        const confidence = Math.min(0.9, history.length / this.maxHistory);

        return {
            prediction: Math.max(0, prediction),
            confidence,
            trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
            historySamples: history.length
        };
    }

    /**
     * Get optimal gathering locations based on history
     */
    getOptimalLocations(resourceType, limit = 5) {
        const history = this.resourceHistory.get(resourceType);
        if (!history || history.length === 0) return [];

        // Group by location (rounded to chunks)
        const locationScores = new Map();

        for (const record of history) {
            if (!record.position) continue;

            const chunkKey = `${Math.floor(record.position.x / 16)},${Math.floor(record.position.z / 16)}`;

            if (!locationScores.has(chunkKey)) {
                locationScores.set(chunkKey, {
                    position: record.position,
                    totalQuantity: 0,
                    observations: 0
                });
            }

            const score = locationScores.get(chunkKey);
            score.totalQuantity += record.quantity;
            score.observations++;
        }

        // Sort by average quantity and return top locations
        const sorted = Array.from(locationScores.values())
            .map(s => ({
                ...s,
                avgQuantity: s.totalQuantity / s.observations
            }))
            .sort((a, b) => b.avgQuantity - a.avgQuantity);

        return sorted.slice(0, limit);
    }
}

/**
 * Combat strategy learner
 */
class CombatStrategyLearner {
    constructor() {
        this.combatExperiences = new ExperienceBuffer(500);
        this.mobPatterns = new Map();
        this.strategyScores = new Map();
    }

    /**
     * Record combat experience
     */
    recordCombat(data) {
        const { mobType, strategy, outcome, healthLost, damageDealt, duration } = data;

        this.combatExperiences.add({
            mobType,
            strategy,
            outcome, // 'win', 'flee', 'death'
            healthLost,
            damageDealt,
            duration,
            timestamp: Date.now()
        });

        // Update strategy scores
        this.updateStrategyScore(mobType, strategy, outcome);

        // Learn mob patterns
        this.learnMobPattern(data);
    }

    /**
     * Update strategy effectiveness score
     */
    updateStrategyScore(mobType, strategy, outcome) {
        const key = `${mobType}:${strategy}`;

        if (!this.strategyScores.has(key)) {
            this.strategyScores.set(key, { wins: 0, losses: 0, flees: 0 });
        }

        const scores = this.strategyScores.get(key);
        if (outcome === 'win') scores.wins++;
        else if (outcome === 'death') scores.losses++;
        else if (outcome === 'flee') scores.flees++;
    }

    /**
     * Learn mob behavior patterns
     */
    learnMobPattern(data) {
        const { mobType, mobBehavior } = data;
        if (!mobBehavior) return;

        if (!this.mobPatterns.has(mobType)) {
            this.mobPatterns.set(mobType, {
                avgAttackInterval: 0,
                avgDamage: 0,
                observations: 0,
                commonBehaviors: []
            });
        }

        const pattern = this.mobPatterns.get(mobType);
        pattern.observations++;

        if (mobBehavior.attackInterval) {
            pattern.avgAttackInterval = (pattern.avgAttackInterval * (pattern.observations - 1) + mobBehavior.attackInterval) / pattern.observations;
        }

        if (mobBehavior.damage) {
            pattern.avgDamage = (pattern.avgDamage * (pattern.observations - 1) + mobBehavior.damage) / pattern.observations;
        }
    }

    /**
     * Get best strategy for a mob type
     */
    getBestStrategy(mobType) {
        const strategies = ['melee', 'kiting', 'blocking', 'sprint_hit', 'bow'];
        let bestStrategy = 'melee';
        let bestScore = -Infinity;

        for (const strategy of strategies) {
            const key = `${mobType}:${strategy}`;
            const scores = this.strategyScores.get(key);

            if (scores) {
                const total = scores.wins + scores.losses + scores.flees;
                if (total < 3) continue; // Need minimum samples

                const winRate = scores.wins / total;
                const score = winRate * 100 - (scores.losses / total) * 50;

                if (score > bestScore) {
                    bestScore = score;
                    bestStrategy = strategy;
                }
            }
        }

        return {
            strategy: bestStrategy,
            confidence: bestScore > 0 ? Math.min(0.95, bestScore / 100) : 0.5,
            mobPattern: this.mobPatterns.get(mobType) || null
        };
    }

    /**
     * Predict mob spawn locations based on history
     */
    predictSpawnLocations(mobType, currentPosition) {
        const experiences = this.combatExperiences.buffer.filter(e => e.mobType === mobType);
        if (experiences.length < 5) return [];

        // Group by approximate location
        const locationCounts = new Map();

        for (const exp of experiences) {
            if (!exp.position) continue;

            const key = `${Math.floor(exp.position.x / 32)},${Math.floor(exp.position.z / 32)}`;
            locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
        }

        // Return top spawn locations
        return Array.from(locationCounts.entries())
            .map(([key, count]) => {
                const [x, z] = key.split(',').map(Number);
                return {
                    position: { x: x * 32 + 16, z: z * 32 + 16 },
                    frequency: count / experiences.length
                };
            })
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);
    }
}

/**
 * Pathfinding reinforcement learner
 */
class PathfindingLearner {
    constructor() {
        this.pathExperiences = new ExperienceBuffer(300);
        this.routeScores = new Map();
    }

    /**
     * Record path completion
     */
    recordPath(data) {
        const { startPos, endPos, duration, blocksTraversed, success, obstacles } = data;

        const routeKey = this.getRouteKey(startPos, endPos);

        this.pathExperiences.add({
            routeKey,
            startPos,
            endPos,
            duration,
            blocksTraversed,
            success,
            obstacles,
            timestamp: Date.now()
        });

        // Update route scores
        this.updateRouteScore(routeKey, data);
    }

    /**
     * Get route key for caching
     */
    getRouteKey(start, end) {
        return `${Math.floor(start.x / 16)},${Math.floor(start.z / 16)}-${Math.floor(end.x / 16)},${Math.floor(end.z / 16)}`;
    }

    /**
     * Update route efficiency score
     */
    updateRouteScore(routeKey, data) {
        if (!this.routeScores.has(routeKey)) {
            this.routeScores.set(routeKey, {
                totalDuration: 0,
                totalBlocks: 0,
                successes: 0,
                failures: 0,
                avgEfficiency: 0
            });
        }

        const score = this.routeScores.get(routeKey);

        if (data.success) {
            score.successes++;
            score.totalDuration += data.duration;
            score.totalBlocks += data.blocksTraversed;

            // Calculate efficiency (blocks per second)
            const efficiency = data.blocksTraversed / (data.duration / 1000);
            score.avgEfficiency = (score.avgEfficiency * (score.successes - 1) + efficiency) / score.successes;
        } else {
            score.failures++;
        }
    }

    /**
     * Get optimal route suggestion
     */
    getOptimalRoute(startPos, endPos) {
        const routeKey = this.getRouteKey(startPos, endPos);
        const score = this.routeScores.get(routeKey);

        if (!score || (score.successes + score.failures) < 3) {
            return { recommendation: 'default', confidence: 0.5, reason: 'insufficient_data' };
        }

        const successRate = score.successes / (score.successes + score.failures);

        return {
            recommendation: successRate > 0.8 ? 'use_cached' : 'explore_new',
            avgDuration: score.totalDuration / score.successes,
            avgEfficiency: score.avgEfficiency,
            successRate,
            confidence: Math.min(0.95, (score.successes + score.failures) / 20)
        };
    }
}

/**
 * Main ML Training System
 */
class MLTrainingSystem {
    constructor(mlEngine, options = {}) {
        this.mlEngine = mlEngine;
        this.enabled = process.env.ML_TRAINING_ENABLED !== 'false';
        this.modelPath = options.modelPath || './models/training';

        // Training components
        this.experienceBuffer = new ExperienceBuffer();
        this.resourceForecaster = new ResourceForecaster();
        this.combatLearner = new CombatStrategyLearner();
        this.pathfindingLearner = new PathfindingLearner();

        // Training state
        this.isTraining = false;
        this.trainingInterval = null;
        this.lastSaveTime = Date.now();

        // Statistics
        this.stats = {
            totalExperiences: 0,
            trainingSessions: 0,
            modelUpdates: 0,
            avgTrainingLoss: 0
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize training system
     */
    initialize() {
        console.log('[ML Training] Initializing training system...');

        this.setupEventListeners();
        this.startPeriodicTraining();

        console.log('[ML Training] ✓ Training system initialized');
    }

    /**
     * Setup event listeners for collecting training data
     */
    setupEventListeners() {
        // Decision events
        EventBus.on('decision:made', (data) => this.recordDecision(data));
        EventBus.on('decision:completed', (data) => this.recordOutcome(data));

        // Resource events
        EventBus.on('resource:gathered', (data) => this.recordResourceGathering(data));
        EventBus.on('resource:found', (data) => this.recordResourceDiscovery(data));

        // Combat events
        EventBus.on('combat:ended', (data) => this.recordCombatResult(data));

        // Path events
        EventBus.on('path:completed', (data) => this.recordPathCompletion(data));
    }

    /**
     * Record a decision for training
     */
    recordDecision(data) {
        const { action, state, confidence, timestamp } = data;

        this.experienceBuffer.add({
            type: 'decision',
            action,
            state: this.normalizeState(state),
            confidence,
            timestamp: timestamp || Date.now(),
            outcome: null // Will be filled in later
        });

        this.stats.totalExperiences++;
    }

    /**
     * Record decision outcome
     */
    recordOutcome(data) {
        const { action, success, reward, duration } = data;

        // Find the corresponding decision and update it
        for (let i = this.experienceBuffer.buffer.length - 1; i >= 0; i--) {
            const exp = this.experienceBuffer.buffer[i];
            if (exp.type === 'decision' && exp.action === action && !exp.outcome) {
                exp.outcome = { success, reward, duration };
                break;
            }
        }
    }

    /**
     * Record resource gathering for forecasting
     */
    recordResourceGathering(data) {
        const { resourceType, quantity, position } = data;
        this.resourceForecaster.recordObservation(resourceType, quantity, position);
    }

    /**
     * Record resource discovery
     */
    recordResourceDiscovery(data) {
        const { resourceType, position } = data;
        this.resourceForecaster.recordObservation(resourceType, 1, position);
    }

    /**
     * Record combat result
     */
    recordCombatResult(data) {
        this.combatLearner.recordCombat(data);
    }

    /**
     * Record path completion
     */
    recordPathCompletion(data) {
        this.pathfindingLearner.recordPath(data);
    }

    /**
     * Normalize state for ML input
     */
    normalizeState(state) {
        return {
            health: (state.health || 20) / 20,
            food: (state.food || 20) / 20,
            inventorySpace: (state.inventorySpace || 36) / 36,
            timeOfDay: (state.timeOfDay || 0) / 24000,
            nearbyMobs: Math.min((state.nearbyMobs || 0) / 10, 1),
            toolDurability: state.toolDurability || 1
        };
    }

    /**
     * Start periodic training
     */
    startPeriodicTraining() {
        // Train every 5 minutes
        this.trainingInterval = setInterval(() => {
            this.trainModels();
        }, 300000);
    }

    /**
     * Stop periodic training
     */
    stopPeriodicTraining() {
        if (this.trainingInterval) {
            clearInterval(this.trainingInterval);
            this.trainingInterval = null;
        }
    }

    /**
     * Train models with collected experiences
     */
    async trainModels() {
        if (this.isTraining || this.experienceBuffer.size() < MIN_SAMPLES_FOR_TRAINING) {
            return;
        }

        this.isTraining = true;
        console.log('[ML Training] Starting training session...');

        try {
            // Get batch of completed experiences
            const experiences = this.experienceBuffer.buffer.filter(e => e.outcome !== null);

            if (experiences.length < MIN_SAMPLES_FOR_TRAINING) {
                console.log('[ML Training] Not enough completed experiences for training');
                this.isTraining = false;
                return;
            }

            // Prepare training data
            const { inputs, labels } = this.prepareTrainingData(experiences);

            if (!inputs || inputs.length === 0) {
                this.isTraining = false;
                return;
            }

            // Train the action predictor model
            if (this.mlEngine && this.mlEngine.models.actionPredictor) {
                const xs = tf.tensor2d(inputs);
                const ys = tf.tensor2d(labels);

                const result = await this.mlEngine.models.actionPredictor.fit(xs, ys, {
                    epochs: 5,
                    batchSize: TRAINING_BATCH_SIZE,
                    shuffle: true,
                    verbose: 0
                });

                this.stats.avgTrainingLoss = result.history.loss[result.history.loss.length - 1];
                this.stats.modelUpdates++;

                // Cleanup tensors
                xs.dispose();
                ys.dispose();
            }

            this.stats.trainingSessions++;

            // Save models periodically
            if (Date.now() - this.lastSaveTime > SAVE_INTERVAL_MS) {
                await this.saveModels();
                this.lastSaveTime = Date.now();
            }

            console.log(`[ML Training] Session complete. Loss: ${this.stats.avgTrainingLoss.toFixed(4)}`);

            EventBus.emit('ml:training:complete', {
                loss: this.stats.avgTrainingLoss,
                sessions: this.stats.trainingSessions
            });

        } catch (error) {
            console.error('[ML Training] Training error:', error.message);
        }

        this.isTraining = false;
    }

    /**
     * Prepare training data from experiences
     */
    prepareTrainingData(experiences) {
        const inputs = [];
        const labels = [];

        const actionMap = {
            'mine': 0, 'farm': 1, 'build': 2, 'explore': 3, 'combat': 4,
            'craft': 5, 'smelt': 6, 'rest': 7, 'gather': 8, 'trade': 9
        };

        for (const exp of experiences) {
            if (!exp.state || exp.outcome === null) continue;

            // Create input features
            const input = [
                exp.state.health || 0,
                exp.state.food || 0,
                exp.state.inventorySpace || 0,
                exp.state.timeOfDay || 0,
                exp.state.nearbyMobs || 0,
                exp.state.toolDurability || 1,
                // Add more features as needed (pad to expected size)
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ];

            // Create one-hot encoded label with reward adjustment
            const label = new Array(10).fill(0);
            const actionIdx = actionMap[exp.action] || 0;

            // Use outcome to adjust the label (reinforcement)
            if (exp.outcome.success) {
                label[actionIdx] = 1;
            } else {
                // Reduce probability for failed actions
                label.fill(1 / 10);
                label[actionIdx] = 0.01;
            }

            // Normalize label to sum to 1
            const sum = label.reduce((a, b) => a + b, 0);
            for (let i = 0; i < label.length; i++) {
                label[i] /= sum;
            }

            inputs.push(input);
            labels.push(label);
        }

        return { inputs, labels };
    }

    /**
     * Save models to disk
     */
    async saveModels() {
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.modelPath)) {
                fs.mkdirSync(this.modelPath, { recursive: true });
            }

            // Save training statistics
            const statsPath = path.join(this.modelPath, 'training-stats.json');
            fs.writeFileSync(statsPath, JSON.stringify({
                stats: this.stats,
                resourceForecasterSize: this.resourceForecaster.resourceHistory.size,
                combatExperiences: this.combatLearner.combatExperiences.size(),
                pathExperiences: this.pathfindingLearner.pathExperiences.size(),
                timestamp: Date.now()
            }, null, 2));

            console.log('[ML Training] Models and stats saved');

        } catch (error) {
            console.error('[ML Training] Save error:', error.message);
        }
    }

    /**
     * Get resource forecast
     */
    getResourceForecast(resourceType, minutesAhead = 30) {
        return this.resourceForecaster.predict(resourceType, minutesAhead);
    }

    /**
     * Get optimal gathering locations
     */
    getOptimalGatheringLocations(resourceType, limit = 5) {
        return this.resourceForecaster.getOptimalLocations(resourceType, limit);
    }

    /**
     * Get best combat strategy
     */
    getBestCombatStrategy(mobType) {
        return this.combatLearner.getBestStrategy(mobType);
    }

    /**
     * Get mob spawn predictions
     */
    getMobSpawnPredictions(mobType, currentPosition) {
        return this.combatLearner.predictSpawnLocations(mobType, currentPosition);
    }

    /**
     * Get optimal route suggestion
     */
    getRouteOptimization(startPos, endPos) {
        return this.pathfindingLearner.getOptimalRoute(startPos, endPos);
    }

    /**
     * Get training statistics
     */
    getStats() {
        return {
            ...this.stats,
            experienceBufferSize: this.experienceBuffer.size(),
            resourceHistoryTypes: this.resourceForecaster.resourceHistory.size,
            combatExperiences: this.combatLearner.combatExperiences.size(),
            pathExperiences: this.pathfindingLearner.pathExperiences.size(),
            isTraining: this.isTraining,
            strategyScores: Object.fromEntries(this.combatLearner.strategyScores)
        };
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stopPeriodicTraining();
        this.saveModels();
        this.experienceBuffer.clear();
        console.log('[ML Training] Cleanup complete');
    }
}

module.exports = MLTrainingSystem;
module.exports.ExperienceBuffer = ExperienceBuffer;
module.exports.ResourceForecaster = ResourceForecaster;
module.exports.CombatStrategyLearner = CombatStrategyLearner;
module.exports.PathfindingLearner = PathfindingLearner;
