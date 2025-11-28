/**
 * Tests for SwarmCoordinator
 */

const SwarmCoordinator = require('../../src/swarmCoordinator');
const { TaskPriority, BotRole } = require('../../src/swarmCoordinator');

// Mock EventBus
jest.mock('../../src/eventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    EVENTS: {}
}));

describe('SwarmCoordinator', () => {
    let coordinator;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create coordinator with enabled flag set
        process.env.SWARM_ENABLED = 'true';
        coordinator = new SwarmCoordinator();
    });

    afterEach(() => {
        coordinator.cleanup();
        delete process.env.SWARM_ENABLED;
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(coordinator.enabled).toBe(true);
            expect(coordinator.maxBots).toBe(10);
            expect(coordinator.bots.size).toBe(0);
        });

        it('should be disabled when env var is not set', () => {
            delete process.env.SWARM_ENABLED;
            const disabledCoordinator = new SwarmCoordinator();
            expect(disabledCoordinator.enabled).toBe(false);
            disabledCoordinator.cleanup();
        });
    });

    describe('bot registration', () => {
        it('should register a bot successfully', () => {
            const result = coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 },
                capabilities: ['mining']
            });

            expect(result).toBe(true);
            expect(coordinator.bots.size).toBe(1);
            expect(coordinator.bots.get('bot1')).toBeDefined();
        });

        it('should assign territory to registered bot', () => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 50, y: 64, z: 50 }
            });

            const bot = coordinator.bots.get('bot1');
            expect(bot.territory).toBeDefined();
            expect(bot.territory.id).toBe('0,0');
        });

        it('should elect master on first bot registration', () => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 }
            });

            expect(coordinator.masterBotId).toBe('bot1');
            expect(coordinator.bots.get('bot1').isMaster).toBe(true);
        });

        it('should not exceed max bots', () => {
            coordinator.maxBots = 2;

            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 0, z: 0 } });
            coordinator.registerBot({ botId: 'bot2', position: { x: 0, y: 0, z: 0 } });
            const result = coordinator.registerBot({ botId: 'bot3', position: { x: 0, y: 0, z: 0 } });

            expect(result).toBe(false);
            expect(coordinator.bots.size).toBe(2);
        });

        it('should assign optimal role based on capabilities', () => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 },
                capabilities: ['mining']
            });

            coordinator.registerBot({
                botId: 'bot2',
                position: { x: 0, y: 64, z: 0 },
                capabilities: ['combat']
            });

            expect(coordinator.bots.get('bot1').role).toBe(BotRole.GUARDIAN); // First fills guardian
            expect(coordinator.bots.get('bot2').role).toBe(BotRole.MINER); // Second fills miner
        });
    });

    describe('bot unregistration', () => {
        it('should unregister a bot', () => {
            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 64, z: 0 } });
            coordinator.unregisterBot({ botId: 'bot1' });

            expect(coordinator.bots.size).toBe(0);
        });

        it('should elect new master when master is unregistered', () => {
            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 64, z: 0 } });
            coordinator.registerBot({ botId: 'bot2', position: { x: 0, y: 64, z: 0 } });

            expect(coordinator.masterBotId).toBe('bot1');

            coordinator.unregisterBot({ botId: 'bot1' });

            expect(coordinator.masterBotId).toBe('bot2');
        });
    });

    describe('task management', () => {
        beforeEach(() => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 }
            });
        });

        it('should submit task to queue', () => {
            const taskId = coordinator.submitTask({
                task: 'mine_diamond',
                priority: TaskPriority.HIGH
            });

            expect(taskId).toBeDefined();
        });

        it('should assign task to idle bot', () => {
            const bot = coordinator.bots.get('bot1');
            expect(bot.status).toBe('idle');

            coordinator.submitTask({
                task: 'mine_diamond',
                priority: TaskPriority.HIGH
            });

            expect(bot.status).toBe('busy');
            expect(bot.currentTask).toBeDefined();
        });

        it('should queue task when no bot available', () => {
            const bot = coordinator.bots.get('bot1');
            bot.status = 'busy';

            coordinator.submitTask({
                task: 'mine_diamond',
                priority: TaskPriority.HIGH
            });

            expect(coordinator.taskQueue.length).toBe(1);
        });

        it('should insert tasks by priority', () => {
            const bot = coordinator.bots.get('bot1');
            bot.status = 'busy';

            coordinator.submitTask({ task: 'task1', priority: TaskPriority.LOW });
            coordinator.submitTask({ task: 'task2', priority: TaskPriority.CRITICAL });
            coordinator.submitTask({ task: 'task3', priority: TaskPriority.MEDIUM });

            expect(coordinator.taskQueue[0].task).toBe('task2');
            expect(coordinator.taskQueue[1].task).toBe('task3');
            expect(coordinator.taskQueue[2].task).toBe('task1');
        });
    });

    describe('resource sharing', () => {
        beforeEach(() => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 }
            });
        });

        it('should share resource discovery', () => {
            coordinator.shareResource({
                botId: 'bot1',
                resource: { type: 'diamond', quantity: 5 },
                location: { x: 100, y: 11, z: 100 }
            });

            expect(coordinator.sharedResources.size).toBe(1);
        });

        it('should add ore to mining network', () => {
            coordinator.shareResource({
                botId: 'bot1',
                resource: { type: 'diamond_ore', quantity: 1 },
                location: { x: 100, y: 11, z: 100 }
            });

            // 'diamond_ore' contains 'diamond' so it should be added
            expect(coordinator.miningNetwork.has('diamond') || coordinator.miningNetwork.has('diamond_ore')).toBe(true);
        });

        it('should get nearest unclaimed resource', () => {
            coordinator.shareResource({
                botId: 'bot1',
                resource: { type: 'iron_ore', quantity: 1 },
                location: { x: 50, y: 20, z: 50 }
            });

            coordinator.shareResource({
                botId: 'bot1',
                resource: { type: 'iron_ore', quantity: 1 },
                location: { x: 200, y: 20, z: 200 }
            });

            const nearest = coordinator.getNearestResource({ x: 0, y: 64, z: 0 }, 'iron');
            expect(nearest.location.x).toBe(50);
        });

        it('should claim resource', () => {
            coordinator.shareResource({
                botId: 'bot1',
                resource: { type: 'diamond', quantity: 1 },
                location: { x: 100, y: 11, z: 100 }
            });

            const resourceKey = 'diamond:100,11,100';
            const result = coordinator.claimResource({ botId: 'bot1', resourceKey });

            expect(result).toBe(true);
            expect(coordinator.sharedResources.get(resourceKey).claimed).toBe(true);
        });
    });

    describe('threat management', () => {
        beforeEach(() => {
            coordinator.registerBot({
                botId: 'bot1',
                position: { x: 0, y: 64, z: 0 }
            });
            coordinator.registerBot({
                botId: 'bot2',
                position: { x: 50, y: 64, z: 50 }
            });
        });

        it('should handle threat detection', () => {
            coordinator.handleThreatDetected({
                botId: 'bot1',
                threat: { type: 'zombie' },
                location: { x: 10, y: 64, z: 10 },
                severity: 'medium'
            });

            expect(coordinator.sharedThreats.size).toBe(1);
        });

        it('should get nearby threats', () => {
            coordinator.handleThreatDetected({
                botId: 'bot1',
                threat: { type: 'creeper' },
                location: { x: 10, y: 64, z: 10 },
                severity: 'high'
            });

            const threats = coordinator.getNearbyThreats({ x: 0, y: 64, z: 0 }, 50);
            expect(threats.length).toBe(1);
            expect(threats[0].type).toBe('creeper');
        });
    });

    describe('statistics', () => {
        it('should return accurate stats', () => {
            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 64, z: 0 } });
            coordinator.registerBot({ botId: 'bot2', position: { x: 100, y: 64, z: 100 } });

            const stats = coordinator.getStats();

            expect(stats.totalBots).toBe(2);
            expect(stats.enabled).toBe(true);
            expect(stats.masterBotId).toBe('bot1');
        });

        it('should track role distribution', () => {
            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 64, z: 0 }, role: 'miner' });
            coordinator.registerBot({ botId: 'bot2', position: { x: 0, y: 64, z: 0 }, role: 'miner' });
            coordinator.registerBot({ botId: 'bot3', position: { x: 0, y: 64, z: 0 }, role: 'harvester' });

            const distribution = coordinator.getRoleDistribution();

            expect(distribution.miner).toBe(2);
            expect(distribution.harvester).toBe(1);
        });
    });

    describe('path coordination', () => {
        beforeEach(() => {
            coordinator.registerBot({ botId: 'bot1', position: { x: 0, y: 64, z: 0 } });
            coordinator.registerBot({ botId: 'bot2', position: { x: 0, y: 64, z: 0 } });
        });

        it('should reserve path', () => {
            const result = coordinator.reservePath({
                botId: 'bot1',
                waypoints: [{ x: 0, y: 64, z: 0 }, { x: 10, y: 64, z: 10 }]
            });

            expect(result).toBe(true);
        });

        it('should detect path collision', () => {
            coordinator.reservePath({
                botId: 'bot1',
                waypoints: [{ x: 5, y: 64, z: 5 }]
            });

            const result = coordinator.reservePath({
                botId: 'bot2',
                waypoints: [{ x: 5, y: 64, z: 5 }] // Same position
            });

            expect(result).toBe(false);
        });

        it('should release path', () => {
            coordinator.reservePath({
                botId: 'bot1',
                waypoints: [{ x: 5, y: 64, z: 5 }]
            });

            coordinator.releasePath({ botId: 'bot1' });

            const result = coordinator.reservePath({
                botId: 'bot2',
                waypoints: [{ x: 5, y: 64, z: 5 }]
            });

            expect(result).toBe(true);
        });
    });
});
