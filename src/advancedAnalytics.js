/**
 * Advanced Analytics System - v4.1.0
 * 
 * Deep insights, performance metrics, and anomaly detection
 */

const EventBus = require('./eventBus');

class AdvancedAnalytics {
    constructor() {
        this.enabled = process.env.ADVANCED_ANALYTICS_ENABLED === 'true';
        this.anomalyDetectionEnabled = process.env.ANOMALY_DETECTION_ENABLED === 'true';
        
        this.metrics = {
            performance: [],
            actions: [],
            resources: [],
            errors: []
        };
        
        this.baselines = {
            actionsPerHour: 100,
            resourcesPerHour: 50,
            avgResponseTime: 500,
            errorRate: 0.01
        };
        
        this.anomalies = [];
        this.insights = [];
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('[Analytics] Advanced analytics initialized');
        
        // Track bot events
        EventBus.on('bot:action', (data) => this.trackAction(data));
        EventBus.on('bot:resource:collected', (data) => this.trackResource(data));
        EventBus.on('bot:error', (data) => this.trackError(data));
        EventBus.on('ml:prediction', (data) => this.trackMLPerformance(data));
        
        // Periodic analysis
        setInterval(() => this.analyzeMetrics(), 60000); // Every minute
        setInterval(() => this.detectAnomalies(), 300000); // Every 5 minutes
        setInterval(() => this.generateInsights(), 600000); // Every 10 minutes
    }
    
    /**
     * Track bot action
     */
    trackAction(data) {
        this.metrics.actions.push({
            action: data.action,
            duration: data.duration || 0,
            success: data.success !== false,
            timestamp: Date.now()
        });
        
        // Keep last 1000 actions
        if (this.metrics.actions.length > 1000) {
            this.metrics.actions = this.metrics.actions.slice(-1000);
        }
    }
    
    /**
     * Track resource collection
     */
    trackResource(data) {
        this.metrics.resources.push({
            resource: data.resource,
            quantity: data.quantity || 1,
            location: data.location,
            timestamp: Date.now()
        });
        
        if (this.metrics.resources.length > 1000) {
            this.metrics.resources = this.metrics.resources.slice(-1000);
        }
    }
    
    /**
     * Track error
     */
    trackError(data) {
        this.metrics.errors.push({
            type: data.type,
            message: data.message,
            severity: data.severity || 'medium',
            timestamp: Date.now()
        });
        
        if (this.metrics.errors.length > 500) {
            this.metrics.errors = this.metrics.errors.slice(-500);
        }
    }
    
    /**
     * Track ML performance
     */
    trackMLPerformance(data) {
        if (!data.result) return;
        
        this.metrics.performance.push({
            latency: data.result.latency || 0,
            confidence: data.result.confidence || 0,
            type: data.type,
            timestamp: Date.now()
        });
        
        if (this.metrics.performance.length > 1000) {
            this.metrics.performance = this.metrics.performance.slice(-1000);
        }
    }
    
    /**
     * Analyze metrics and update baselines
     */
    analyzeMetrics() {
        const now = Date.now();
        const hourAgo = now - 3600000;
        
        // Actions per hour
        const recentActions = this.metrics.actions.filter(a => a.timestamp > hourAgo);
        const actionsPerHour = recentActions.length;
        
        // Resources per hour
        const recentResources = this.metrics.resources.filter(r => r.timestamp > hourAgo);
        const resourcesPerHour = recentResources.reduce((sum, r) => sum + r.quantity, 0);
        
        // Average response time (ML)
        const recentPerformance = this.metrics.performance.filter(p => p.timestamp > hourAgo);
        const avgResponseTime = recentPerformance.length > 0
            ? recentPerformance.reduce((sum, p) => sum + p.latency, 0) / recentPerformance.length
            : this.baselines.avgResponseTime;
        
        // Error rate
        const recentErrors = this.metrics.errors.filter(e => e.timestamp > hourAgo);
        const errorRate = recentErrors.length / Math.max(1, recentActions.length);
        
        // Update baselines (exponential moving average)
        this.baselines.actionsPerHour = this.baselines.actionsPerHour * 0.8 + actionsPerHour * 0.2;
        this.baselines.resourcesPerHour = this.baselines.resourcesPerHour * 0.8 + resourcesPerHour * 0.2;
        this.baselines.avgResponseTime = this.baselines.avgResponseTime * 0.8 + avgResponseTime * 0.2;
        this.baselines.errorRate = this.baselines.errorRate * 0.8 + errorRate * 0.2;
        
        EventBus.emit('analytics:metrics:updated', {
            baselines: this.baselines,
            current: {
                actionsPerHour,
                resourcesPerHour,
                avgResponseTime,
                errorRate
            }
        });
    }
    
    /**
     * Detect anomalies
     */
    detectAnomalies() {
        if (!this.anomalyDetectionEnabled) return;
        
        const now = Date.now();
        const hourAgo = now - 3600000;
        
        const newAnomalies = [];
        
        // Check for performance degradation
        const recentPerformance = this.metrics.performance.filter(p => p.timestamp > hourAgo);
        if (recentPerformance.length > 10) {
            const avgLatency = recentPerformance.reduce((sum, p) => sum + p.latency, 0) / recentPerformance.length;
            
            if (avgLatency > this.baselines.avgResponseTime * 1.5) {
                newAnomalies.push({
                    type: 'performance_degradation',
                    severity: 'high',
                    message: `ML latency ${Math.round(avgLatency)}ms is 50% above baseline`,
                    timestamp: now
                });
            }
        }
        
        // Check for action rate anomalies
        const recentActions = this.metrics.actions.filter(a => a.timestamp > hourAgo);
        if (recentActions.length < this.baselines.actionsPerHour * 0.5) {
            newAnomalies.push({
                type: 'low_activity',
                severity: 'medium',
                message: `Action rate (${recentActions.length}/hr) is 50% below baseline`,
                timestamp: now
            });
        }
        
        // Check for error rate spike
        const recentErrors = this.metrics.errors.filter(e => e.timestamp > hourAgo);
        const errorRate = recentErrors.length / Math.max(1, recentActions.length);
        
        if (errorRate > this.baselines.errorRate * 3) {
            newAnomalies.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Error rate (${(errorRate * 100).toFixed(1)}%) is 3x above baseline`,
                timestamp: now
            });
        }
        
        // Check for stuck state (no actions in 10 minutes)
        const tenMinutesAgo = now - 600000;
        const veryRecentActions = this.metrics.actions.filter(a => a.timestamp > tenMinutesAgo);
        if (veryRecentActions.length === 0) {
            newAnomalies.push({
                type: 'no_activity',
                severity: 'critical',
                message: 'No actions detected in last 10 minutes - bot may be stuck',
                timestamp: now
            });
        }
        
        if (newAnomalies.length > 0) {
            this.anomalies.push(...newAnomalies);
            
            // Keep only last 100 anomalies
            if (this.anomalies.length > 100) {
                this.anomalies = this.anomalies.slice(-100);
            }
            
            EventBus.emit('analytics:anomalies:detected', {
                anomalies: newAnomalies,
                totalAnomalies: this.anomalies.length
            });
        }
    }
    
    /**
     * Generate insights
     */
    generateInsights() {
        const insights = [];
        
        // Action success rate insight
        const recentActions = this.metrics.actions.slice(-100);
        const successRate = recentActions.filter(a => a.success).length / recentActions.length;
        
        if (successRate > 0.9) {
            insights.push({
                type: 'positive',
                category: 'performance',
                message: `Excellent success rate: ${(successRate * 100).toFixed(1)}%`,
                recommendation: 'Consider increasing task complexity'
            });
        } else if (successRate < 0.7) {
            insights.push({
                type: 'warning',
                category: 'performance',
                message: `Low success rate: ${(successRate * 100).toFixed(1)}%`,
                recommendation: 'Review failed actions and adjust strategy'
            });
        }
        
        // Resource collection insight
        const resourceTypes = new Set(this.metrics.resources.slice(-100).map(r => r.resource));
        
        if (resourceTypes.size < 3) {
            insights.push({
                type: 'suggestion',
                category: 'resources',
                message: `Limited resource diversity: ${resourceTypes.size} types`,
                recommendation: 'Explore new areas for varied resources'
            });
        }
        
        // ML performance insight
        const recentML = this.metrics.performance.slice(-50);
        if (recentML.length > 0) {
            const avgConfidence = recentML.reduce((sum, p) => sum + p.confidence, 0) / recentML.length;
            const avgLatency = recentML.reduce((sum, p) => sum + p.latency, 0) / recentML.length;
            
            insights.push({
                type: 'info',
                category: 'ml',
                message: `ML: ${Math.round(avgLatency)}ms latency, ${(avgConfidence * 100).toFixed(1)}% confidence`,
                recommendation: avgLatency < 50 && avgConfidence > 0.8 
                    ? 'ML performing optimally'
                    : 'Consider retraining models'
            });
        }
        
        this.insights = insights;
        
        EventBus.emit('analytics:insights:generated', { insights });
    }
    
    /**
     * Get analytics dashboard data
     */
    getDashboard() {
        const now = Date.now();
        const hourAgo = now - 3600000;
        
        return {
            metrics: {
                actionsPerHour: this.metrics.actions.filter(a => a.timestamp > hourAgo).length,
                resourcesPerHour: this.metrics.resources
                    .filter(r => r.timestamp > hourAgo)
                    .reduce((sum, r) => sum + r.quantity, 0),
                avgMLLatency: this.metrics.performance.length > 0
                    ? this.metrics.performance
                        .filter(p => p.timestamp > hourAgo)
                        .reduce((sum, p) => sum + p.latency, 0) / 
                        this.metrics.performance.filter(p => p.timestamp > hourAgo).length
                    : 0,
                errorRate: (this.metrics.errors.filter(e => e.timestamp > hourAgo).length / 
                    Math.max(1, this.metrics.actions.filter(a => a.timestamp > hourAgo).length) * 100).toFixed(2) + '%'
            },
            baselines: this.baselines,
            anomalies: this.anomalies.slice(-10),
            insights: this.insights,
            health: this.calculateHealthScore()
        };
    }
    
    /**
     * Calculate overall system health score (0-100)
     */
    calculateHealthScore() {
        let score = 100;
        
        // Deduct for errors
        const recentErrors = this.metrics.errors.filter(e => Date.now() - e.timestamp < 3600000);
        score -= recentErrors.length * 2;
        
        // Deduct for anomalies
        const recentAnomalies = this.anomalies.filter(a => Date.now() - a.timestamp < 3600000);
        score -= recentAnomalies.filter(a => a.severity === 'critical').length * 10;
        score -= recentAnomalies.filter(a => a.severity === 'high').length * 5;
        
        // Bonus for high activity
        const recentActions = this.metrics.actions.filter(a => Date.now() - a.timestamp < 3600000);
        if (recentActions.length > this.baselines.actionsPerHour) {
            score += 5;
        }
        
        return Math.max(0, Math.min(100, score));
    }
}

module.exports = AdvancedAnalytics;
