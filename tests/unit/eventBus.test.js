const EventBus = require('../../src/eventBus');

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    afterEach(() => {
        eventBus.removeAllListeners();
        eventBus.clearHistory();
    });

    describe('event emission and listening', () => {
        test('should emit and receive events', () => {
            const handler = jest.fn();
            eventBus.on('test:event', handler);
            
            eventBus.emit('test:event', { data: 'test' });
            
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should support multiple listeners for same event', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            
            eventBus.on('test:event', handler1);
            eventBus.on('test:event', handler2);
            
            eventBus.emit('test:event', 'data');
            
            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('event history', () => {
        test('should store event history', () => {
            eventBus.emit('test:event1', { value: 1 });
            eventBus.emit('test:event2', { value: 2 });
            
            const history = eventBus.getHistory();
            
            expect(history).toHaveLength(2);
            expect(history[0].event).toBe('test:event1');
            expect(history[1].event).toBe('test:event2');
        });

        test('should filter history by event name', () => {
            eventBus.emit('test:event1', { value: 1 });
            eventBus.emit('test:event2', { value: 2 });
            eventBus.emit('test:event1', { value: 3 });
            
            const history = eventBus.getHistory('test:event1');
            
            expect(history).toHaveLength(2);
            expect(history.every(e => e.event === 'test:event1')).toBe(true);
        });

        test('should limit history size', () => {
            eventBus.emit('test:event1', 1);
            eventBus.emit('test:event2', 2);
            eventBus.emit('test:event3', 3);
            
            const history = eventBus.getHistory(null, 2);
            
            expect(history).toHaveLength(2);
        });

        test('should maintain max history size', () => {
            const maxSize = eventBus.maxHistorySize;
            
            // Emit more events than max size
            for (let i = 0; i < maxSize + 100; i++) {
                eventBus.emit('test:event', { index: i });
            }
            
            const history = eventBus.getHistory();
            expect(history.length).toBeLessThanOrEqual(maxSize);
        });

        test('should clear history', () => {
            eventBus.emit('test:event', 'data');
            eventBus.clearHistory();
            
            const history = eventBus.getHistory();
            expect(history).toHaveLength(0);
        });
    });

    describe('listener tracking', () => {
        test('should track registered listeners', () => {
            const handler = jest.fn();
            eventBus.on('test:event', handler);
            
            const info = eventBus.getListenerInfo('test:event');
            
            expect(info.count).toBe(1);
        });

        test('should get all event types', () => {
            eventBus.on('event1', jest.fn());
            eventBus.on('event2', jest.fn());
            eventBus.on('event3', jest.fn());
            
            const types = eventBus.getEventTypes();
            
            expect(types).toContain('event1');
            expect(types).toContain('event2');
            expect(types).toContain('event3');
        });
    });

    describe('predefined event constants', () => {
        test('should have system event constants', () => {
            expect(EventBus.EVENTS.SYSTEM_INITIALIZED).toBe('system:initialized');
            expect(EventBus.EVENTS.SYSTEM_ERROR).toBe('system:error');
        });

        test('should have bot event constants', () => {
            expect(EventBus.EVENTS.BOT_SPAWNED).toBe('bot:spawned');
            expect(EventBus.EVENTS.BOT_HEALTH_CHANGED).toBe('bot:health_changed');
            expect(EventBus.EVENTS.BOT_DIED).toBe('bot:died');
        });

        test('should have resource event constants', () => {
            expect(EventBus.EVENTS.RESOURCE_FOUND).toBe('resource:found');
            expect(EventBus.EVENTS.RESOURCE_GATHERED).toBe('resource:gathered');
        });

        test('should have decision event constants', () => {
            expect(EventBus.EVENTS.DECISION_MADE).toBe('decision:made');
            expect(EventBus.EVENTS.DECISION_COMPLETED).toBe('decision:completed');
        });
    });

    describe('integration scenarios', () => {
        test('should handle rapid event emission', () => {
            const handler = jest.fn();
            eventBus.on('rapid:event', handler);
            
            for (let i = 0; i < 100; i++) {
                eventBus.emit('rapid:event', { index: i });
            }
            
            expect(handler).toHaveBeenCalledTimes(100);
        });

        test('should preserve event data in history', () => {
            const testData = { 
                userId: 123, 
                action: 'test',
                metadata: { key: 'value' }
            };
            
            eventBus.emit('test:event', testData);
            
            const history = eventBus.getHistory('test:event');
            expect(history[0].data).toEqual(testData);
        });
    });
});
