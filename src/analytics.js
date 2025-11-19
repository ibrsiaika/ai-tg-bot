/**
 * Performance Analytics Dashboard
 * - Tracks hourly metrics (resources, distance, mobs, deaths, etc.)
 * - Creates Telegram performance reports
 * - Identifies bottlenecks and suggests improvements
 * - Displays efficiency scores
 */
class PerformanceAnalytics {
    constructor(bot, notifier, systems) {
        this.bot = bot;
        this.notifier = notifier;
        this.systems = systems;
        
        // Metrics tracking
        this.metrics = {
            resources: {
                wood: 0,
                stone: 0,
                coal: 0,
                iron: 0,
                gold: 0,
                diamond: 0,
                food: 0
            },
            activities: {
                itemsCrafted: 0,
                blocksPlaced: 0,
                blocksMined: 0,
                distanceTraveled: 0,
                mobsDefeated: 0,
                deaths: 0,
                timeSpentMining: 0,
                timeSpentExploring: 0,
                timeSpentBuilding: 0,
                timeSpentFarming: 0
            },
            efficiency: {
                resourceGatheringRate: 0,
                deathRate: 0,
                toolUsageEfficiency: 0,
                pathfindingSuccessRate: 0
            },
            goals: {
                completed: 0,
                failed: 0,
                inProgress: 0
            }
        };
        
        // Hourly snapshots
        this.hourlySnapshots = [];
        this.MAX_SNAPSHOTS = 24; // Keep last 24 hours
        
        // Session tracking
        this.sessionStart = Date.now();
        this.lastReportTime = Date.now();
        this.REPORT_INTERVAL = 3600000; // 1 hour
        
        // Last position for distance tracking
        this.lastPosition = null;
        
        // Bottleneck detection
        this.bottlenecks = [];
        
        // Start tracking
        this.startTracking();
    }
    
    /**
     * Start automatic tracking and reporting
     */
    startTracking() {
        console.log('Performance analytics tracking started');
        
        // Track deaths
        this.bot.on('death', () => {
            this.metrics.activities.deaths++;
            this.detectBottleneck('death', 'Bot died, check safety systems');
        });
        
        // Track distance traveled
        setInterval(() => {
            this.updateDistanceTraveled();
        }, 10000); // Every 10 seconds
        
        // Generate hourly reports
        setInterval(() => {
            this.generateHourlyReport();
        }, this.REPORT_INTERVAL);
    }
    
    /**
     * Update distance traveled
     */
    updateDistanceTraveled() {
        if (!this.lastPosition) {
            this.lastPosition = this.bot.entity.position.clone();
            return;
        }
        
        const currentPos = this.bot.entity.position;
        const distance = this.lastPosition.distanceTo(currentPos);
        
        this.metrics.activities.distanceTraveled += distance;
        this.lastPosition = currentPos.clone();
    }
    
    /**
     * Record resource gathered
     */
    recordResourceGathered(resourceType, amount) {
        if (this.metrics.resources[resourceType] !== undefined) {
            this.metrics.resources[resourceType] += amount;
        }
    }
    
    /**
     * Record activity
     */
    recordActivity(activityType, amount = 1) {
        if (this.metrics.activities[activityType] !== undefined) {
            this.metrics.activities[activityType] += amount;
        }
    }
    
    /**
     * Record goal completion
     */
    recordGoal(status) {
        // status: 'completed', 'failed', 'inProgress'
        if (this.metrics.goals[status] !== undefined) {
            this.metrics.goals[status]++;
        }
    }
    
    /**
     * Calculate efficiency scores
     */
    calculateEfficiencyScores() {
        const sessionHours = (Date.now() - this.sessionStart) / 3600000;
        
        // Resource gathering rate (resources per hour)
        const totalResources = Object.values(this.metrics.resources).reduce((a, b) => a + b, 0);
        this.metrics.efficiency.resourceGatheringRate = sessionHours > 0 ? totalResources / sessionHours : 0;
        
        // Death rate (deaths per hour)
        this.metrics.efficiency.deathRate = sessionHours > 0 ? this.metrics.activities.deaths / sessionHours : 0;
        
        // Pathfinding success rate (based on distance vs failures)
        const pathfindingStats = this.systems.pathfinding?.getStats();
        if (pathfindingStats) {
            const totalAttempts = pathfindingStats.timeouts + 100; // Estimate
            this.metrics.efficiency.pathfindingSuccessRate = totalAttempts > 0 ? 
                1 - (pathfindingStats.timeouts / totalAttempts) : 1;
        }
        
        // Tool usage efficiency (based on durability management)
        const toolStats = this.systems.toolDurability?.getStats();
        if (toolStats) {
            this.metrics.efficiency.toolUsageEfficiency = toolStats.replacements > 0 ? 
                1 - (toolStats.breakages / (toolStats.replacements + 1)) : 1;
        }
    }
    
    /**
     * Detect bottlenecks
     */
    detectBottleneck(type, description) {
        this.bottlenecks.push({
            type: type,
            description: description,
            timestamp: Date.now()
        });
        
        // Keep only recent bottlenecks
        if (this.bottlenecks.length > 20) {
            this.bottlenecks.shift();
        }
    }
    
    /**
     * Analyze bottlenecks and suggest improvements
     */
    analyzeBottlenecks() {
        const suggestions = [];
        
        // High death rate
        if (this.metrics.efficiency.deathRate > 0.5) {
            suggestions.push('⚠️ High death rate - improve combat/safety systems');
        }
        
        // Low resource gathering
        if (this.metrics.efficiency.resourceGatheringRate < 50) {
            suggestions.push('📊 Low resource gathering - increase mining/gathering time');
        }
        
        // Pathfinding issues
        if (this.metrics.efficiency.pathfindingSuccessRate < 0.8) {
            suggestions.push('🗺️ Pathfinding struggles - use chunk-based routing more');
        }
        
        // Tool management
        if (this.metrics.efficiency.toolUsageEfficiency < 0.7) {
            suggestions.push('🔧 Tool breakage issue - improve durability monitoring');
        }
        
        // Resource gaps
        const resourcePredictor = this.systems.resourcePredictor;
        if (resourcePredictor) {
            const gaps = resourcePredictor.analyzeResourceGaps();
            if (gaps.length > 5) {
                suggestions.push('📦 Many resource gaps - focus on critical resources');
            }
        }
        
        return suggestions;
    }
    
    /**
     * Generate hourly performance report
     */
    async generateHourlyReport() {
        console.log('Generating hourly performance report');
        
        // Calculate efficiency scores
        this.calculateEfficiencyScores();
        
        // Create snapshot
        const snapshot = {
            timestamp: Date.now(),
            metrics: JSON.parse(JSON.stringify(this.metrics)), // Deep copy
            sessionHours: (Date.now() - this.sessionStart) / 3600000
        };
        
        this.hourlySnapshots.push(snapshot);
        
        // Limit snapshots
        if (this.hourlySnapshots.length > this.MAX_SNAPSHOTS) {
            this.hourlySnapshots.shift();
        }
        
        // Generate report text
        const report = this.formatReport(snapshot);
        
        // Send to Telegram
        await this.notifier.send(report);
        
        console.log('Hourly report sent');
        this.lastReportTime = Date.now();
    }
    
    /**
     * Format performance report
     */
    formatReport(snapshot) {
        const m = snapshot.metrics;
        const hours = snapshot.sessionHours.toFixed(1);
        
        let report = `\n📊 === PERFORMANCE REPORT (${hours}h) ===\n\n`;
        
        // Resources
        report += `🪵 Resources Gathered:\n`;
        report += `  Wood: ${m.resources.wood} | Stone: ${m.resources.stone}\n`;
        report += `  Coal: ${m.resources.coal} | Iron: ${m.resources.iron}\n`;
        report += `  Diamond: ${m.resources.diamond} | Food: ${m.resources.food}\n\n`;
        
        // Activities
        report += `⚡ Activities:\n`;
        report += `  Distance: ${m.activities.distanceTraveled.toFixed(0)}m\n`;
        report += `  Mobs Defeated: ${m.activities.mobsDefeated}\n`;
        report += `  Items Crafted: ${m.activities.itemsCrafted}\n`;
        report += `  Blocks Mined: ${m.activities.blocksMined}\n`;
        report += `  Deaths: ${m.activities.deaths}\n\n`;
        
        // Efficiency
        report += `📈 Efficiency Scores:\n`;
        report += `  Resource Rate: ${m.efficiency.resourceGatheringRate.toFixed(1)}/hr\n`;
        report += `  Death Rate: ${m.efficiency.deathRate.toFixed(2)}/hr\n`;
        report += `  Pathfinding: ${(m.efficiency.pathfindingSuccessRate * 100).toFixed(0)}%\n`;
        report += `  Tool Efficiency: ${(m.efficiency.toolUsageEfficiency * 100).toFixed(0)}%\n\n`;
        
        // Goals
        report += `🎯 Goals:\n`;
        report += `  Completed: ${m.goals.completed}\n`;
        report += `  Failed: ${m.goals.failed}\n`;
        report += `  In Progress: ${m.goals.inProgress}\n\n`;
        
        // Suggestions
        const suggestions = this.analyzeBottlenecks();
        if (suggestions.length > 0) {
            report += `💡 Suggestions:\n`;
            suggestions.forEach(s => report += `  ${s}\n`);
        }
        
        return report;
    }
    
    /**
     * Get current efficiency score (0-100)
     */
    getEfficiencyScore() {
        this.calculateEfficiencyScores();
        
        // Weighted average of different efficiency metrics
        const weights = {
            resourceGathering: 0.4,
            survival: 0.3, // 1 - deathRate normalized
            pathfinding: 0.2,
            toolUsage: 0.1
        };
        
        const scores = {
            resourceGathering: Math.min(100, this.metrics.efficiency.resourceGatheringRate),
            survival: Math.max(0, 100 - (this.metrics.efficiency.deathRate * 50)),
            pathfinding: this.metrics.efficiency.pathfindingSuccessRate * 100,
            toolUsage: this.metrics.efficiency.toolUsageEfficiency * 100
        };
        
        const weightedScore = 
            scores.resourceGathering * weights.resourceGathering +
            scores.survival * weights.survival +
            scores.pathfinding * weights.pathfinding +
            scores.toolUsage * weights.toolUsage;
        
        return Math.round(weightedScore);
    }
    
    /**
     * Get detailed analytics report
     */
    generateDetailedReport() {
        this.calculateEfficiencyScores();
        
        let report = `\n=== DETAILED ANALYTICS REPORT ===\n`;
        report += `Session Duration: ${((Date.now() - this.sessionStart) / 3600000).toFixed(1)} hours\n`;
        report += `Overall Efficiency: ${this.getEfficiencyScore()}%\n\n`;
        
        // Resources
        report += `Resources Gathered:\n`;
        for (const [resource, amount] of Object.entries(this.metrics.resources)) {
            report += `  ${resource}: ${amount}\n`;
        }
        
        // Activities
        report += `\nActivities:\n`;
        for (const [activity, count] of Object.entries(this.metrics.activities)) {
            report += `  ${activity}: ${count}\n`;
        }
        
        // System Stats
        report += `\nSystem Statistics:\n`;
        
        if (this.systems.pathfinding) {
            const pf = this.systems.pathfinding.getStats();
            report += `  Pathfinding:\n`;
            report += `    Cached Paths: ${pf.cachedPaths}\n`;
            report += `    Waypoints: ${pf.waypoints}\n`;
            report += `    Visited Chunks: ${pf.visitedChunks}\n`;
            report += `    Avg Time: ${pf.avgPathfindingTime}ms\n`;
            report += `    Timeouts: ${pf.timeouts}\n`;
        }
        
        if (this.systems.mobThreatAI) {
            const mob = this.systems.mobThreatAI.getStats();
            report += `  Mob Threat AI:\n`;
            report += `    Encounters: ${mob.totalEncounters}\n`;
            report += `    Danger Zones: ${mob.dangerZones}\n`;
        }
        
        if (this.systems.resourcePredictor) {
            const rp = this.systems.resourcePredictor.getStats();
            report += `  Resource Prediction:\n`;
            report += `    Game Stage: ${rp.gameStage}\n`;
            report += `    Resource Gaps: ${rp.resourceGaps}\n`;
            report += `    Efficiency: ${(rp.efficiency * 100).toFixed(0)}%\n`;
        }
        
        // Bottlenecks
        if (this.bottlenecks.length > 0) {
            report += `\nRecent Bottlenecks (${this.bottlenecks.length}):\n`;
            this.bottlenecks.slice(-5).forEach(b => {
                const time = new Date(b.timestamp).toLocaleTimeString();
                report += `  [${time}] ${b.type}: ${b.description}\n`;
            });
        }
        
        return report;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            sessionHours: (Date.now() - this.sessionStart) / 3600000,
            efficiencyScore: this.getEfficiencyScore(),
            totalResources: Object.values(this.metrics.resources).reduce((a, b) => a + b, 0),
            deaths: this.metrics.activities.deaths,
            snapshots: this.hourlySnapshots.length
        };
    }
    
    /**
     * Get metrics for optimization manager
     */
    getMetrics() {
        const totalResources = Object.values(this.metrics.resources).reduce((a, b) => a + b, 0);
        return {
            resourcesGathered: totalResources
        };
    }
}

module.exports = PerformanceAnalytics;
