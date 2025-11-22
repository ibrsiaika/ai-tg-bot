/**
 * ML Decision Engine - v4.1.0
 * 
 * Local AI decision-making using TensorFlow.js for fast, offline inference
 * Target: <50ms decision latency, 70% API call reduction
 * 
 * Features:
 * - Action prediction (mining, farming, building, combat, etc.)
 * - Resource prioritization
 * - Risk assessment
 * - Optimal tool selection
 * - Path efficiency prediction
 */

const tf = require('@tensorflow/tfjs');
const EventBus = require('./eventBus');
const path = require('path');
const fs = require('fs');

class MLDecisionEngine {
    constructor(bot, options = {}) {
        this.bot = bot;
        this.enabled = process.env.ML_ENABLED === 'true';
        this.modelPath = process.env.ML_MODEL_PATH || './models';
        this.decisionThreshold = parseFloat(process.env.ML_DECISION_THRESHOLD) || 0.7;
        this.inferenceTimeout = parseInt(process.env.ML_INFERENCE_TIMEOUT) || 50;
        
        this.models = {
            actionPredictor: null,
            resourcePrioritizer: null,
            riskAssessor: null
        };
        
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
        
        this.stats = {
            totalInferences: 0,
            cacheHits: 0,
            avgLatency: 0,
            apiCallsSaved: 0
        };
        
        this.actionTypes = [
            'mine', 'farm', 'build', 'explore', 'combat',
            'craft', 'smelt', 'rest', 'gather', 'trade'
        ];
        
        this.initialized = false;
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    /**
     * Initialize ML models
     */
    async initialize() {
        try {
            console.log('[ML Engine] Initializing...');
            
            // Load pre-trained models if they exist
            await this.loadModels();
            
            // If models don't exist, create simple default models
            if (!this.models.actionPredictor) {
                this.models.actionPredictor = this.createDefaultActionModel();
            }
            
            if (!this.models.resourcePrioritizer) {
                this.models.resourcePrioritizer = this.createDefaultResourceModel();
            }
            
            if (!this.models.riskAssessor) {
                this.models.riskAssessor = this.createDefaultRiskModel();
            }
            
            this.initialized = true;
            console.log('[ML Engine] ✓ Initialized successfully');
            
            // Emit event only if EventBus is available
            if (EventBus && typeof EventBus.emit === 'function') {
                EventBus.emit('ml:initialized', {
                    timestamp: Date.now(),
                    modelsLoaded: Object.keys(this.models).length
                });
            }
            
        } catch (error) {
            console.error('[ML Engine] Initialization error:', error.message);
            this.enabled = false;
        }
    }
    
    /**
     * Load pre-trained models from disk
     */
    async loadModels() {
        const modelDirs = {
            actionPredictor: path.join(this.modelPath, 'action-predictor'),
            resourcePrioritizer: path.join(this.modelPath, 'resource-prioritizer'),
            riskAssessor: path.join(this.modelPath, 'risk-assessor')
        };
        
        for (const [name, modelDir] of Object.entries(modelDirs)) {
            try {
                const modelPath = path.join(modelDir, 'model.json');
                const weightsPath = path.join(modelDir, 'weights.bin');
                
                if (fs.existsSync(modelPath) && fs.existsSync(weightsPath)) {
                    // Create custom IOHandler
                    const ioHandler = {
                        load: async () => {
                            const modelTopology = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
                            const weightData = new Uint8Array(fs.readFileSync(weightsPath)).buffer;
                            const weightsManifest = JSON.parse(
                                fs.readFileSync(path.join(modelDir, 'weights_manifest.json'), 'utf8')
                            );
                            
                            return {
                                modelTopology,
                                weightSpecs: weightsManifest[0].weights,
                                weightData
                            };
                        }
                    };
                    
                    this.models[name] = await tf.loadLayersModel(ioHandler);
                    console.log(`[ML Engine] ✓ Loaded ${name} model from ${modelDir}`);
                }
            } catch (error) {
                console.log(`[ML Engine] Could not load ${name} model:`, error.message);
            }
        }
    }
    
    /**
     * Create default action prediction model
     */
    createDefaultActionModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dense({ units: this.actionTypes.length, activation: 'softmax' })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Create default resource prioritization model
     */
    createDefaultResourceModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [15], units: 32, activation: 'relu' }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Create default risk assessment model
     */
    createDefaultRiskModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [12], units: 24, activation: 'relu' }),
                tf.layers.dense({ units: 12, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Predict best action based on current state
     * @param {Object} state - Current bot state
     * @returns {Promise<Object>} Predicted action and confidence
     */
    async predictAction(state) {
        if (!this.enabled || !this.initialized) {
            return null;
        }
        
        const cacheKey = this.getCacheKey('action', state);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }
        
        const startTime = Date.now();
        
        try {
            const features = this.extractActionFeatures(state);
            const tensorInput = tf.tensor2d([features]);
            
            const prediction = await this.models.actionPredictor.predict(tensorInput);
            const probabilities = await prediction.data();
            
            tensorInput.dispose();
            prediction.dispose();
            
            const maxIndex = probabilities.indexOf(Math.max(...probabilities));
            const confidence = probabilities[maxIndex];
            
            const result = {
                action: this.actionTypes[maxIndex],
                confidence: confidence,
                alternatives: this.getAlternatives(probabilities),
                latency: Date.now() - startTime
            };
            
            this.updateStats(result.latency);
            this.addToCache(cacheKey, result);
            
            if (result.latency < this.inferenceTimeout) {
                this.stats.apiCallsSaved++;
            }
            
            // Emit event only if EventBus is available
            if (EventBus && typeof EventBus.emit === 'function') {
                EventBus.emit('ml:prediction', {
                    type: 'action',
                    result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('[ML Engine] Action prediction error:', error.message);
            return null;
        }
    }
    
    /**
     * Prioritize resources based on current needs
     * @param {Array} resources - Available resources
     * @param {Object} state - Current state
     * @returns {Promise<Array>} Sorted resources by priority
     */
    async prioritizeResources(resources, state) {
        if (!this.enabled || !this.initialized || !resources.length) {
            return resources;
        }
        
        const startTime = Date.now();
        
        try {
            const scored = await Promise.all(resources.map(async (resource) => {
                const features = this.extractResourceFeatures(resource, state);
                const tensorInput = tf.tensor2d([features]);
                
                const prediction = await this.models.resourcePrioritizer.predict(tensorInput);
                const score = (await prediction.data())[0];
                
                tensorInput.dispose();
                prediction.dispose();
                
                return { resource, score };
            }));
            
            scored.sort((a, b) => b.score - a.score);
            
            const latency = Date.now() - startTime;
            this.updateStats(latency);
            
            return scored.map(s => s.resource);
            
        } catch (error) {
            console.error('[ML Engine] Resource prioritization error:', error.message);
            return resources;
        }
    }
    
    /**
     * Assess risk level of a proposed action
     * @param {Object} action - Proposed action
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Risk assessment
     */
    async assessRisk(action, state) {
        if (!this.enabled || !this.initialized) {
            return { risk: 0.5, confidence: 0 };
        }
        
        const cacheKey = this.getCacheKey('risk', { action, state });
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }
        
        const startTime = Date.now();
        
        try {
            const features = this.extractRiskFeatures(action, state);
            const tensorInput = tf.tensor2d([features]);
            
            const prediction = await this.models.riskAssessor.predict(tensorInput);
            const riskScore = (await prediction.data())[0];
            
            tensorInput.dispose();
            prediction.dispose();
            
            const result = {
                risk: riskScore,
                level: this.getRiskLevel(riskScore),
                latency: Date.now() - startTime
            };
            
            this.updateStats(result.latency);
            this.addToCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('[ML Engine] Risk assessment error:', error.message);
            return { risk: 0.5, level: 'medium' };
        }
    }
    
    /**
     * Extract features for action prediction
     */
    extractActionFeatures(state) {
        return [
            state.health || 0,
            state.food || 0,
            state.inventorySpace || 0,
            state.hasTools ? 1 : 0,
            state.nearbyMobs || 0,
            state.timeOfDay || 0,
            state.weatherClear ? 1 : 0,
            state.inDanger ? 1 : 0,
            state.woodCount || 0,
            state.stoneCount || 0,
            state.coalCount || 0,
            state.ironCount || 0,
            state.diamondCount || 0,
            state.foodCount || 0,
            state.hasBase ? 1 : 0,
            state.hasFarm ? 1 : 0,
            state.explorationProgress || 0,
            state.miningDepth || 0,
            state.distanceFromHome || 0,
            state.toolDurability || 1
        ];
    }
    
    /**
     * Extract features for resource prioritization
     */
    extractResourceFeatures(resource, state) {
        return [
            resource.distance || 0,
            resource.quantity || 1,
            resource.value || 1,
            state.health || 0,
            state.food || 0,
            state.inventorySpace || 0,
            state.urgencyLevel || 0,
            resource.accessibility || 1,
            resource.danger || 0,
            state.currentGoal === resource.type ? 1 : 0,
            state.toolAvailable ? 1 : 0,
            state.weatherSafe ? 1 : 0,
            state.timeOfDay || 0,
            resource.renewable ? 1 : 0,
            resource.essential ? 1 : 0
        ];
    }
    
    /**
     * Extract features for risk assessment
     */
    extractRiskFeatures(action, state) {
        return [
            state.health || 0,
            state.food || 0,
            state.nearbyMobs || 0,
            state.distanceFromHome || 0,
            action.requiresTools ? 1 : 0,
            action.duration || 0,
            state.hasEscape ? 1 : 0,
            state.weatherDangerous ? 1 : 0,
            state.timeOfDay || 0,
            action.environmentalRisk || 0,
            state.toolDurability || 1,
            state.hasBackup ? 1 : 0
        ];
    }
    
    /**
     * Get alternative actions from probabilities
     */
    getAlternatives(probabilities) {
        const indexed = probabilities.map((prob, idx) => ({ 
            action: this.actionTypes[idx], 
            confidence: prob 
        }));
        indexed.sort((a, b) => b.confidence - a.confidence);
        return indexed.slice(1, 4); // Top 3 alternatives
    }
    
    /**
     * Get risk level label
     */
    getRiskLevel(score) {
        if (score < 0.3) return 'low';
        if (score < 0.6) return 'medium';
        if (score < 0.8) return 'high';
        return 'critical';
    }
    
    /**
     * Cache management
     */
    getCacheKey(type, data) {
        return `${type}:${JSON.stringify(data)}`;
    }
    
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
            return entry.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, 20);
            oldest.forEach(([key]) => this.cache.delete(key));
        }
    }
    
    /**
     * Update statistics
     */
    updateStats(latency) {
        this.stats.totalInferences++;
        this.stats.avgLatency = 
            (this.stats.avgLatency * (this.stats.totalInferences - 1) + latency) / 
            this.stats.totalInferences;
    }
    
    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.totalInferences > 0 
                ? (this.stats.cacheHits / this.stats.totalInferences * 100).toFixed(2) + '%'
                : '0%',
            apiReduction: this.stats.totalInferences > 0
                ? (this.stats.apiCallsSaved / this.stats.totalInferences * 100).toFixed(2) + '%'
                : '0%',
            avgLatencyMs: this.stats.avgLatency.toFixed(2),
            targetMet: this.stats.avgLatency < this.inferenceTimeout
        };
    }
    
    /**
     * Save models to disk
     */
    async saveModels() {
        if (!this.initialized) return;
        
        try {
            if (!fs.existsSync(this.modelPath)) {
                fs.mkdirSync(this.modelPath, { recursive: true });
            }
            
            for (const [name, model] of Object.entries(this.models)) {
                if (model) {
                    const savePath = path.join(this.modelPath, name);
                    await model.save(`file://${savePath}`);
                    console.log(`[ML Engine] Saved ${name} model`);
                }
            }
        } catch (error) {
            console.error('[ML Engine] Error saving models:', error.message);
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.saveModels();
            
            // Dispose tensors
            for (const model of Object.values(this.models)) {
                if (model) {
                    model.dispose();
                }
            }
            
            this.cache.clear();
            this.initialized = false;
            
            console.log('[ML Engine] Cleanup complete');
        } catch (error) {
            console.error('[ML Engine] Cleanup error:', error.message);
        }
    }
}

module.exports = MLDecisionEngine;
