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
        // Generate action training data
        const actionData = this.generateActionData(1000);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'actions.json'),
            JSON.stringify(actionData, null, 2)
        );
        
        // Generate resource training data
        const resourceData = this.generateResourceData(800);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'resources.json'),
            JSON.stringify(resourceData, null, 2)
        );
        
        // Generate risk training data
        const riskData = this.generateRiskData(800);
        fs.writeFileSync(
            path.join(this.trainingDataPath, 'risks.json'),
            JSON.stringify(riskData, null, 2)
        );
        
        console.log('[Training] ✓ Generated synthetic training data');
    }
    
    /**
     * Generate synthetic action data
     */
    generateActionData(samples) {
        const data = [];
        
        for (let i = 0; i < samples; i++) {
            const health = Math.random();
            const food = Math.random();
            const inventorySpace = Math.random();
            const hasTools = Math.random() > 0.3;
            const nearbyMobs = Math.floor(Math.random() * 5);
            const timeOfDay = Math.random();
            
            // Rule-based action selection for training
            let action;
            if (health < 0.3 || food < 0.2) {
                action = nearbyMobs > 0 ? 'rest' : 'gather';
            } else if (nearbyMobs > 2) {
                action = health > 0.6 ? 'combat' : 'rest';
            } else if (!hasTools) {
                action = 'craft';
            } else if (inventorySpace < 0.2) {
                action = 'build';
            } else if (timeOfDay < 0.5) {
                action = Math.random() > 0.5 ? 'mine' : 'explore';
            } else {
                action = Math.random() > 0.5 ? 'farm' : 'gather';
            }
            
            data.push({
                features: [
                    health, food, inventorySpace, hasTools ? 1 : 0,
                    nearbyMobs / 5, timeOfDay, Math.random() > 0.3 ? 1 : 0,
                    nearbyMobs > 0 ? 1 : 0, Math.random() * 64,
                    Math.random() * 64, Math.random() * 64, Math.random() * 16,
                    Math.random() * 4, Math.random() * 20,
                    Math.random() > 0.5 ? 1 : 0, Math.random() > 0.7 ? 1 : 0,
                    Math.random(), Math.random() * 128, Math.random() * 200,
                    Math.random()
                ],
                label: this.actionTypes.indexOf(action)
            });
        }
        
        return data;
    }
    
    /**
     * Generate synthetic resource data
     */
    generateResourceData(samples) {
        const data = [];
        
        for (let i = 0; i < samples; i++) {
            const distance = Math.random() * 100;
            const quantity = Math.random() * 10;
            const value = Math.random();
            const health = Math.random();
            const danger = Math.random();
            
            // Higher priority for closer, more valuable, safer resources
            const priority = 
                (1 - distance / 100) * 0.3 +
                (quantity / 10) * 0.2 +
                value * 0.3 +
                (1 - danger) * 0.2;
            
            data.push({
                features: [
                    distance / 100, quantity / 10, value, health,
                    Math.random(), Math.random(), Math.random(),
                    Math.random(), danger, Math.random() > 0.5 ? 1 : 0,
                    Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0,
                    Math.random(), Math.random() > 0.5 ? 1 : 0,
                    Math.random() > 0.5 ? 1 : 0
                ],
                label: priority > 0.5 ? 1 : 0
            });
        }
        
        return data;
    }
    
    /**
     * Generate synthetic risk data
     */
    generateRiskData(samples) {
        const data = [];
        
        for (let i = 0; i < samples; i++) {
            const health = Math.random();
            const food = Math.random();
            const nearbyMobs = Math.random() * 5;
            const distance = Math.random() * 200;
            
            // Higher risk with low health, many mobs, far from home
            const risk =
                (1 - health) * 0.4 +
                (nearbyMobs / 5) * 0.3 +
                (distance / 200) * 0.2 +
                (1 - food) * 0.1;
            
            data.push({
                features: [
                    health, food, nearbyMobs / 5, distance / 200,
                    Math.random() > 0.5 ? 1 : 0, Math.random(),
                    Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0,
                    Math.random(), Math.random(), Math.random(),
                    Math.random() > 0.5 ? 1 : 0
                ],
                label: Math.min(1, risk)
            });
        }
        
        return data;
    }
    
    /**
     * Train action predictor model
     */
    async trainActionPredictor() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'actions.json'))
        );
        
        const features = data.map(d => d.features);
        const labels = data.map(d => {
            const arr = new Array(this.actionTypes.length).fill(0);
            arr[d.label] = 1;
            return arr;
        });
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
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
        
        await model.fit(xs, ys, {
            epochs: 50,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(`  Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}`);
                    }
                }
            }
        });
        
        const savePath = path.join(this.modelsPath, 'action-predictor');
        await model.save(`file://${savePath}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Saved to ${savePath}`);
    }
    
    /**
     * Train resource prioritizer model
     */
    async trainResourcePrioritizer() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'resources.json'))
        );
        
        const features = data.map(d => d.features);
        const labels = data.map(d => [d.label]);
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
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
        
        await model.fit(xs, ys, {
            epochs: 40,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(`  Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}`);
                    }
                }
            }
        });
        
        const savePath = path.join(this.modelsPath, 'resource-prioritizer');
        await model.save(`file://${savePath}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Saved to ${savePath}`);
    }
    
    /**
     * Train risk assessor model
     */
    async trainRiskAssessor() {
        const data = JSON.parse(
            fs.readFileSync(path.join(this.trainingDataPath, 'risks.json'))
        );
        
        const features = data.map(d => d.features);
        const labels = data.map(d => [d.label]);
        
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(labels);
        
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
        
        await model.fit(xs, ys, {
            epochs: 40,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if ((epoch + 1) % 10 === 0) {
                        console.log(`  Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}`);
                    }
                }
            }
        });
        
        const savePath = path.join(this.modelsPath, 'risk-assessor');
        await model.save(`file://${savePath}`);
        
        xs.dispose();
        ys.dispose();
        model.dispose();
        
        console.log(`  ✓ Saved to ${savePath}`);
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
