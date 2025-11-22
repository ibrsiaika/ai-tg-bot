/**
 * ML Model Training Script - v4.1.0
 * 
 * Trains ML models for decision engine using historical bot data
 * Run with: npm run train-models
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

class ModelTrainer {
    constructor() {
        this.modelsPath = process.env.ML_MODEL_PATH || './models';
        this.trainingDataPath = './training-data';
        
        // Ensure directories exist
        [this.modelsPath, this.trainingDataPath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        this.actionTypes = [
            'mine', 'farm', 'build', 'explore', 'combat',
            'craft', 'smelt', 'rest', 'gather', 'trade'
        ];
    }
    
    /**
     * Main training function
     */
    async train() {
        console.log('========================================');
        console.log('ML Model Training - v4.1.0');
        console.log('========================================\n');
        
        try {
            // Generate synthetic training data if no real data exists
            const hasRealData = this.checkForTrainingData();
            
            if (!hasRealData) {
                console.log('[Training] No training data found, generating synthetic data...');
                await this.generateSyntheticData();
            }
            
            // Train action predictor
            console.log('\n[Training] Training Action Predictor...');
            await this.trainActionPredictor();
            
            // Train resource prioritizer
            console.log('\n[Training] Training Resource Prioritizer...');
            await this.trainResourcePrioritizer();
            
            // Train risk assessor
            console.log('\n[Training] Training Risk Assessor...');
            await this.trainRiskAssessor();
            
            console.log('\n========================================');
            console.log('✓ Training Complete!');
            console.log(`Models saved to: ${this.modelsPath}`);
            console.log('========================================\n');
            
        } catch (error) {
            console.error('\n[Training] Error:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Check for existing training data
     */
    checkForTrainingData() {
        const files = ['actions.json', 'resources.json', 'risks.json'];
        return files.some(file => 
            fs.existsSync(path.join(this.trainingDataPath, file))
        );
    }
    
    /**
     * Generate synthetic training data
     */
    async generateSyntheticData() {
        console.log('[Training] Generating Minecraft-specific training data...');
        
        // Increase sample size for better model quality
        const actionSamples = 2000; // Increased from 1000
        const resourceSamples = 1500; // Increased from 800
        const riskSamples = 1500; // Increased from 800
        
        // Generate action training data
        console.log(`[Training] Generating ${actionSamples} action samples...`);
        const actionData = this.generateActionData(actionSamples);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'actions.json'),
            JSON.stringify(actionData, null, 2)
        );
        console.log(`[Training] ✓ Saved ${actionSamples} action samples`);
        
        // Generate resource training data
        console.log(`[Training] Generating ${resourceSamples} resource samples...`);
        const resourceData = this.generateResourceData(resourceSamples);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'resources.json'),
            JSON.stringify(resourceData, null, 2)
        );
        console.log(`[Training] ✓ Saved ${resourceSamples} resource samples`);
        
        // Generate risk training data
        console.log(`[Training] Generating ${riskSamples} risk samples...`);
        const riskData = this.generateRiskData(riskSamples);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'risks.json'),
            JSON.stringify(riskData, null, 2)
        );
        console.log(`[Training] ✓ Saved ${riskSamples} risk samples`);
        
        console.log('[Training] ✓ All synthetic training data generated');
    }
    
    /**
     * Generate synthetic action data with Minecraft-specific scenarios
     */
    generateActionData(samples) {
        const data = [];
        
        for (let i = 0; i < samples; i++) {
            // Minecraft-specific game state
            const health = Math.random(); // 0-1 (0-20 hearts normalized)
            const food = Math.random(); // 0-1 (0-20 food normalized)
            const inventorySpace = Math.random(); // 0-1 (0-36 slots normalized)
            const hasTools = Math.random() > 0.3;
            const nearbyMobs = Math.floor(Math.random() * 5); // 0-5 mobs
            const timeOfDay = Math.random(); // 0-1 (day=0-0.5, night=0.5-1)
            
            // Minecraft-specific resources
            const hasWood = Math.random() > 0.4;
            const hasStone = Math.random() > 0.5;
            const hasFurnace = Math.random() > 0.6;
            const hasFood = food > 0.4;
            const inDanger = nearbyMobs > 2 || health < 0.4;
            
            // Distance metrics (blocks)
            const distanceToHome = Math.random() * 200; // 0-200 blocks
            const distanceToResource = Math.random() * 100; // 0-100 blocks
            const yLevel = 5 + Math.random() * 60; // Y: 5-65 (mining levels)
            
            // Game progression indicators
            const hasDiamonds = Math.random() > 0.8;
            const hasIronTools = Math.random() > 0.6;
            const hasBase = Math.random() > 0.5;
            
            // Minecraft-specific decision logic
            let action;
            
            // Critical survival situations
            if (health < 0.2 && inDanger) {
                action = 'rest'; // Retreat and heal
            } else if (food < 0.15) {
                action = hasFood ? 'rest' : 'gather'; // Eat or find food
            } 
            // Combat scenarios
            else if (nearbyMobs > 2 && health > 0.6 && hasTools) {
                action = 'combat'; // Fight if strong enough
            } else if (nearbyMobs > 0 && health < 0.5) {
                action = 'rest'; // Retreat if weak
            }
            // Early game progression
            else if (!hasWood) {
                action = 'gather'; // First priority: get wood
            } else if (hasWood && !hasTools) {
                action = 'craft'; // Second priority: make tools
            } else if (hasTools && !hasStone) {
                action = 'mine'; // Third priority: mine stone
            }
            // Mid-game progression
            else if (inventorySpace < 0.2) {
                action = hasBase ? 'build' : 'rest'; // Store items
            } else if (!hasBase && hasStone) {
                action = 'build'; // Build shelter
            } else if (hasBase && !hasFurnace) {
                action = 'craft'; // Craft furnace
            }
            // Mining and exploration
            else if (yLevel < 16 && hasIronTools && !hasDiamonds) {
                action = 'mine'; // Diamond level mining
            } else if (timeOfDay < 0.5 && distanceToResource < 50) {
                action = Math.random() > 0.3 ? 'mine' : 'explore';
            }
            // Farming and sustainable gameplay
            else if (timeOfDay > 0.5 && hasBase) {
                action = 'farm'; // Farm at night when safe
            } else if (distanceToHome > 100) {
                action = 'explore'; // Exploration when far
            }
            // Default balanced actions
            else {
                const rand = Math.random();
                if (rand > 0.7) action = 'mine';
                else if (rand > 0.5) action = 'gather';
                else if (rand > 0.3) action = 'explore';
                else action = 'farm';
            }
            
            // Feature vector matching mlDecisionEngine expectations
            data.push({
                features: [
                    health, food, inventorySpace, hasTools ? 1 : 0,
                    nearbyMobs / 5, timeOfDay, hasWood ? 1 : 0,
                    inDanger ? 1 : 0, distanceToHome / 200,
                    distanceToResource / 100, yLevel / 64, nearbyMobs,
                    hasStone ? 1 : 0, hasIronTools ? 1 : 0,
                    hasBase ? 1 : 0, hasFurnace ? 1 : 0,
                    hasDiamonds ? 1 : 0, distanceToHome, distanceToResource,
                    yLevel
                ],
                label: this.actionTypes.indexOf(action)
            });
        }
        
        return data;
    }
    
    /**
     * Generate synthetic resource data with Minecraft-specific priorities
     */
    generateResourceData(samples) {
        const data = [];
        const resourceTypes = ['wood', 'stone', 'coal', 'iron', 'gold', 'diamond', 'food', 'emerald'];
        
        for (let i = 0; i < samples; i++) {
            // Resource characteristics
            const distance = Math.random() * 100; // blocks away
            const quantity = Math.floor(1 + Math.random() * 10); // 1-10 items
            const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            
            // Bot state
            const health = Math.random();
            const food = Math.random();
            const hasTools = Math.random() > 0.3;
            const inventorySpace = Math.random();
            
            // Environmental factors
            const danger = Math.random(); // 0-1 danger level
            const nearMobs = Math.random() > 0.6;
            const isNight = Math.random() > 0.5;
            const yLevel = Math.random() * 64;
            
            // Minecraft-specific resource values
            let baseValue = 0.3; // default
            if (resourceType === 'diamond') baseValue = 1.0;
            else if (resourceType === 'emerald') baseValue = 0.95;
            else if (resourceType === 'gold') baseValue = 0.7;
            else if (resourceType === 'iron') baseValue = 0.8;
            else if (resourceType === 'coal') baseValue = 0.5;
            else if (resourceType === 'food' && food < 0.3) baseValue = 0.9;
            else if (resourceType === 'wood' && !hasTools) baseValue = 0.85;
            else if (resourceType === 'stone') baseValue = 0.4;
            
            // Current need modifiers
            const needModifier = 
                (resourceType === 'food' && food < 0.3) ? 0.3 :
                (resourceType === 'wood' && !hasTools) ? 0.25 :
                (resourceType === 'coal' && yLevel < 32) ? 0.15 : 0;
            
            // Calculate priority using Minecraft game logic
            const distanceFactor = (1 - distance / 100) * 0.25; // Closer is better
            const quantityFactor = (quantity / 10) * 0.15; // More is better
            const valueFactor = (baseValue + needModifier) * 0.35; // High value/need items
            const safetyFactor = (1 - danger) * 0.15; // Safer is better
            const healthFactor = health * 0.1; // Only gather if healthy
            
            const priority = distanceFactor + quantityFactor + valueFactor + safetyFactor + healthFactor;
            
            // Binary classification: high priority (1) or low priority (0)
            const isHighPriority = priority > 0.55 ? 1 : 0;
            
            data.push({
                features: [
                    distance / 100, // normalized distance
                    quantity / 10, // normalized quantity
                    baseValue, // resource type value
                    health, // bot health
                    food, // bot food
                    inventorySpace, // available space
                    hasTools ? 1 : 0, // has tools
                    danger, // danger level
                    nearMobs ? 1 : 0, // mobs nearby
                    isNight ? 1 : 0, // time of day
                    yLevel / 64, // normalized Y level
                    needModifier, // current need for resource
                    (resourceType === 'diamond' || resourceType === 'emerald') ? 1 : 0, // rare resource
                    (resourceType === 'food') ? 1 : 0, // is food
                    (resourceType === 'wood' || resourceType === 'stone') ? 1 : 0 // basic resource
                ],
                label: isHighPriority
            });
        }
        
        return data;
    }
    
    /**
     * Generate synthetic risk data with Minecraft-specific dangers
     */
    generateRiskData(samples) {
        const data = [];
        const mobTypes = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'none'];
        
        for (let i = 0; i < samples; i++) {
            // Bot state
            const health = Math.random(); // 0-1 (normalized hearts)
            const food = Math.random(); // 0-1 (normalized food)
            const hasArmor = Math.random() > 0.5;
            const hasWeapon = Math.random() > 0.4;
            
            // Threat assessment
            const nearbyMobs = Math.floor(Math.random() * 6); // 0-5 mobs
            const mobType = mobTypes[Math.floor(Math.random() * mobTypes.length)];
            const isNight = Math.random() > 0.5;
            const inCave = Math.random() > 0.6;
            
            // Environmental dangers
            const nearLava = Math.random() > 0.8;
            const nearCliff = Math.random() > 0.7;
            const yLevel = Math.random() * 64; // 0-64
            const lowLight = Math.random() > 0.6;
            
            // Position relative to safety
            const distance = Math.random() * 200; // blocks from home
            const hasEscapeRoute = Math.random() > 0.3;
            
            // Minecraft-specific risk calculation
            let riskScore = 0;
            
            // Health-based risk (40% weight)
            if (health < 0.2) riskScore += 0.4;
            else if (health < 0.4) riskScore += 0.25;
            else if (health < 0.6) riskScore += 0.1;
            
            // Mob threat risk (30% weight)
            if (nearbyMobs > 0) {
                let mobRisk = (nearbyMobs / 5) * 0.2;
                
                // Creeper is extra dangerous
                if (mobType === 'creeper') mobRisk *= 1.5;
                // Enderman can teleport
                else if (mobType === 'enderman') mobRisk *= 1.3;
                // Skeleton has range
                else if (mobType === 'skeleton') mobRisk *= 1.2;
                
                // Reduce risk if well-equipped
                if (hasArmor) mobRisk *= 0.7;
                if (hasWeapon) mobRisk *= 0.8;
                
                riskScore += Math.min(mobRisk, 0.3);
            }
            
            // Environmental risk (20% weight)
            let envRisk = 0;
            if (nearLava) envRisk += 0.1;
            if (nearCliff && health < 0.5) envRisk += 0.05;
            if (yLevel < 11 && !hasArmor) envRisk += 0.03; // Deep mining is risky
            if (lowLight && !inCave) envRisk += 0.02; // Mobs can spawn
            riskScore += Math.min(envRisk, 0.2);
            
            // Distance and escape risk (10% weight)
            let distanceRisk = (distance / 200) * 0.05;
            if (!hasEscapeRoute && nearbyMobs > 2) distanceRisk += 0.05;
            riskScore += Math.min(distanceRisk, 0.1);
            
            // Food starvation risk
            if (food < 0.1) riskScore += 0.1;
            else if (food < 0.3) riskScore += 0.05;
            
            // Night time increases risk slightly
            if (isNight && !inCave) riskScore += 0.05;
            
            // Ensure risk is in [0, 1] range
            riskScore = this.clamp(riskScore, 0, 1);
            
            data.push({
                features: [
                    health, // bot health
                    food, // bot food
                    nearbyMobs / 5, // normalized mob count
                    distance / 200, // normalized distance
                    hasArmor ? 1 : 0, // has protection
                    hasWeapon ? 1 : 0, // has weapon
                    nearLava ? 1 : 0, // environmental danger
                    nearCliff ? 1 : 0, // fall danger
                    yLevel / 64, // normalized Y level
                    isNight ? 1 : 0, // time of day
                    hasEscapeRoute ? 1 : 0, // can escape
                    lowLight ? 1 : 0 // lighting level
                ],
                label: riskScore
            });
        }
        
        return data;
    }
    
    /**
     * Utility function to clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Train action predictor model
     */
    async trainActionPredictor() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'actions.json'))
        );
        
        console.log(`[Training] Loaded ${data.length} action samples`);
        
        const features = data.map(d => d.features);
        const labels = data.map(d => {
            const arr = new Array(this.actionTypes.length).fill(0);
            arr[d.label] = 1;
            return arr;
        });
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
        // Improved model architecture with batch normalization
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [20], units: 128, activation: 'relu' }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dense({ units: this.actionTypes.length, activation: 'softmax' })
            ]
        });
        
        // Use Adam optimizer with learning rate schedule
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('[Training] Training action predictor...');
        console.log('[Training] Model architecture:');
        model.summary();
        
        const history = await model.fit(xs, ys, {
            epochs: 100,
            batchSize: 64,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(
                            `  Epoch ${epoch + 1}/${100}: ` +
                            `loss=${logs.loss.toFixed(4)}, ` +
                            `acc=${logs.acc.toFixed(4)}, ` +
                            `val_loss=${logs.val_loss.toFixed(4)}, ` +
                            `val_acc=${logs.val_acc.toFixed(4)}`
                        );
                    }
                }
            }
        });
        
        const finalMetrics = {
            loss: history.history.loss[history.history.loss.length - 1],
            acc: history.history.acc[history.history.acc.length - 1],
            val_loss: history.history.val_loss[history.history.val_loss.length - 1],
            val_acc: history.history.val_acc[history.history.val_acc.length - 1]
        };
        
        console.log('[Training] Final metrics:', finalMetrics);
        
        // Save model using downloads handler (works in Node.js)
        const saveResults = await model.save(tf.io.withSaveHandler(async (artifacts) => {
            const savePath = path.join(this.modelsPath, 'action-predictor');
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath, { recursive: true });
            }
            
            // Save model topology and weights
            fs.writeFileSync(
                path.join(savePath, 'model.json'),
                JSON.stringify(artifacts.modelTopology)
            );
            
            // Save weights
            const weightsManifest = [{
                paths: ['weights.bin'],
                weights: artifacts.weightSpecs
            }];
            
            fs.writeFileSync(
                path.join(savePath, 'weights.bin'),
                Buffer.from(artifacts.weightData)
            );
            
            fs.writeFileSync(
                path.join(savePath, 'weights_manifest.json'),
                JSON.stringify(weightsManifest)
            );
            
            return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }));
        
        console.log(`  ✓ Saved model to ${path.join(this.modelsPath, 'action-predictor')}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Training accuracy: ${(finalMetrics.acc * 100).toFixed(2)}%`);
        console.log(`  ✓ Validation accuracy: ${(finalMetrics.val_acc * 100).toFixed(2)}%`);
    }
    
    /**
     * Train resource prioritizer model
     */
    async trainResourcePrioritizer() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'resources.json'))
        );
        
        console.log(`[Training] Loaded ${data.length} resource samples`);
        
        const features = data.map(d => d.features);
        const labels = data.map(d => [d.label]);
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
        // Improved architecture for resource prioritization
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu' }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('[Training] Training resource prioritizer...');
        
        const history = await model.fit(xs, ys, {
            epochs: 80,
            batchSize: 64,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(
                            `  Epoch ${epoch + 1}/${80}: ` +
                            `loss=${logs.loss.toFixed(4)}, ` +
                            `acc=${logs.acc.toFixed(4)}, ` +
                            `val_loss=${logs.val_loss.toFixed(4)}, ` +
                            `val_acc=${logs.val_acc.toFixed(4)}`
                        );
                    }
                }
            }
        });
        
        const finalMetrics = {
            loss: history.history.loss[history.history.loss.length - 1],
            acc: history.history.acc[history.history.acc.length - 1],
            val_loss: history.history.val_loss[history.history.val_loss.length - 1],
            val_acc: history.history.val_acc[history.history.val_acc.length - 1]
        };
        
        console.log('[Training] Final metrics:', finalMetrics);
        
        // Save model using custom handler
        await model.save(tf.io.withSaveHandler(async (artifacts) => {
            const savePath = path.join(this.modelsPath, 'resource-prioritizer');
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(savePath, 'model.json'),
                JSON.stringify(artifacts.modelTopology)
            );
            
            const weightsManifest = [{
                paths: ['weights.bin'],
                weights: artifacts.weightSpecs
            }];
            
            fs.writeFileSync(
                path.join(savePath, 'weights.bin'),
                Buffer.from(artifacts.weightData)
            );
            
            fs.writeFileSync(
                path.join(savePath, 'weights_manifest.json'),
                JSON.stringify(weightsManifest)
            );
            
            return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }));
        
        console.log(`  ✓ Saved model to ${path.join(this.modelsPath, 'resource-prioritizer')}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Training accuracy: ${(finalMetrics.acc * 100).toFixed(2)}%`);
        console.log(`  ✓ Validation accuracy: ${(finalMetrics.val_acc * 100).toFixed(2)}%`);
    }
    
    /**
     * Train risk assessor model
     */
    async trainRiskAssessor() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'risks.json'))
        );
        
        console.log(`[Training] Loaded ${data.length} risk samples`);
        
        const features = data.map(d => d.features);
        const labels = data.map(d => [d.label]);
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
        // Improved architecture for risk assessment
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [12], units: 48, activation: 'relu' }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 24, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 12, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanAbsoluteError', // Use MAE for regression - more stable with sigmoid
            metrics: ['mae'] // Use MAE for regression
        });
        
        console.log('[Training] Training risk assessor...');
        
        const history = await model.fit(xs, ys, {
            epochs: 80,
            batchSize: 64,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(
                            `  Epoch ${epoch + 1}/${80}: ` +
                            `loss=${logs.loss.toFixed(4)}, ` +
                            `mae=${logs.mae.toFixed(4)}, ` +
                            `val_loss=${logs.val_loss.toFixed(4)}, ` +
                            `val_mae=${logs.val_mae.toFixed(4)}`
                        );
                    }
                }
            }
        });
        
        const finalMetrics = {
            loss: history.history.loss[history.history.loss.length - 1],
            mae: history.history.mae[history.history.mae.length - 1],
            val_loss: history.history.val_loss[history.history.val_loss.length - 1],
            val_mae: history.history.val_mae[history.history.val_mae.length - 1]
        };
        
        console.log('[Training] Final metrics:', finalMetrics);
        
        // Save model using custom handler
        await model.save(tf.io.withSaveHandler(async (artifacts) => {
            const savePath = path.join(this.modelsPath, 'risk-assessor');
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(savePath, 'model.json'),
                JSON.stringify(artifacts.modelTopology)
            );
            
            const weightsManifest = [{
                paths: ['weights.bin'],
                weights: artifacts.weightSpecs
            }];
            
            fs.writeFileSync(
                path.join(savePath, 'weights.bin'),
                Buffer.from(artifacts.weightData)
            );
            
            fs.writeFileSync(
                path.join(savePath, 'weights_manifest.json'),
                JSON.stringify(weightsManifest)
            );
            
            return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }));
        
        console.log(`  ✓ Saved model to ${path.join(this.modelsPath, 'risk-assessor')}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Mean Absolute Error: ${finalMetrics.mae.toFixed(4)}`);
        console.log(`  ✓ Validation MAE: ${finalMetrics.val_mae.toFixed(4)}`);
    }
}

// Run training
const trainer = new ModelTrainer();
trainer.train()
    .then(() => {
        console.log('Training completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Training failed:', error);
        process.exit(1);
    });
