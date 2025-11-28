/**
 * Advanced Analytics System - v4.2.0
 * 
 * Real-time analytics and performance monitoring
 * Features:
 * - Live performance metrics tracking
 * - Predictive analytics for resource forecasting
 * - 3D chunk mapping data
 * - Resource heatmaps
 * - Alert system for critical events
 * - Performance degradation detection
 * 
 * Memory optimized for 512MB RAM environments
 */

const EventBus = require('./eventBus');
const fs = require('fs');
const path = require('path');

// Memory-efficient constants
const MAX_METRIC_HISTORY = 1000;
const MAX_ALERTS = 100;
const MAX_HEATMAP_CELLS = 2500; // 50x50 grid
const METRIC_AGGREGATION_INTERVAL = 60000; // 1 minute
const ALERT_COOLDOWN_MS = 300000; // 5 minutes

/**
 * Alert severity levels
 */
const AlertSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

/**
 * Metric types
 */
const MetricType = {
    RESOURCES_GATHERED: 'resources_gathered',
    TASKS_COMPLETED: 'tasks_completed',
    BLOCKS_MINED: 'blocks_mined',
    BLOCKS_PLACED: 'blocks_placed',
    DAMAGE_TAKEN: 'damage_taken',
    DAMAGE_DEALT: 'damage_dealt',
    DISTANCE_TRAVELED: 'distance_traveled',
    DEATHS: 'deaths',
    TOOL_DURABILITY: 'tool_durability',
    MEMORY_USAGE: 'memory_usage',
    DECISION_LATENCY: 'decision_latency',
    PATHFINDING_SUCCESS: 'pathfinding_success'
};

class AdvancedAnalyticsSystem {
    constructor(bot, notifier, systems = {}) {
        this.bot = bot;
        this.notifier = notifier;
        this.systems = systems;
        this.enabled = process.env.ANALYTICS_ENABLED !== 'false';

        // Metrics storage
        this.metrics = new Map();
        this.metricHistory = new Map();
        this.hourlyAggregates = new Map();

        // Chunk and resource mapping
        this.chunkMap = new Map();
        this.resourceHeatmap = new Map();

        // Alerts
        this.alerts = [];
        this.alertCooldowns = new Map();
        this.alertThresholds = {
            lowHealth: 30,
            lowFood: 5,
            lowToolDurability: 20,
            highDeathRate: 3, // deaths per hour
            lowResourceRate: 10 // items per hour
        };

        // Performance tracking
        this.performanceBaseline = null;
        this.performanceHistory = [];

        // Aggregation interval
        this.aggregationInterval = null;

        // Statistics
        this.sessionStart = Date.now();
        this.stats = {
            totalMetricsRecorded: 0,
            totalAlertsSent: 0,
            chunksDiscovered: 0
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize analytics system
     */
    initialize() {
        console.log('[Analytics] Initializing advanced analytics...');

        this.setupMetrics();
        this.setupEventListeners();
        this.startAggregation();
        this.establishBaseline();

        console.log('[Analytics] ✓ System initialized');
    }

    /**
     * Setup initial metrics
     */
    setupMetrics() {
        for (const type of Object.values(MetricType)) {
            this.metrics.set(type, 0);
            this.metricHistory.set(type, []);
            this.hourlyAggregates.set(type, []);
        }
    }

    /**
     * Setup event listeners for automatic metric collection
     */
    setupEventListeners() {
        // Resource events
        EventBus.on('resource:gathered', (data) => {
            this.recordMetric(MetricType.RESOURCES_GATHERED, data.quantity || 1);
            this.updateResourceHeatmap(data.position, data.resourceType);
        });

        // Task events
        EventBus.on('decision:completed', () => {
            this.recordMetric(MetricType.TASKS_COMPLETED, 1);
        });

        // Mining events
        EventBus.on('block:mined', () => {
            this.recordMetric(MetricType.BLOCKS_MINED, 1);
        });

        // Building events
        EventBus.on('block:placed', () => {
            this.recordMetric(MetricType.BLOCKS_PLACED, 1);
        });

        // Combat events
        EventBus.on('damage:taken', (data) => {
            this.recordMetric(MetricType.DAMAGE_TAKEN, data.amount || 1);
        });

        EventBus.on('damage:dealt', (data) => {
            this.recordMetric(MetricType.DAMAGE_DEALT, data.amount || 1);
        });

        // Death events
        EventBus.on('bot:died', () => {
            this.recordMetric(MetricType.DEATHS, 1);
            this.checkDeathRateAlert();
        });

        // Pathfinding events
        EventBus.on('path:completed', (data) => {
            this.recordMetric(MetricType.PATHFINDING_SUCCESS, data.success ? 1 : 0);
        });

        // ML events
        EventBus.on('ml:prediction', (data) => {
            if (data.latency) {
                this.recordMetric(MetricType.DECISION_LATENCY, data.latency);
            }
        });

        // Chunk exploration
        EventBus.on('chunk:explored', (data) => {
            this.recordChunk(data.position);
        });
    }

    /**
     * Start metric aggregation
     */
    startAggregation() {
        this.aggregationInterval = setInterval(() => {
            this.aggregateMetrics();
            this.checkAlerts();
            this.updatePerformanceTracking();
        }, METRIC_AGGREGATION_INTERVAL);
    }

    /**
     * Stop metric aggregation
     */
    stopAggregation() {
        if (this.aggregationInterval) {
            clearInterval(this.aggregationInterval);
            this.aggregationInterval = null;
        }
    }

    /**
     * Record a metric value
     */
    recordMetric(type, value) {
        if (!this.metrics.has(type)) {
            this.metrics.set(type, 0);
            this.metricHistory.set(type, []);
        }

        const current = this.metrics.get(type);
        this.metrics.set(type, current + value);

        // Add to history
        const history = this.metricHistory.get(type);
        history.push({
            value,
            timestamp: Date.now()
        });

        // Limit history size
        if (history.length > MAX_METRIC_HISTORY) {
            history.shift();
        }

        this.stats.totalMetricsRecorded++;
    }

    /**
     * Get current metric value
     */
    getMetric(type) {
        return this.metrics.get(type) || 0;
    }

    /**
     * Get metric history
     */
    getMetricHistory(type, limit = 100) {
        const history = this.metricHistory.get(type) || [];
        return history.slice(-limit);
    }

    /**
     * Aggregate metrics for hourly stats
     */
    aggregateMetrics() {
        const now = Date.now();
        const hour = Math.floor(now / 3600000);

        for (const [type, history] of this.metricHistory.entries()) {
            // Calculate last minute's total
            const lastMinute = history.filter(h => now - h.timestamp < METRIC_AGGREGATION_INTERVAL);
            const minuteTotal = lastMinute.reduce((sum, h) => sum + h.value, 0);

            // Store hourly aggregate
            const hourlyHistory = this.hourlyAggregates.get(type);
            const lastEntry = hourlyHistory[hourlyHistory.length - 1];

            if (!lastEntry || lastEntry.hour !== hour) {
                hourlyHistory.push({
                    hour,
                    total: minuteTotal,
                    count: 1,
                    avg: minuteTotal
                });

                // Limit hourly history
                if (hourlyHistory.length > 168) { // 1 week
                    hourlyHistory.shift();
                }
            } else {
                lastEntry.total += minuteTotal;
                lastEntry.count++;
                lastEntry.avg = lastEntry.total / lastEntry.count;
            }
        }
    }

    /**
     * Get hourly rate for a metric
     */
    getHourlyRate(type) {
        const history = this.metricHistory.get(type) || [];
        const hourAgo = Date.now() - 3600000;
        const recentEntries = history.filter(h => h.timestamp > hourAgo);

        return recentEntries.reduce((sum, h) => sum + h.value, 0);
    }

    /**
     * Update resource heatmap
     */
    updateResourceHeatmap(position, resourceType) {
        if (!position) return;

        const cellSize = 16; // 1 chunk
        const cellX = Math.floor(position.x / cellSize);
        const cellZ = Math.floor(position.z / cellSize);
        const key = `${cellX},${cellZ}`;

        if (!this.resourceHeatmap.has(key)) {
            // Limit heatmap size
            if (this.resourceHeatmap.size >= MAX_HEATMAP_CELLS) {
                const firstKey = this.resourceHeatmap.keys().next().value;
                this.resourceHeatmap.delete(firstKey);
            }

            this.resourceHeatmap.set(key, {
                x: cellX * cellSize,
                z: cellZ * cellSize,
                resources: {}
            });
        }

        const cell = this.resourceHeatmap.get(key);
        cell.resources[resourceType] = (cell.resources[resourceType] || 0) + 1;
        cell.lastUpdated = Date.now();
    }

    /**
     * Get resource heatmap
     */
    getResourceHeatmap(resourceType = null) {
        const result = [];

        for (const [key, cell] of this.resourceHeatmap.entries()) {
            if (resourceType) {
                const count = cell.resources[resourceType] || 0;
                if (count > 0) {
                    result.push({
                        x: cell.x,
                        z: cell.z,
                        intensity: count
                    });
                }
            } else {
                const totalCount = Object.values(cell.resources).reduce((a, b) => a + b, 0);
                result.push({
                    x: cell.x,
                    z: cell.z,
                    intensity: totalCount,
                    resources: cell.resources
                });
            }
        }

        return result;
    }

    /**
     * Record discovered chunk
     */
    recordChunk(position) {
        if (!position) return;

        const chunkX = Math.floor(position.x / 16);
        const chunkZ = Math.floor(position.z / 16);
        const key = `${chunkX},${chunkZ}`;

        if (!this.chunkMap.has(key)) {
            this.chunkMap.set(key, {
                x: chunkX,
                z: chunkZ,
                discoveredAt: Date.now(),
                features: []
            });

            this.stats.chunksDiscovered++;
        }
    }

    /**
     * Get chunk map data
     */
    getChunkMap(centerX = 0, centerZ = 0, radius = 10) {
        const chunks = [];

        for (const [key, chunk] of this.chunkMap.entries()) {
            const dx = Math.abs(chunk.x - centerX);
            const dz = Math.abs(chunk.z - centerZ);

            if (dx <= radius && dz <= radius) {
                chunks.push(chunk);
            }
        }

        return chunks;
    }

    /**
     * Establish performance baseline
     */
    establishBaseline() {
        // Will be set after first hour of operation
        setTimeout(() => {
            this.performanceBaseline = {
                resourcesPerHour: this.getHourlyRate(MetricType.RESOURCES_GATHERED),
                tasksPerHour: this.getHourlyRate(MetricType.TASKS_COMPLETED),
                deathsPerHour: this.getHourlyRate(MetricType.DEATHS),
                timestamp: Date.now()
            };

            console.log('[Analytics] Baseline established:', this.performanceBaseline);
        }, 3600000); // After 1 hour
    }

    /**
     * Update performance tracking
     */
    updatePerformanceTracking() {
        const currentPerformance = {
            resourcesPerHour: this.getHourlyRate(MetricType.RESOURCES_GATHERED),
            tasksPerHour: this.getHourlyRate(MetricType.TASKS_COMPLETED),
            deathsPerHour: this.getHourlyRate(MetricType.DEATHS),
            timestamp: Date.now()
        };

        this.performanceHistory.push(currentPerformance);

        // Limit history
        if (this.performanceHistory.length > 24) {
            this.performanceHistory.shift();
        }

        // Check for degradation
        if (this.performanceBaseline) {
            this.checkPerformanceDegradation(currentPerformance);
        }
    }

    /**
     * Check for performance degradation
     */
    checkPerformanceDegradation(current) {
        if (!this.performanceBaseline) return;

        const resourceRatio = current.resourcesPerHour / (this.performanceBaseline.resourcesPerHour || 1);
        const taskRatio = current.tasksPerHour / (this.performanceBaseline.tasksPerHour || 1);

        if (resourceRatio < 0.5) {
            this.createAlert(
                AlertSeverity.WARNING,
                'performance_degradation',
                `Resource gathering rate dropped to ${(resourceRatio * 100).toFixed(0)}% of baseline`
            );
        }

        if (taskRatio < 0.5) {
            this.createAlert(
                AlertSeverity.WARNING,
                'performance_degradation',
                `Task completion rate dropped to ${(taskRatio * 100).toFixed(0)}% of baseline`
            );
        }
    }

    /**
     * Check all alert conditions
     */
    checkAlerts() {
        // Check bot health
        if (this.bot?.health && this.bot.health < this.alertThresholds.lowHealth) {
            this.createAlert(AlertSeverity.WARNING, 'low_health', `Health is low: ${this.bot.health}/20`);
        }

        // Check food
        if (this.bot?.food && this.bot.food < this.alertThresholds.lowFood) {
            this.createAlert(AlertSeverity.WARNING, 'low_food', `Food is low: ${this.bot.food}/20`);
        }

        // Check resource gathering rate
        const resourceRate = this.getHourlyRate(MetricType.RESOURCES_GATHERED);
        if (resourceRate < this.alertThresholds.lowResourceRate && Date.now() - this.sessionStart > 3600000) {
            this.createAlert(AlertSeverity.INFO, 'low_resource_rate', `Resource rate is low: ${resourceRate}/hour`);
        }
    }

    /**
     * Check death rate alert
     */
    checkDeathRateAlert() {
        const deathRate = this.getHourlyRate(MetricType.DEATHS);

        if (deathRate >= this.alertThresholds.highDeathRate) {
            this.createAlert(
                AlertSeverity.CRITICAL,
                'high_death_rate',
                `Death rate is high: ${deathRate} deaths/hour`
            );
        }
    }

    /**
     * Create an alert
     */
    createAlert(severity, type, message) {
        // Check cooldown
        const cooldownKey = `${type}:${severity}`;
        const lastAlert = this.alertCooldowns.get(cooldownKey);

        if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
            return; // Still in cooldown
        }

        const alert = {
            id: `alert_${Date.now()}`,
            severity,
            type,
            message,
            timestamp: Date.now(),
            acknowledged: false
        };

        this.alerts.push(alert);
        this.alertCooldowns.set(cooldownKey, Date.now());
        this.stats.totalAlertsSent++;

        // Limit alerts
        if (this.alerts.length > MAX_ALERTS) {
            this.alerts.shift();
        }

        // Notify for critical alerts
        if (severity === AlertSeverity.CRITICAL) {
            this.notifier?.send?.(`🚨 ALERT: ${message}`);
        }

        EventBus.emit('analytics:alert', alert);

        console.log(`[Analytics] Alert [${severity}]: ${message}`);
    }

    /**
     * Get alerts
     */
    getAlerts(severity = null, acknowledged = null) {
        return this.alerts.filter(a => {
            if (severity && a.severity !== severity) return false;
            if (acknowledged !== null && a.acknowledged !== acknowledged) return false;
            return true;
        });
    }

    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }

    /**
     * Forecast resource stockpile (7-day prediction)
     */
    forecastResources(resourceType, daysAhead = 7) {
        const hourlyHistory = this.hourlyAggregates.get(MetricType.RESOURCES_GATHERED) || [];

        if (hourlyHistory.length < 24) {
            return {
                prediction: null,
                confidence: 0,
                reason: 'Insufficient data (need at least 24 hours)'
            };
        }

        // Calculate average hourly rate
        const avgHourlyRate = hourlyHistory.reduce((sum, h) => sum + h.avg, 0) / hourlyHistory.length;

        // Calculate trend
        const firstHalf = hourlyHistory.slice(0, Math.floor(hourlyHistory.length / 2));
        const secondHalf = hourlyHistory.slice(-Math.floor(hourlyHistory.length / 2));

        const firstAvg = firstHalf.reduce((sum, h) => sum + h.avg, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, h) => sum + h.avg, 0) / secondHalf.length;

        const trend = (secondAvg - firstAvg) / firstAvg;

        // Predict future
        const hoursAhead = daysAhead * 24;
        const prediction = avgHourlyRate * hoursAhead * (1 + trend);

        const confidence = Math.min(0.9, hourlyHistory.length / 168); // Max confidence at 1 week of data

        return {
            prediction: Math.max(0, Math.round(prediction)),
            avgHourlyRate: Math.round(avgHourlyRate),
            trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
            confidence,
            daysAhead
        };
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const sessionDuration = Date.now() - this.sessionStart;
        const hours = sessionDuration / 3600000;

        return {
            sessionDuration: Math.round(hours * 100) / 100,
            metrics: {
                resourcesGathered: this.getMetric(MetricType.RESOURCES_GATHERED),
                tasksCompleted: this.getMetric(MetricType.TASKS_COMPLETED),
                blocksMined: this.getMetric(MetricType.BLOCKS_MINED),
                blocksPlaced: this.getMetric(MetricType.BLOCKS_PLACED),
                deaths: this.getMetric(MetricType.DEATHS),
                damageDealt: this.getMetric(MetricType.DAMAGE_DEALT),
                damageTaken: this.getMetric(MetricType.DAMAGE_TAKEN)
            },
            hourlyRates: {
                resources: this.getHourlyRate(MetricType.RESOURCES_GATHERED),
                tasks: this.getHourlyRate(MetricType.TASKS_COMPLETED),
                mining: this.getHourlyRate(MetricType.BLOCKS_MINED)
            },
            efficiency: hours > 0 ? {
                resourcesPerHour: Math.round(this.getMetric(MetricType.RESOURCES_GATHERED) / hours),
                tasksPerHour: Math.round(this.getMetric(MetricType.TASKS_COMPLETED) / hours)
            } : null,
            alerts: {
                total: this.alerts.length,
                unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
                critical: this.alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length
            },
            chunks: this.stats.chunksDiscovered,
            heatmapCells: this.resourceHeatmap.size
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            metricsTracked: this.metrics.size,
            sessionDuration: Date.now() - this.sessionStart,
            hasBaseline: this.performanceBaseline !== null
        };
    }

    /**
     * Export analytics data
     */
    exportData() {
        return {
            metrics: Object.fromEntries(this.metrics),
            hourlyAggregates: Object.fromEntries(
                Array.from(this.hourlyAggregates.entries()).map(([k, v]) => [k, v.slice(-24)])
            ),
            alerts: this.alerts.slice(-50),
            performance: this.performanceHistory.slice(-24),
            heatmap: Array.from(this.resourceHeatmap.values()).slice(0, 100),
            stats: this.stats,
            timestamp: Date.now()
        };
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stopAggregation();
        this.metrics.clear();
        this.metricHistory.clear();
        this.resourceHeatmap.clear();
        this.chunkMap.clear();
        this.alerts = [];

        console.log('[Analytics] Cleanup complete');
    }
}

// Export class and constants
module.exports = AdvancedAnalyticsSystem;
module.exports.AlertSeverity = AlertSeverity;
module.exports.MetricType = MetricType;
