const SafetyMonitor = require('../../src/safety');
const { createMockBot } = require('../mocks/mineflayer.mock');

describe('SafetyMonitor', () => {
    let bot;
    let safety;

    beforeEach(() => {
        bot = createMockBot();
        safety = new SafetyMonitor(bot, 50, 10);
    });

    describe('isSafe', () => {
        test('should return true when health and food are above thresholds', () => {
            bot.health = 15;
            bot.food = 15;
            expect(safety.isSafe()).toBe(true);
        });

        test('should return false when health is below threshold', () => {
            bot.health = 5;
            bot.food = 15;
            expect(safety.isSafe()).toBe(false);
        });

        test('should return false when food is below threshold', () => {
            bot.health = 15;
            bot.food = 5;
            expect(safety.isSafe()).toBe(false);
        });

        test('should return false when both health and food are below thresholds', () => {
            bot.health = 5;
            bot.food = 5;
            expect(safety.isSafe()).toBe(false);
        });
    });

    describe('getHealthPercent', () => {
        test('should return 100% when at full health', () => {
            bot.health = 20;
            expect(safety.getHealthPercent()).toBe(100);
        });

        test('should return 50% when at half health', () => {
            bot.health = 10;
            expect(safety.getHealthPercent()).toBe(50);
        });

        test('should return 0% when at zero health', () => {
            bot.health = 0;
            expect(safety.getHealthPercent()).toBe(0);
        });
    });

    describe('needsFood', () => {
        test('should return true when food is below threshold', () => {
            bot.food = 5;
            expect(safety.needsFood()).toBe(true);
        });

        test('should return false when food is at threshold', () => {
            bot.food = 10;
            expect(safety.needsFood()).toBe(false);
        });

        test('should return false when food is above threshold', () => {
            bot.food = 15;
            expect(safety.needsFood()).toBe(false);
        });
    });

    describe('isLowHealth', () => {
        test('should return true when health is below threshold', () => {
            bot.health = 8;
            expect(safety.isLowHealth()).toBe(true);
        });

        test('should return false when health is above threshold', () => {
            bot.health = 12;
            expect(safety.isLowHealth()).toBe(false);
        });
    });

    describe('isCriticalHealth', () => {
        test('should return true when health is critically low (below 25%)', () => {
            bot.health = 4;
            expect(safety.isCriticalHealth()).toBe(true);
        });

        test('should return false when health is above critical threshold', () => {
            bot.health = 6;
            expect(safety.isCriticalHealth()).toBe(false);
        });
    });

    describe('isHostileMob', () => {
        test('should identify zombie as hostile', () => {
            const entity = { name: 'zombie' };
            expect(safety.isHostileMob(entity)).toBe(true);
        });

        test('should identify creeper as hostile', () => {
            const entity = { name: 'creeper' };
            expect(safety.isHostileMob(entity)).toBe(true);
        });

        test('should identify skeleton as hostile', () => {
            const entity = { name: 'skeleton' };
            expect(safety.isHostileMob(entity)).toBe(true);
        });

        test('should identify cow as not hostile', () => {
            const entity = { name: 'cow' };
            expect(safety.isHostileMob(entity)).toBe(false);
        });

        test('should identify pig as not hostile', () => {
            const entity = { name: 'pig' };
            expect(safety.isHostileMob(entity)).toBe(false);
        });

        test('should handle entity without name', () => {
            const entity = { type: 'player' };
            expect(safety.isHostileMob(entity)).toBe(false);
        });
    });

    describe('isInDanger', () => {
        test('should detect when bot is on fire', () => {
            bot.entity.onFire = true;
            const danger = safety.isInDanger();
            expect(danger).toBe('on fire');
        });

        test('should detect when bot is in lava', () => {
            bot.entity.isInLava = true;
            const danger = safety.isInDanger();
            expect(danger).toBe('on fire');
        });

        test('should detect when bot is drowning', () => {
            bot.entity.isInWater = true;
            bot.oxygenLevel = 2;
            const danger = safety.isInDanger();
            expect(danger).toBe('drowning');
        });

        test('should return null when not in danger', () => {
            const danger = safety.isInDanger();
            expect(danger).toBeNull();
        });
    });
});
