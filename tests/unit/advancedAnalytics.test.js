/**
 * Tests for AdvancedAnalyticsSystem
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn()
}));

const AdvancedAnalyticsSystem = require('../../src/advancedAnalyticsSystem');
const { AlertSeverity, MetricType } = require('../../src/advancedAnalyticsSystem');

describe('AdvancedAnalyticsSystem', () => {
    let analytics;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            health: 20,
            food: 20,
            entity: {
                position: { x: 0, y: 64, z: 0 }
            }
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.ANALYTICS_ENABLED = 'true';
        analytics = new AdvancedAnalyticsSystem(mockBot, mockNotifier);
    });

    afterEach(() => {
        analytics.cleanup();
        delete process.env.ANALYTICS_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with metrics', () => {
            expect(analytics.enabled).toBe(true);
            expect(analytics.metrics.size).toBeGreaterThan(0);
        });

        it('should setup all metric types', () => {
            for (const type of Object.values(MetricType)) {
                expect(analytics.metrics.has(type)).toBe(true);
            }
        });
    });

    describe('metric recording', () => {
        it('should record metrics', () => {
            analytics.recordMetric(MetricType.RESOURCES_GATHERED, 10);
            expect(analytics.getMetric(MetricType.RESOURCES_GATHERED)).toBe(10);
        });

        it('should accumulate metrics', () => {
            analytics.recordMetric(MetricType.BLOCKS_MINED, 5);
            analytics.recordMetric(MetricType.BLOCKS_MINED, 3);
            expect(analytics.getMetric(MetricType.BLOCKS_MINED)).toBe(8);
        });

        it('should track metric history', () => {
            analytics.recordMetric(MetricType.TASKS_COMPLETED, 1);
            analytics.recordMetric(MetricType.TASKS_COMPLETED, 1);
            analytics.recordMetric(MetricType.TASKS_COMPLETED, 1);

            const history = analytics.getMetricHistory(MetricType.TASKS_COMPLETED);
            expect(history.length).toBe(3);
        });

        it('should limit history size', () => {
            for (let i = 0; i < 1100; i++) {
                analytics.recordMetric(MetricType.BLOCKS_MINED, 1);
            }

            const history = analytics.getMetricHistory(MetricType.BLOCKS_MINED, 2000);
            expect(history.length).toBeLessThanOrEqual(1000);
        });
    });

    describe('hourly rates', () => {
        it('should calculate hourly rate', () => {
            // Record some metrics
            analytics.recordMetric(MetricType.RESOURCES_GATHERED, 100);

            const rate = analytics.getHourlyRate(MetricType.RESOURCES_GATHERED);
            expect(rate).toBe(100); // All within last hour
        });
    });

    describe('resource heatmap', () => {
        it('should update heatmap', () => {
            analytics.updateResourceHeatmap({ x: 100, y: 64, z: 100 }, 'diamond');
            analytics.updateResourceHeatmap({ x: 100, y: 64, z: 100 }, 'diamond');

            const heatmap = analytics.getResourceHeatmap('diamond');
            expect(heatmap.length).toBe(1);
            expect(heatmap[0].intensity).toBe(2);
        });

        it('should filter heatmap by resource type', () => {
            analytics.updateResourceHeatmap({ x: 100, y: 64, z: 100 }, 'diamond');
            analytics.updateResourceHeatmap({ x: 200, y: 64, z: 200 }, 'iron');

            const diamondHeatmap = analytics.getResourceHeatmap('diamond');
            expect(diamondHeatmap.length).toBe(1);
        });

        it('should limit heatmap size', () => {
            for (let i = 0; i < 3000; i++) {
                analytics.updateResourceHeatmap({ x: i * 16, y: 64, z: i * 16 }, 'stone');
            }

            expect(analytics.resourceHeatmap.size).toBeLessThanOrEqual(2500);
        });
    });

    describe('chunk mapping', () => {
        it('should record chunks', () => {
            analytics.recordChunk({ x: 100, y: 64, z: 100 });
            analytics.recordChunk({ x: 200, y: 64, z: 200 });

            expect(analytics.stats.chunksDiscovered).toBe(2);
        });

        it('should not duplicate chunks', () => {
            analytics.recordChunk({ x: 100, y: 64, z: 100 });
            analytics.recordChunk({ x: 105, y: 64, z: 105 }); // Same chunk

            expect(analytics.stats.chunksDiscovered).toBe(1);
        });

        it('should get chunk map within radius', () => {
            analytics.recordChunk({ x: 0, y: 64, z: 0 });
            analytics.recordChunk({ x: 100, y: 64, z: 100 });
            analytics.recordChunk({ x: 1000, y: 64, z: 1000 });

            const nearbyChunks = analytics.getChunkMap(0, 0, 10);
            expect(nearbyChunks.length).toBe(2);
        });
    });

    describe('alerts', () => {
        it('should create alerts', () => {
            analytics.createAlert(AlertSeverity.WARNING, 'test_alert', 'Test message');

            const alerts = analytics.getAlerts();
            expect(alerts.length).toBe(1);
            expect(alerts[0].severity).toBe(AlertSeverity.WARNING);
        });

        it('should respect alert cooldown', () => {
            analytics.createAlert(AlertSeverity.WARNING, 'test_alert', 'Message 1');
            analytics.createAlert(AlertSeverity.WARNING, 'test_alert', 'Message 2');

            const alerts = analytics.getAlerts();
            expect(alerts.length).toBe(1); // Second should be blocked by cooldown
        });

        it('should filter alerts by severity', () => {
            analytics.createAlert(AlertSeverity.INFO, 'info_alert', 'Info');
            analytics.createAlert(AlertSeverity.WARNING, 'warn_alert', 'Warning');
            analytics.createAlert(AlertSeverity.CRITICAL, 'crit_alert', 'Critical');

            const warnings = analytics.getAlerts(AlertSeverity.WARNING);
            expect(warnings.length).toBe(1);
        });

        it('should acknowledge alerts', () => {
            analytics.createAlert(AlertSeverity.INFO, 'test', 'Test');
            const alert = analytics.getAlerts()[0];

            const result = analytics.acknowledgeAlert(alert.id);
            expect(result).toBe(true);
            expect(alert.acknowledged).toBe(true);
        });

        it('should notify on critical alerts', () => {
            analytics.createAlert(AlertSeverity.CRITICAL, 'critical', 'Critical alert!');

            expect(mockNotifier.send).toHaveBeenCalled();
        });

        it('should limit alerts', () => {
            for (let i = 0; i < 150; i++) {
                // Force past cooldown by using different types
                analytics.createAlert(AlertSeverity.INFO, `type_${i}`, `Message ${i}`);
            }

            const alerts = analytics.getAlerts();
            expect(alerts.length).toBeLessThanOrEqual(100);
        });
    });

    describe('resource forecasting', () => {
        it('should return insufficient data message', () => {
            const forecast = analytics.forecastResources('diamond', 7);

            expect(forecast.prediction).toBeNull();
            expect(forecast.reason).toContain('Insufficient');
        });

        it('should forecast with enough data', () => {
            // Simulate 24 hours of hourly aggregates
            const hourlyHistory = analytics.hourlyAggregates.get(MetricType.RESOURCES_GATHERED);
            for (let i = 0; i < 30; i++) {
                hourlyHistory.push({
                    hour: i,
                    total: 100,
                    count: 1,
                    avg: 100
                });
            }

            const forecast = analytics.forecastResources('wood', 7);

            expect(forecast.prediction).toBeGreaterThan(0);
            expect(forecast.confidence).toBeGreaterThan(0);
        });
    });

    describe('performance summary', () => {
        it('should return performance summary', () => {
            analytics.recordMetric(MetricType.RESOURCES_GATHERED, 100);
            analytics.recordMetric(MetricType.TASKS_COMPLETED, 50);

            const summary = analytics.getPerformanceSummary();

            expect(summary.metrics.resourcesGathered).toBe(100);
            expect(summary.metrics.tasksCompleted).toBe(50);
            expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
        });

        it('should include alert counts', () => {
            analytics.createAlert(AlertSeverity.CRITICAL, 'crit', 'Critical');

            const summary = analytics.getPerformanceSummary();

            expect(summary.alerts.total).toBe(1);
            expect(summary.alerts.critical).toBe(1);
        });
    });

    describe('data export', () => {
        it('should export analytics data', () => {
            analytics.recordMetric(MetricType.BLOCKS_MINED, 50);
            analytics.recordChunk({ x: 100, y: 64, z: 100 });
            analytics.createAlert(AlertSeverity.INFO, 'test', 'Test');

            const exported = analytics.exportData();

            expect(exported.metrics).toBeDefined();
            expect(exported.alerts.length).toBe(1);
            expect(exported.timestamp).toBeDefined();
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            analytics.recordMetric(MetricType.RESOURCES_GATHERED, 10);
            analytics.recordChunk({ x: 0, y: 64, z: 0 });

            const stats = analytics.getStats();

            expect(stats.totalMetricsRecorded).toBeGreaterThan(0);
            expect(stats.chunksDiscovered).toBe(1);
            expect(stats.enabled).toBe(true);
        });
    });

    describe('metric types', () => {
        it('should have all expected metric types', () => {
            expect(MetricType.RESOURCES_GATHERED).toBe('resources_gathered');
            expect(MetricType.TASKS_COMPLETED).toBe('tasks_completed');
            expect(MetricType.BLOCKS_MINED).toBe('blocks_mined');
            expect(MetricType.DEATHS).toBe('deaths');
        });
    });

    describe('alert severities', () => {
        it('should have all expected severities', () => {
            expect(AlertSeverity.INFO).toBe('info');
            expect(AlertSeverity.WARNING).toBe('warning');
            expect(AlertSeverity.CRITICAL).toBe('critical');
        });
    });
});
