const ServiceContainer = require('../../src/core/ServiceContainer');

describe('ServiceContainer', () => {
    let container;

    beforeEach(() => {
        container = new ServiceContainer();
    });

    afterEach(async () => {
        await container.destroy();
    });

    describe('registration and retrieval', () => {
        test('should register and retrieve instance', () => {
            const service = { name: 'test' };
            container.registerInstance('testService', service);
            
            expect(container.get('testService')).toBe(service);
            expect(container.has('testService')).toBe(true);
        });

        test('should register factory and create on demand', () => {
            const factory = jest.fn(() => ({ created: true }));
            container.register('lazyService', factory);
            
            expect(container.has('lazyService')).toBe(true);
            expect(factory).not.toHaveBeenCalled();
            
            const service = container.get('lazyService');
            expect(factory).toHaveBeenCalledTimes(1);
            expect(service.created).toBe(true);
        });

        test('should cache singleton instances', () => {
            let callCount = 0;
            container.register('singletonService', () => ({ id: ++callCount }), { singleton: true });
            
            const first = container.get('singletonService');
            const second = container.get('singletonService');
            
            expect(first).toBe(second);
            expect(first.id).toBe(1);
        });

        test('should throw for unregistered service', () => {
            expect(() => container.get('unknownService')).toThrow("Service 'unknownService' not registered");
        });
    });

    describe('dependency injection', () => {
        test('should resolve dependencies', () => {
            container.registerInstance('config', { setting: 'value' });
            container.register('dependentService', (config) => ({ config }), {
                dependencies: ['config']
            });
            
            const service = container.get('dependentService');
            expect(service.config.setting).toBe('value');
        });

        test('should resolve nested dependencies', () => {
            container.register('serviceA', () => ({ name: 'A' }));
            container.register('serviceB', (a) => ({ name: 'B', dep: a }), {
                dependencies: ['serviceA']
            });
            container.register('serviceC', (a, b) => ({ name: 'C', deps: [a, b] }), {
                dependencies: ['serviceA', 'serviceB']
            });
            
            const serviceC = container.get('serviceC');
            expect(serviceC.deps[0].name).toBe('A');
            expect(serviceC.deps[1].name).toBe('B');
            expect(serviceC.deps[1].dep.name).toBe('A');
        });
    });

    describe('lifecycle management', () => {
        test('should call lifecycle hooks', () => {
            const onInit = jest.fn();
            const onDestroy = jest.fn();
            
            container.register('lifecycleService', () => ({}), {
                lifecycle: { onInit, onDestroy }
            });
            
            container.get('lifecycleService');
            expect(onInit).toHaveBeenCalled();
            
            container.destroy('lifecycleService');
            expect(onDestroy).toHaveBeenCalled();
        });

        test('should call service destroy method', async () => {
            const destroy = jest.fn();
            container.registerInstance('destructibleService', { destroy });
            
            await container.destroy('destructibleService');
            expect(destroy).toHaveBeenCalled();
        });

        test('should destroy all services', async () => {
            const destroy1 = jest.fn();
            const destroy2 = jest.fn();
            
            container.registerInstance('service1', { destroy: destroy1 });
            container.registerInstance('service2', { destroy: destroy2 });
            
            await container.destroy();
            
            expect(destroy1).toHaveBeenCalled();
            expect(destroy2).toHaveBeenCalled();
        });
    });

    describe('statistics', () => {
        test('should return accurate stats', () => {
            container.register('lazy1', () => ({}));
            container.register('lazy2', () => ({}));
            container.registerInstance('instant', {});
            
            let stats = container.getStats();
            expect(stats.totalRegistered).toBe(3);
            expect(stats.initialized).toBe(1);
            
            container.get('lazy1');
            stats = container.getStats();
            expect(stats.initialized).toBe(2);
        });

        test('should return service names', () => {
            container.register('service1', () => ({}));
            container.registerInstance('service2', {});
            
            const names = container.getServiceNames();
            expect(names).toContain('service1');
            expect(names).toContain('service2');
        });
    });
});
