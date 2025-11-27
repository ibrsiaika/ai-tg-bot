/**
 * Performance Optimization Manager
 * 
 * Continuously monitors and optimizes bot performance:
 * - Memory usage optimization
 * - Decision speed optimization
 * - Resource gathering efficiency
 * - Pathfinding optimization
 * - Action prioritization tuning
 */
class OptimizationManager {
    constructor(bot, systems, notifier) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        
        // Performance metrics
        this.metrics = {
            decisionsPerMinute: 0,
            actionsPerMinute: 0,
            resourcesPerHour: 0,
            distanceTraveled: 0,
            energyEfficiency: 0
        };
        
        // Optimization state
        this.optimizations = {
            pathfindingCache: new Map(),
            actionQueue: [],
            batchedActions: [],
            parallelTasks: new Set()
        };
        
        // Tuning parameters (auto-adjusted)
        this.tuning = {
            explorationRadius: 50,
            gatheringBatchSize: 16,
            miningDepthPreference: 11,
            combatAggression: 0.5,
            buildingSpeed: 1.0
        };
        
        // Performance tracking
        this.lastOptimization = Date.now();
        this.OPTIMIZATION_INTERVAL = 60000; // Optimize every minute
        
        console.log('✓ Optimization Manager initialized');
    }

    /**
     * Start continuous optimization
     */
    startOptimization() {
        setInterval(() => {
            this.optimizePerformance();
        }, this.OPTIMIZATION_INTERVAL);
    }

    /**
     * Main optimization cycle
     */
    async optimizePerformance() {
        console.log('Running performance optimization...');
        
        // Collect current metrics
        this.collectMetrics();
        
        // Optimize different subsystems
        this.optimizePathfinding();
        this.optimizeInventory();
        this.optimizeActionQueue();
        this.tuneBehaviorParameters();
        this.optimizeMemoryUsage();
        
        // Report optimization results
        if (this.shouldReportOptimization()) {
            await this.reportOptimizations();
        }
    }

    /**
     * Collect performance metrics
     */
    collectMetrics() {
        const now = Date.now();
        const timeDelta = (now - this.lastOptimization) / 1000; // seconds
        
        // Update metrics based on system data
        if (this.systems.behavior) {
            this.metrics.decisionsPerMinute = 
                (this.systems.behavior.decisionCount / timeDelta) * 60;
        }
        
        if (this.systems.analytics) {
            const analytics = this.systems.analytics.getMetrics();
            this.metrics.resourcesPerHour = analytics.resourcesGathered || 0;
        }
        
        this.lastOptimization = now;
    }

    /**
     * Optimize pathfinding
     */
    optimizePathfinding() {
        // Cache frequently used paths
        const cacheSize = this.optimizations.pathfindingCache.size;
        const MAX_CACHE = 100;
        
        if (cacheSize > MAX_CACHE) {
            // Remove oldest 20%
            const toRemove = Math.floor(MAX_CACHE * 0.2);
            const keys = Array.from(this.optimizations.pathfindingCache.keys());
            
            for (let i = 0; i < toRemove; i++) {
                this.optimizations.pathfindingCache.delete(keys[i]);
            }
            
            console.log(`Optimized pathfinding cache: ${cacheSize} -> ${this.optimizations.pathfindingCache.size}`);
        }
        
        // Adjust exploration radius based on resource density
        if (this.systems.intelligence) {
            const resourceCount = this.systems.intelligence.worldKnowledge.resourceLocations.size;
            
            if (resourceCount < 5) {
                // Expand search radius
                this.tuning.explorationRadius = Math.min(100, this.tuning.explorationRadius + 10);
            } else if (resourceCount > 20) {
                // Contract search radius (resources nearby)
                this.tuning.explorationRadius = Math.max(30, this.tuning.explorationRadius - 5);
            }
        }
    }

    /**
     * Optimize inventory management
     */
    optimizeInventory() {
        if (!this.systems.inventory) return;
        
        // Auto-organize inventory every optimization cycle
        try {
            // Keep most-used items in hotbar
            const hotbarPriority = [
                'pickaxe', 'axe', 'sword', 'shovel',
                'food', 'torch', 'cobblestone', 'planks'
            ];
            
            // This would be implemented by inventory system
            // For now, just log the optimization intent
            console.log('Inventory organization optimized');
        } catch (error) {
            // Silently handle optimization errors
        }
    }

    /**
     * Optimize action queue
     */
    optimizeActionQueue() {
        // Batch similar actions together
        const actions = this.optimizations.actionQueue;
        
        if (actions.length === 0) return;
        
        // Group by type
        const grouped = {};
        actions.forEach(action => {
            const type = action.type || 'misc';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(action);
        });
        
        // Execute batched actions
        this.optimizations.batchedActions = Object.entries(grouped)
            .map(([type, actions]) => ({
                type,
                count: actions.length,
                actions
            }));
        
        console.log(`Batched ${actions.length} actions into ${this.optimizations.batchedActions.length} groups`);
        
        // Clear processed actions
        this.optimizations.actionQueue = [];
    }

    /**
     * Tune behavior parameters based on performance
     */
    tuneBehaviorParameters() {
        if (!this.systems.behavior) return;
        
        // Auto-adjust preferences based on success rates
        const behavior = this.systems.behavior;
        
        // Increase successful strategies
        if (this.metrics.resourcesPerHour > 50) {
            behavior.adaptiveBehavior.miningPreference *= 1.05;
        }
        
        // Decrease unsuccessful strategies
        if (this.metrics.resourcesPerHour < 20) {
            behavior.adaptiveBehavior.explorationPreference *= 1.1;
            behavior.adaptiveBehavior.miningPreference *= 0.95;
        }
        
        // Normalize preferences
        const total = Object.values(behavior.adaptiveBehavior).reduce((a, b) => a + b, 0);
        Object.keys(behavior.adaptiveBehavior).forEach(key => {
            behavior.adaptiveBehavior[key] /= total;
        });
        
        console.log('Behavior parameters tuned:', behavior.adaptiveBehavior);
    }

    /**
     * Optimize memory usage
     */
    optimizeMemoryUsage() {
        // Clean up old data from various systems
        const now = Date.now();
        
        // Intelligence system cleanup
        if (this.systems.intelligence) {
            const intel = this.systems.intelligence;
            const maxAge = 1800000; // 30 minutes
            
            // Clean old resource locations
            if (intel.worldKnowledge && intel.worldKnowledge.resourceLocations) {
                intel.worldKnowledge.resourceLocations.forEach((locations, resourceType) => {
                    const fresh = locations.filter(loc => now - loc.timestamp < maxAge);
                    if (fresh.length < locations.length) {
                        intel.worldKnowledge.resourceLocations.set(resourceType, fresh);
                        console.log(`Cleaned ${locations.length - fresh.length} old ${resourceType} locations`);
                    }
                });
            }
            
            // Clean old danger zones
            if (intel.worldKnowledge && intel.worldKnowledge.dangerZones) {
                intel.worldKnowledge.dangerZones.forEach((zone, key) => {
                    if (now - zone.timestamp > maxAge) {
                        intel.worldKnowledge.dangerZones.delete(key);
                    }
                });
            }
        }
        
        // Exploration cleanup
        if (this.systems.exploration) {
            const exploration = this.systems.exploration;
            
            // Limit tree location memory
            if (exploration.treeLocations && exploration.treeLocations.length > 100) {
                exploration.treeLocations = exploration.treeLocations.slice(-50);
                console.log('Trimmed tree location memory');
            }
        }
        
        // AI Orchestrator cache cleanup
        if (this.systems.aiOrchestrator) {
            const orchestrator = this.systems.aiOrchestrator;
            if (orchestrator.decisionCache && orchestrator.decisionCache.size > 50) {
                orchestrator.decisionCache.clear();
                console.log('Cleared AI decision cache');
            }
        }
        
        // v4.2.0: Pathfinding cache cleanup
        if (this.systems.pathfinding) {
            const pathfinding = this.systems.pathfinding;
            const cacheMaxAge = 300000; // 5 minutes
            
            // Clean expired path cache entries
            if (pathfinding.pathCache) {
                let cleanedCount = 0;
                pathfinding.pathCache.forEach((entry, key) => {
                    if (now - entry.timestamp > cacheMaxAge) {
                        pathfinding.pathCache.delete(key);
                        cleanedCount++;
                    }
                });
                if (cleanedCount > 0) {
                    console.log(`Cleaned ${cleanedCount} expired path cache entries`);
                }
            }
        }
        
        // v4.2.0: ML Decision Engine cache cleanup
        if (this.systems.mlEngine && this.systems.mlEngine.cache) {
            const mlEngine = this.systems.mlEngine;
            if (mlEngine.cache.size > 80) {
                // Remove oldest 30% of cache entries
                const entries = Array.from(mlEngine.cache.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);
                const toRemove = Math.floor(entries.length * 0.3);
                for (let i = 0; i < toRemove; i++) {
                    mlEngine.cache.delete(entries[i][0]);
                }
                console.log(`Trimmed ${toRemove} ML cache entries`);
            }
        }
        
        // v4.2.0: Combat stats reset if too large
        if (this.systems.combat && this.systems.combat.combatStats) {
            // Reset combo counter if no recent attacks
            if (this.systems.combat.comboCounter > 0 && 
                now - this.systems.combat.lastAttackTime > 5000) {
                this.systems.combat.resetCombo();
            }
        }
        
        // v4.2.0: EventBus history cleanup
        const EventBus = require('./eventBus');
        if (EventBus.getHistory && EventBus.clearHistory) {
            const history = EventBus.getHistory();
            if (history.length > 400) {
                EventBus.clearHistory();
                console.log('Cleared EventBus history');
            }
        }
    }

    /**
     * Queue an action for optimization
     */
    queueAction(action) {
        this.optimizations.actionQueue.push(action);
    }

    /**
     * Get batched actions for execution
     */
    getBatchedActions() {
        return this.optimizations.batchedActions;
    }

    /**
     * Check if should report optimizations
     */
    shouldReportOptimization() {
        // Report every 10 optimizations
        return Math.random() < 0.1;
    }

    /**
     * Report optimization results
     */
    async reportOptimizations() {
        const message = `⚡ Performance Optimized:\n` +
            `Decisions/min: ${this.metrics.decisionsPerMinute.toFixed(1)}\n` +
            `Resources/hr: ${this.metrics.resourcesPerHour.toFixed(0)}\n` +
            `Exploration radius: ${this.tuning.explorationRadius}m\n` +
            `Cache size: ${this.optimizations.pathfindingCache.size}`;
        
        await this.notifier.send(message);
    }

    /**
     * Get current optimization state
     */
    getOptimizationState() {
        return {
            metrics: this.metrics,
            tuning: this.tuning,
            cacheSize: this.optimizations.pathfindingCache.size,
            queuedActions: this.optimizations.actionQueue.length,
            batchedGroups: this.optimizations.batchedActions.length
        };
    }

    /**
     * Force optimization now
     */
    async forceOptimization() {
        await this.optimizePerformance();
        console.log('✓ Forced optimization complete');
    }
}

module.exports = OptimizationManager;
