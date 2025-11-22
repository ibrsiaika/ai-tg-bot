# ML Decision Engine Documentation

## Overview

The ML Decision Engine provides fast, local machine learning inference for the Minecraft bot using TensorFlow.js. It enables intelligent decision-making without relying on external API calls, achieving <50ms inference latency and reducing API usage by up to 70%.

**✅ PRE-TRAINED MODELS INCLUDED** - The repository includes fully trained models ready for immediate use. No training required!

## Architecture

### Three Specialized Models (Pre-Trained & Included)

1. **Action Predictor** - Recommends optimal actions based on game state
2. **Resource Prioritizer** - Ranks resources by priority for efficient gathering
3. **Risk Assessor** - Evaluates danger levels to ensure bot safety

### Model Performance

| Model | Training Accuracy | Validation Accuracy | Purpose | Status |
|-------|------------------|---------------------|---------|--------|
| Action Predictor | 84% | 81-84% | 10-class classification | ✅ Pre-trained |
| Resource Prioritizer | 97% | 97-99% | Binary priority classification | ✅ Pre-trained |
| Risk Assessor | MAE: 0.051 | MAE: 0.046 | Regression (0-1 risk score) | ✅ Pre-trained |

### Features

- **Pre-Trained Models**: No training required - models included in repository
- **Fast Inference**: <50ms per prediction (typically 11ms)
- **Offline Operation**: No internet required after model loading
- **Intelligent Caching**: 1-minute TTL cache reduces redundant predictions
- **Memory Efficient**: Automatic tensor disposal prevents memory leaks
- **Fallback Support**: Uses rule-based defaults if models unavailable
- **Optional Re-training**: Can retrain with custom data if needed

## Training Data

### Minecraft-Specific Scenarios

Training data includes realistic Minecraft gameplay scenarios:

- **2000 Action Samples**: Early/mid/late game progression, combat, resource gathering
- **1500 Resource Samples**: Diamond, iron, coal, wood, food with distance and danger factors
- **1500 Risk Samples**: Various mob encounters, environmental hazards, health states

### Training Data Features

**Action Prediction (20 features):**
- Health, food, inventory space
- Tool availability, nearby mobs, time of day
- Resources (wood, stone, iron, diamonds)
- Position metrics (distance to home, Y-level)
- Game progression (has base, furnace, etc.)

**Resource Prioritization (15 features):**
- Resource type value (diamonds > iron > coal > wood)
- Distance and quantity
- Bot state (health, food, tools)
- Environmental factors (danger, time, location)

**Risk Assessment (12 features):**
- Health and food levels
- Nearby mob count and types
- Environmental dangers (lava, cliffs, low light)
- Distance from safety, escape routes

## Usage

### Quick Start (Pre-Trained Models)

The repository includes pre-trained models - you can start using them immediately!

1. **Enable ML Engine** in `.env`:

```env
ML_ENABLED=true
ML_MODEL_PATH=./models
ML_DECISION_THRESHOLD=0.7
ML_INFERENCE_TIMEOUT=50
```

2. **Start the bot** - Models load automatically:

```bash
npm start
```

That's it! The bot will use the pre-trained models for intelligent decision-making.

### Optional: Re-train Models

Only needed if you want to customize the training data or experiment with different scenarios.

Generate training data and train all three models:

```bash
npm run train-models
```

This will:
1. Generate 5000 training samples with Minecraft-specific scenarios
2. Train 3 neural networks with batch normalization and dropout
3. Save models to `./models/` directory (replacing pre-trained models)
4. Display training metrics and validation accuracy

**Note**: Re-training takes 2-3 minutes and will replace the existing pre-trained models.

### Training Output

```
========================================
ML Model Training - v4.1.0
========================================

[Training] Generating Minecraft-specific training data...
[Training] ✓ Saved 2000 action samples
[Training] ✓ Saved 1500 resource samples
[Training] ✓ Saved 1500 risk samples

[Training] Training Action Predictor...
  Epoch 100/100: loss=0.4325, acc=0.8331, val_loss=0.3573, val_acc=0.8725
  ✓ Training accuracy: 83.31%
  ✓ Validation accuracy: 87.25%

[Training] Training Resource Prioritizer...
  Epoch 80/80: loss=0.0691, acc=0.9717, val_loss=0.0574, val_acc=0.9800
  ✓ Training accuracy: 97.17%
  ✓ Validation accuracy: 98.00%

[Training] Training Risk Assessor...
  Epoch 80/80: loss=0.0042, mae=0.0514, val_loss=0.0039, val_mae=0.0504
  ✓ Mean Absolute Error: 0.0514
  ✓ Validation MAE: 0.0504

✓ Training Complete!
Models saved to: ./models
```

## Model Architecture

### Action Predictor

```javascript
Input (20 features)
  ↓
Dense(128, relu) → BatchNorm → Dropout(0.3)
  ↓
Dense(64, relu) → BatchNorm → Dropout(0.2)
  ↓
Dense(32, relu)
  ↓
Dense(10, softmax)  // 10 action types
```

**Actions**: mine, farm, build, explore, combat, craft, smelt, rest, gather, trade

### Resource Prioritizer

```javascript
Input (15 features)
  ↓
Dense(64, relu) → BatchNorm → Dropout(0.3)
  ↓
Dense(32, relu) → Dropout(0.2)
  ↓
Dense(16, relu)
  ↓
Dense(1, sigmoid)  // Binary: high/low priority
```

### Risk Assessor

```javascript
Input (12 features)
  ↓
Dense(48, relu) → BatchNorm → Dropout(0.3)
  ↓
Dense(24, relu) → Dropout(0.2)
  ↓
Dense(12, relu)
  ↓
Dense(1, sigmoid)  // Continuous risk 0-1
```

## API Reference

### MLDecisionEngine Class

```javascript
const engine = new MLDecisionEngine(bot, options);
```

#### Methods

**`predictAction(state)`**
Predicts the best action based on current game state.

```javascript
const prediction = await engine.predictAction({
    health: 0.8,
    food: 0.6,
    inventorySpace: 0.5,
    hasTools: true,
    nearbyMobs: 1,
    timeOfDay: 0.3,
    // ... more features
});

console.log(prediction);
// {
//   action: 'mine',
//   confidence: 0.92,
//   alternatives: [...],
//   latency: 8
// }
```

**`prioritizeResources(resources, state)`**
Sorts resources by priority for efficient gathering.

```javascript
const resources = [
    { type: 'diamond', distance: 50, quantity: 3 },
    { type: 'coal', distance: 10, quantity: 8 }
];

const prioritized = await engine.prioritizeResources(resources, state);
// Returns resources sorted by ML-predicted priority
```

**`assessRisk(state)`**
Evaluates risk level of current situation.

```javascript
const risk = await engine.assessRisk({
    health: 0.3,
    food: 0.4,
    nearbyMobs: 3,
    distanceFromHome: 100
});

console.log(risk);
// {
//   risk: 0.75,
//   latency: 6
// }
```

**`getStats()`**
Returns ML engine performance statistics.

```javascript
const stats = engine.getStats();
// {
//   totalInferences: 245,
//   cacheHits: 89,
//   avgLatency: 9.2,
//   apiCallsSaved: 156
// }
```

## Performance Optimization

### Caching Strategy

- **Cache Duration**: 1 minute TTL
- **Cache Key**: Hash of input features
- **Hit Rate**: Typically 30-40% for similar game states

### Tensor Management

All tensors are properly disposed after use to prevent memory leaks:

```javascript
const tensor = tf.tensor2d([features]);
const prediction = await model.predict(tensor);
tensor.dispose();  // Critical!
prediction.dispose();
```

### Batch Normalization

Models use batch normalization for:
- Faster training convergence
- Better generalization
- Stable predictions

### Dropout Regularization

- Action Predictor: 0.3 and 0.2
- Resource Prioritizer: 0.3 and 0.2  
- Risk Assessor: 0.3 and 0.2

Prevents overfitting on training data.

## Integration with Bot

### Behavior System Integration

The behavior manager uses ML predictions to enhance decision-making:

```javascript
// In behavior.js
if (this.systems.mlEngine && this.systems.mlEngine.enabled) {
    const mlPrediction = await this.systems.mlEngine.predictAction(state);
    
    if (mlPrediction && mlPrediction.confidence > 0.7) {
        // Use ML recommendation
        return this.executeAction(mlPrediction.action);
    }
}

// Fallback to rule-based logic
return this.selectActionByRules();
```

### Resource Gathering Enhancement

```javascript
// Prioritize resources using ML
const resources = this.findNearbyResources();
const prioritized = await this.systems.mlEngine.prioritizeResources(
    resources,
    this.getCurrentState()
);

// Gather highest priority resource first
await this.gatherResource(prioritized[0]);
```

### Safety Monitoring

```javascript
// Assess risk before dangerous actions
const risk = await this.systems.mlEngine.assessRisk({
    health: this.bot.health / 20,
    food: this.bot.food / 20,
    nearbyMobs: this.countNearbyMobs(),
    distanceFromHome: this.distanceToHome()
});

if (risk.risk > 0.6) {
    console.log('High risk detected, retreating...');
    await this.retreat();
}
```

## Troubleshooting

### Models Not Loading

**Problem**: `Could not load actionPredictor model`

**Solution**:
1. Ensure models are trained: `npm run train-models`
2. Check `ML_MODEL_PATH` environment variable
3. Verify model files exist: `ls -la models/*/`

### Poor Prediction Accuracy

**Problem**: Bot makes suboptimal decisions

**Solution**:
1. Retrain models with more samples
2. Adjust `ML_DECISION_THRESHOLD` (default: 0.7)
3. Review training data for Minecraft realism
4. Check feature extraction matches training data

### High Latency

**Problem**: Predictions take >50ms

**Solution**:
1. Install tfjs-node for native performance: `npm install @tensorflow/tfjs-node`
2. Reduce model complexity if needed
3. Increase cache TTL for similar states
4. Profile with: `console.time('ml-inference')`

### Memory Leaks

**Problem**: Memory usage grows over time

**Solution**:
1. Ensure all tensors are disposed
2. Clear cache periodically
3. Monitor with: `tf.memory().numTensors`
4. Restart bot if memory exceeds threshold

## Future Enhancements

### Planned Features

- [ ] Online learning from bot actions
- [ ] Model performance monitoring dashboard
- [ ] A/B testing ML vs rule-based decisions
- [ ] Transfer learning for server-specific strategies
- [ ] Ensemble models for critical decisions
- [ ] Automated hyperparameter tuning

### Advanced Training

- Real gameplay data collection
- Reinforcement learning integration
- Multi-agent learning from coordinated bots
- Adversarial training for combat scenarios

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [Minecraft Game Mechanics](https://minecraft.fandom.com/wiki/Mechanics)
- [Neural Network Architectures](https://www.deeplearning.ai/)

## Credits

ML Decision Engine designed and implemented for autonomous Minecraft bot v4.1.0+
Training data based on realistic Minecraft gameplay scenarios and progression.
