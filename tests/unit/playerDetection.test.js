/**
 * Tests for PlayerDetectionSystem
 */

// Mock EventBus before any imports
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

const PlayerDetectionSystem = require('../../src/playerDetection');
const { BehaviorMode, PlayerRelation } = require('../../src/playerDetection');

describe('PlayerDetectionSystem', () => {
    let playerDetection;
    let mockBot;
    let mockNotifier;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBot = {
            entity: {
                position: { 
                    x: 0, y: 64, z: 0,
                    distanceTo: jest.fn().mockReturnValue(20),
                    clone: jest.fn().mockReturnValue({ x: 0, y: 64, z: 0 })
                }
            },
            username: 'TestBot',
            players: {},
            on: jest.fn()
        };

        mockNotifier = {
            send: jest.fn().mockResolvedValue(undefined)
        };

        process.env.PLAYER_DETECTION_ENABLED = 'true';
        playerDetection = new PlayerDetectionSystem(mockBot, mockNotifier);
    });

    afterEach(() => {
        playerDetection.cleanup();
        delete process.env.PLAYER_DETECTION_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(playerDetection.enabled).toBe(true);
            expect(playerDetection.detectionRadius).toBe(64);
            expect(playerDetection.currentMode).toBe(BehaviorMode.NORMAL);
        });

        it('should be disabled when env var is false', () => {
            process.env.PLAYER_DETECTION_ENABLED = 'false';
            const disabled = new PlayerDetectionSystem(mockBot, mockNotifier);
            expect(disabled.enabled).toBe(false);
            disabled.cleanup();
        });

        it('should set owner from env', () => {
            process.env.BOT_OWNER_USERNAME = 'TestOwner';
            const withOwner = new PlayerDetectionSystem(mockBot, mockNotifier);
            expect(withOwner.getPlayerRelation('TestOwner')).toBe(PlayerRelation.OWNER);
            withOwner.cleanup();
            delete process.env.BOT_OWNER_USERNAME;
        });
    });

    describe('player relations', () => {
        it('should set player relation', () => {
            playerDetection.setPlayerRelation('Player1', PlayerRelation.FRIENDLY);
            expect(playerDetection.getPlayerRelation('Player1')).toBe(PlayerRelation.FRIENDLY);
        });

        it('should return unknown for unset players', () => {
            expect(playerDetection.getPlayerRelation('Unknown')).toBe(PlayerRelation.UNKNOWN);
        });

        it('should log relation changes', () => {
            playerDetection.setPlayerRelation('Player1', PlayerRelation.AVOID);
            
            const log = playerDetection.getActionLog();
            expect(log.length).toBe(1);
            expect(log[0].action).toBe('set_relation');
        });
    });

    describe('player tracking', () => {
        beforeEach(() => {
            // Add a player to track
            mockBot.players = {
                'TestPlayer': {
                    username: 'TestPlayer',
                    entity: {
                        position: {
                            x: 10, y: 64, z: 10,
                            clone: () => ({ x: 10, y: 64, z: 10 })
                        }
                    }
                }
            };
        });

        it('should track player position', () => {
            playerDetection.updatePlayerTracking(
                { username: 'TestPlayer', entity: { position: { x: 10, y: 64, z: 10, clone: () => ({ x: 10, y: 64, z: 10 }) } } },
                15
            );

            const tracked = playerDetection.trackedPlayers.get('TestPlayer');
            expect(tracked).toBeDefined();
            expect(tracked.distance).toBe(15);
        });

        it('should calculate velocity', () => {
            // First position with explicit timestamp in the past
            const history = [];
            history.push({ position: { x: 0, y: 64, z: 0 }, timestamp: Date.now() - 1000 });
            history.push({ position: { x: 5, y: 64, z: 0 }, timestamp: Date.now() - 500 });
            playerDetection.movementHistory.set('TestPlayer', history);

            const velocity = playerDetection.calculateVelocity('TestPlayer', { x: 10, y: 64, z: 0 });
            // Velocity should be positive since x is increasing
            expect(velocity).toBeDefined();
            expect(typeof velocity.x).toBe('number');
        });

        it('should limit tracked players', () => {
            // Fill up to max
            for (let i = 0; i < 25; i++) {
                playerDetection.updatePlayerTracking(
                    { username: `Player${i}`, entity: { position: { x: i, y: 64, z: i, clone: () => ({ x: i, y: 64, z: i }) } } },
                    i
                );
            }

            expect(playerDetection.trackedPlayers.size).toBeLessThanOrEqual(20);
        });
    });

    describe('behavior modes', () => {
        it('should be in normal mode by default', () => {
            expect(playerDetection.currentMode).toBe(BehaviorMode.NORMAL);
        });

        it('should detect avoidance mode', () => {
            expect(playerDetection.isAvoidanceMode()).toBe(false);
            
            playerDetection.currentMode = BehaviorMode.AVOIDANCE;
            expect(playerDetection.isAvoidanceMode()).toBe(true);
        });

        it('should detect collaborative mode', () => {
            expect(playerDetection.isCollaborativeMode()).toBe(false);
            
            playerDetection.currentMode = BehaviorMode.COLLABORATIVE;
            expect(playerDetection.isCollaborativeMode()).toBe(true);
        });
    });

    describe('position prediction', () => {
        beforeEach(() => {
            // Setup tracking with history
            playerDetection.trackedPlayers.set('TestPlayer', {
                position: { x: 100, y: 64, z: 100 },
                velocity: { x: 5, y: 0, z: 5 },
                lastSeen: Date.now()
            });

            for (let i = 0; i < 10; i++) {
                playerDetection.updateMovementHistory('TestPlayer', { x: i * 5, y: 64, z: i * 5 });
            }
        });

        it('should predict next position', () => {
            const prediction = playerDetection.predictNextPosition('TestPlayer', 2);

            expect(prediction).toBeDefined();
            expect(prediction.position.x).toBe(110); // 100 + 5*2
            expect(prediction.confidence).toBeGreaterThan(0);
        });

        it('should return null for unknown player', () => {
            const prediction = playerDetection.predictNextPosition('Unknown', 1);
            expect(prediction).toBeNull();
        });
    });

    describe('area avoidance', () => {
        beforeEach(() => {
            // Setup a player to avoid
            playerDetection.trackedPlayers.set('AvoidPlayer', {
                position: { x: 50, y: 64, z: 50 },
                velocity: { x: 0, y: 0, z: 0 },
                lastSeen: Date.now()
            });
            playerDetection.setPlayerRelation('AvoidPlayer', PlayerRelation.AVOID);
        });

        it('should detect area to avoid', () => {
            const shouldAvoid = playerDetection.shouldAvoidArea({ x: 55, y: 64, z: 55 });
            expect(shouldAvoid).toBe(true);
        });

        it('should not avoid safe areas', () => {
            const shouldAvoid = playerDetection.shouldAvoidArea({ x: 200, y: 64, z: 200 });
            expect(shouldAvoid).toBe(false);
        });
    });

    describe('safe position', () => {
        it('should find safe position away from players', () => {
            playerDetection.trackedPlayers.set('NearPlayer', {
                position: { x: 10, y: 64, z: 0 },
                lastSeen: Date.now()
            });

            const safePos = playerDetection.getSafePosition();

            expect(safePos).toBeDefined();
            expect(safePos.x).not.toBe(10);
        });
    });

    describe('presence patterns', () => {
        it('should record presence patterns', () => {
            playerDetection.recordPresencePattern('TestPlayer');
            playerDetection.recordPresencePattern('TestPlayer');

            const prediction = playerDetection.predictActivityWindow('TestPlayer');
            expect(prediction.totalObservations).toBe(2);
        });
    });

    describe('action logging', () => {
        it('should log actions', () => {
            playerDetection.logAction('test_action', { key: 'value' });
            
            const log = playerDetection.getActionLog();
            expect(log.length).toBe(1);
            expect(log[0].action).toBe('test_action');
        });

        it('should limit log size', () => {
            for (let i = 0; i < 250; i++) {
                playerDetection.logAction('action', { index: i });
            }

            const log = playerDetection.getActionLog(1000);
            expect(log.length).toBeLessThanOrEqual(200);
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            playerDetection.stats.playersDetected = 5;
            playerDetection.stats.avoidanceTriggered = 2;

            const stats = playerDetection.getStats();

            expect(stats.playersDetected).toBe(5);
            expect(stats.avoidanceTriggered).toBe(2);
            expect(stats.enabled).toBe(true);
        });
    });

    describe('nearby players', () => {
        beforeEach(() => {
            playerDetection.trackedPlayers.set('Player1', {
                position: { x: 10, y: 64, z: 10 },
                distance: 15,
                lastSeen: Date.now(),
                velocity: { x: 0, y: 0, z: 0 }
            });
            playerDetection.trackedPlayers.set('Player2', {
                position: { x: 30, y: 64, z: 30 },
                distance: 40,
                lastSeen: Date.now(),
                velocity: { x: 0, y: 0, z: 0 }
            });
        });

        it('should get nearby players sorted by distance', () => {
            const nearby = playerDetection.getNearbyPlayers();

            expect(nearby.length).toBe(2);
            expect(nearby[0].distance).toBeLessThan(nearby[1].distance);
        });

        it('should get specific player', () => {
            const player = playerDetection.getPlayer('Player1');
            expect(player).toBeDefined();
            expect(player.distance).toBe(15);
        });
    });
});
