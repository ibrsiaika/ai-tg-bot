const Vec3 = require('vec3');

/**
 * Advanced Intelligence System - The "Brain" of the Minecraft Bot
 * Provides strategic planning, learning, memory, and decision optimization
 */
class IntelligenceSystem {
    constructor(bot, notifier) {
        this.bot = bot;
        this.notifier = notifier;
        
        // Configuration constants
        this.MAX_RESOURCE_LOCATIONS = 50;
        this.MAX_ACTION_HISTORY = 1000;
        this.DANGER_ZONE_EXPIRY_MS = 600000; // 10 minutes
        this.NEUTRAL_CONFIDENCE_SCORE = 0.5; // Default confidence for untested actions
        this.REWARD_NORMALIZER = 10; // For normalizing rewards in confidence calculation
        
        // Memory systems
        this.worldKnowledge = {
            resourceLocations: new Map(), // resource_type -> [{position, timestamp, quantity}]
            dangerZones: new Map(), // position_key -> {type, severity, timestamp}
            safeZones: [], // [{position, radius, timestamp}]
            structureLocations: new Map() // structure_type -> [{position, value, timestamp}]
        };
        
        // Learning system
        this.actionHistory = [];
        this.strategySuccess = new Map(); // strategy_name -> {attempts, successes, avgReward}
        
        // Decision confidence
        this.confidenceThreshold = 0.6;
        
        // Resource prediction
        this.resourceNeeds = {
            wood: { current: 0, targetMin: 64, priority: 0.8 },
            stone: { current: 0, targetMin: 128, priority: 0.7 },
            iron: { current: 0, targetMin: 32, priority: 0.9 },
            diamond: { current: 0, targetMin: 3, priority: 1.0 },
            food: { current: 0, targetMin: 32, priority: 0.95 },
            coal: { current: 0, targetMin: 64, priority: 0.6 }
        };
        
        // Long-term planning
        this.longTermGoals = [];
        this.achievedMilestones = [];
        
        console.log('Advanced Intelligence System initialized');
    }

    /**
     * Remember a resource location for future use
     */
    rememberResourceLocation(resourceType, position, quantity = 1) {
        if (!this.worldKnowledge.resourceLocations.has(resourceType)) {
            this.worldKnowledge.resourceLocations.set(resourceType, []);
        }
        
        const locations = this.worldKnowledge.resourceLocations.get(resourceType);
        locations.push({
            position: position.clone(),
            timestamp: Date.now(),
            quantity: quantity
        });
        
        // Keep only recent locations
        if (locations.length > this.MAX_RESOURCE_LOCATIONS) {
            locations.shift();
        }
        
        console.log(`Remembered ${resourceType} location at ${position.toString()}`);
    }

    /**
     * Find the nearest known location of a resource
     */
    findNearestKnownResource(resourceType, maxAge = 600000) {
        const locations = this.worldKnowledge.resourceLocations.get(resourceType);
        if (!locations || locations.length === 0) {
            return null;
        }
        
        const now = Date.now();
        const currentPos = this.bot.entity.position;
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const loc of locations) {
            // Skip old locations
            if (now - loc.timestamp > maxAge) continue;
            
            const distance = currentPos.distanceTo(loc.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = loc;
            }
        }
        
        return nearest;
    }

    /**
     * Mark a dangerous area to avoid
     */
    markDangerZone(position, dangerType, severity = 1.0) {
        const key = `${Math.floor(position.x / 16)},${Math.floor(position.z / 16)}`;
        
        this.worldKnowledge.dangerZones.set(key, {
            type: dangerType,
            severity: severity,
            timestamp: Date.now(),
            position: position.clone()
        });
        
        console.log(`Marked danger zone: ${dangerType} at ${position.toString()}`);
    }

    /**
     * Check if a position is in a known danger zone
     */
    isInDangerZone(position) {
        const key = `${Math.floor(position.x / 16)},${Math.floor(position.z / 16)}`;
        const danger = this.worldKnowledge.dangerZones.get(key);
        
        if (!danger) return null;
        
        // Danger zones expire after configured time
        if (Date.now() - danger.timestamp > this.DANGER_ZONE_EXPIRY_MS) {
            this.worldKnowledge.dangerZones.delete(key);
            return null;
        }
        
        return danger;
    }

    /**
     * Record an action and its outcome for learning
     */
    recordAction(actionName, success, reward = 0) {
        this.actionHistory.push({
            action: actionName,
            success: success,
            reward: reward,
            timestamp: Date.now()
        });
        
        // Update strategy success tracking
        if (!this.strategySuccess.has(actionName)) {
            this.strategySuccess.set(actionName, {
                attempts: 0,
                successes: 0,
                avgReward: 0,
                totalReward: 0
            });
        }
        
        const stats = this.strategySuccess.get(actionName);
        stats.attempts++;
        if (success) stats.successes++;
        stats.totalReward += reward;
        stats.avgReward = stats.totalReward / stats.attempts;
        
        // Keep action history limited
        if (this.actionHistory.length > this.MAX_ACTION_HISTORY) {
            this.actionHistory.shift();
        }
    }

    /**
     * Calculate confidence score for an action based on past performance
     */
    getActionConfidence(actionName) {
        const stats = this.strategySuccess.get(actionName);
        if (!stats || stats.attempts < 3) {
            return this.NEUTRAL_CONFIDENCE_SCORE; // Neutral confidence for new actions
        }
        
        const successRate = stats.successes / stats.attempts;
        const rewardFactor = Math.min(stats.avgReward / this.REWARD_NORMALIZER, 1.0);
        
        return (successRate * 0.7) + (rewardFactor * 0.3);
    }

    /**
     * Calculate confidence score for gathering a specific resource
     * Used by AI Orchestrator to determine if we should consult AI
     */
    getConfidence(resourceType) {
        if (!resourceType) {
            return this.NEUTRAL_CONFIDENCE_SCORE;
        }
        
        let confidence = this.NEUTRAL_CONFIDENCE_SCORE;
        
        // Factor 1: Do we know where to find this resource? (40% weight)
        const knownLocations = this.worldKnowledge.resourceLocations.get(resourceType);
        if (knownLocations && knownLocations.length > 0) {
            // More known locations = higher confidence
            const locationFactor = Math.min(knownLocations.length / 10, 1.0);
            confidence += locationFactor * 0.4;
        } else {
            // No known locations reduces confidence
            confidence -= 0.2;
        }
        
        // Factor 2: Success rate of gathering this resource (40% weight)
        const gatherActionName = `gather_${resourceType}`;
        const actionConfidence = this.getActionConfidence(gatherActionName);
        if (actionConfidence !== this.NEUTRAL_CONFIDENCE_SCORE) {
            // We have experience with this resource
            confidence += (actionConfidence - this.NEUTRAL_CONFIDENCE_SCORE) * 0.4;
        }
        
        // Factor 3: How much we need it affects confidence (20% weight)
        const resourceData = this.resourceNeeds[resourceType];
        if (resourceData) {
            const needRatio = resourceData.current / resourceData.targetMin;
            if (needRatio < 0.5) {
                // We really need it, but low stock means lower confidence we can get it easily
                confidence -= 0.1;
            } else if (needRatio > 1.5) {
                // We have plenty, high confidence we can get more
                confidence += 0.1;
            }
        }
        
        // Ensure confidence is in valid range [0, 1]
        return Math.max(0, Math.min(1.0, confidence));
    }

    /**
     * Assess risk of a proposed action
     */
    assessRisk(actionType, targetPosition) {
        let riskScore = 0.0;
        
        // Check if target is in danger zone
        if (targetPosition) {
            const danger = this.isInDangerZone(targetPosition);
            if (danger) {
                riskScore += danger.severity * 0.5;
            }
            
            // Distance risk (farther = riskier)
            const distance = this.bot.entity.position.distanceTo(targetPosition);
            riskScore += Math.min(distance / 500, 0.3);
        }
        
        // Health risk
        const healthPercent = this.bot.health / 20;
        if (healthPercent < 0.5) {
            riskScore += (1.0 - healthPercent) * 0.3;
        }
        
        // Time of day risk (night is riskier)
        const timeOfDay = this.bot.time.timeOfDay;
        const isNight = timeOfDay > 13000 && timeOfDay < 23000;
        if (isNight && actionType === 'explore') {
            riskScore += 0.2;
        }
        
        return Math.min(riskScore, 1.0);
    }

    /**
     * Update current resource inventory status
     */
    updateResourceStatus(inventoryManager) {
        const inventory = this.bot.inventory.items();
        
        // Count wood (logs)
        this.resourceNeeds.wood.current = inventory
            .filter(i => i.name.includes('log'))
            .reduce((sum, i) => sum + i.count, 0);
        
        // Count stone
        this.resourceNeeds.stone.current = inventory
            .filter(i => i.name.includes('stone') || i.name === 'cobblestone')
            .reduce((sum, i) => sum + i.count, 0);
        
        // Count iron
        this.resourceNeeds.iron.current = inventory
            .filter(i => i.name === 'iron_ingot' || i.name === 'iron_ore')
            .reduce((sum, i) => sum + i.count, 0);
        
        // Count diamond
        this.resourceNeeds.diamond.current = inventory
            .filter(i => i.name === 'diamond' || i.name === 'diamond_ore')
            .reduce((sum, i) => sum + i.count, 0);
        
        // Count food
        this.resourceNeeds.food.current = inventory
            .filter(i => this.isFood(i.name))
            .reduce((sum, i) => sum + i.count, 0);
        
        // Count coal
        this.resourceNeeds.coal.current = inventory
            .filter(i => i.name === 'coal' || i.name === 'coal_ore')
            .reduce((sum, i) => sum + i.count, 0);
    }

    /**
     * Calculate priority for each resource based on current needs
     */
    calculateResourcePriorities() {
        const priorities = {};
        
        for (const [resource, data] of Object.entries(this.resourceNeeds)) {
            const shortage = Math.max(0, data.targetMin - data.current);
            const shortageRatio = shortage / data.targetMin;
            
            // Priority increases with shortage and base priority
            priorities[resource] = shortageRatio * data.priority;
        }
        
        return priorities;
    }

    /**
     * Get the most needed resource
     */
    getMostNeededResource() {
        const priorities = this.calculateResourcePriorities();
        
        let maxPriority = 0;
        let mostNeeded = null;
        
        for (const [resource, priority] of Object.entries(priorities)) {
            if (priority > maxPriority) {
                maxPriority = priority;
                mostNeeded = resource;
            }
        }
        
        return { resource: mostNeeded, priority: maxPriority };
    }

    /**
     * Add a long-term goal to the planning system
     */
    addLongTermGoal(goalName, priority, requirements) {
        this.longTermGoals.push({
            name: goalName,
            priority: priority,
            requirements: requirements,
            progress: 0,
            addedTime: Date.now()
        });
        
        // Sort by priority
        this.longTermGoals.sort((a, b) => b.priority - a.priority);
        
        console.log(`Added long-term goal: ${goalName} (priority: ${priority})`);
    }

    /**
     * Get the next long-term goal to work towards
     */
    getNextLongTermGoal() {
        if (this.longTermGoals.length === 0) {
            return null;
        }
        
        // Return highest priority goal that's not completed
        for (const goal of this.longTermGoals) {
            if (goal.progress < 1.0) {
                return goal;
            }
        }
        
        return null;
    }

    /**
     * Mark a milestone as achieved
     */
    async achieveMilestone(milestoneName) {
        this.achievedMilestones.push({
            name: milestoneName,
            timestamp: Date.now()
        });
        
        console.log(`Milestone achieved: ${milestoneName}`);
        await this.notifier.send(`🎯 Milestone: ${milestoneName}`);
    }

    /**
     * Get intelligence statistics
     */
    getStats() {
        return {
            knownResourceLocations: Array.from(this.worldKnowledge.resourceLocations.entries())
                .reduce((sum, [_, locs]) => sum + locs.length, 0),
            dangerZones: this.worldKnowledge.dangerZones.size,
            safeZones: this.worldKnowledge.safeZones.length,
            actionsRecorded: this.actionHistory.length,
            strategiesLearned: this.strategySuccess.size,
            longTermGoals: this.longTermGoals.length,
            milestonesAchieved: this.achievedMilestones.length
        };
    }

    /**
     * Generate an intelligence report
     */
    async generateReport() {
        const stats = this.getStats();
        const mostNeeded = this.getMostNeededResource();
        
        const report = `
🧠 Intelligence Report:
━━━━━━━━━━━━━━━━━━
📍 Known Locations: ${stats.knownResourceLocations}
⚠️  Danger Zones: ${stats.dangerZones}
✅ Safe Zones: ${stats.safeZones}
📚 Actions Learned: ${stats.actionsRecorded}
🎯 Active Goals: ${stats.longTermGoals}
🏆 Milestones: ${stats.milestonesAchieved}

📦 Most Needed: ${mostNeeded.resource || 'None'}
Priority: ${mostNeeded.priority ? mostNeeded.priority.toFixed(2) : '0.00'}
        `.trim();
        
        await this.notifier.send(report);
        return report;
    }

    /**
     * Helper: Check if an item is food
     */
    isFood(itemName) {
        const foodItems = [
            'bread', 'apple', 'golden_apple', 'carrot', 'potato', 'baked_potato',
            'beetroot', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton',
            'cooked_chicken', 'cooked_rabbit', 'cooked_cod', 'cooked_salmon',
            'pumpkin_pie', 'mushroom_stew', 'suspicious_stew', 'rabbit_stew',
            'cake', 'cookie', 'melon_slice', 'sweet_berries', 'glow_berries'
        ];
        
        return foodItems.some(food => itemName.includes(food));
    }

    /**
     * Predict future resource needs based on current activities
     */
    predictFutureNeeds(activityType) {
        const predictions = {};
        
        switch (activityType) {
            case 'mining':
                predictions.pickaxes = 2;
                predictions.torches = 64;
                predictions.food = 16;
                break;
            case 'building':
                predictions.blocks = 256;
                predictions.tools = 1;
                predictions.torches = 32;
                break;
            case 'exploration':
                predictions.food = 32;
                predictions.weapons = 1;
                predictions.torches = 64;
                break;
        }
        
        return predictions;
    }

    /**
     * Optimize decision making using learned patterns
     */
    optimizeDecision(possibleActions) {
        const scoredActions = possibleActions.map(action => {
            const confidence = this.getActionConfidence(action.name);
            const risk = this.assessRisk(action.type, action.targetPosition);
            
            // Score = confidence * reward - risk
            const score = (confidence * action.expectedReward) - (risk * 0.5);
            
            return {
                ...action,
                confidence,
                risk,
                score
            };
        });
        
        // Sort by score
        scoredActions.sort((a, b) => b.score - a.score);
        
        return scoredActions[0];
    }
}

module.exports = IntelligenceSystem;
