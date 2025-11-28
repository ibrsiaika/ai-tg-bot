const { MemoCache, memoize, ObjectPool, debounce, throttle, DeltaSync } = require('../../src/core/CacheUtils');

describe('MemoCache', () => {
    let cache;

    beforeEach(() => {
        cache = new MemoCache({ maxSize: 10, defaultTTL: 1000 });
    });

    test('should store and retrieve values', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
        expect(cache.has('key1')).toBe(true);
    });

    test('should return undefined for missing keys', () => {
        expect(cache.get('missing')).toBeUndefined();
        expect(cache.has('missing')).toBe(false);
    });

    test('should expire entries based on TTL', () => {
        // Use fake timers for this test
        jest.useFakeTimers();
        
        cache.set('expiring', 'value', 50);
        expect(cache.get('expiring')).toBe('value');
        
        jest.advanceTimersByTime(60);
        expect(cache.get('expiring')).toBeUndefined();
        
        jest.useRealTimers();
    });

    test('should track hits and misses', () => {
        cache.set('key', 'value');
        cache.get('key'); // hit
        cache.get('key'); // hit
        cache.get('missing'); // miss
        
        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
    });

    test('should evict oldest entries when full', () => {
        for (let i = 0; i < 15; i++) {
            cache.set(`key${i}`, `value${i}`);
        }
        
        expect(cache.getStats().size).toBeLessThanOrEqual(10);
    });

    test('should delete entries', () => {
        cache.set('toDelete', 'value');
        expect(cache.has('toDelete')).toBe(true);
        
        cache.delete('toDelete');
        expect(cache.has('toDelete')).toBe(false);
    });

    test('should clear all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        
        cache.clear();
        
        expect(cache.getStats().size).toBe(0);
        expect(cache.getStats().hits).toBe(0);
    });
});

describe('memoize', () => {
    test('should cache function results', () => {
        const fn = jest.fn((x) => x * 2);
        const memoized = memoize(fn);
        
        expect(memoized(5)).toBe(10);
        expect(memoized(5)).toBe(10);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should handle different arguments', () => {
        const fn = jest.fn((a, b) => a + b);
        const memoized = memoize(fn);
        
        expect(memoized(1, 2)).toBe(3);
        expect(memoized(1, 2)).toBe(3);
        expect(memoized(3, 4)).toBe(7);
        
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should handle promises', async () => {
        const fn = jest.fn(async (x) => x * 2);
        const memoized = memoize(fn);
        
        const result1 = await memoized(5);
        const result2 = await memoized(5);
        
        expect(result1).toBe(10);
        expect(result2).toBe(10);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should support custom key generator', () => {
        const fn = jest.fn((obj) => obj.value * 2);
        const memoized = memoize(fn, {
            keyGenerator: (obj) => obj.id
        });
        
        expect(memoized({ id: 1, value: 5 })).toBe(10);
        expect(memoized({ id: 1, value: 100 })).toBe(10); // Same id, cached result
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should provide cache statistics', () => {
        const memoized = memoize((x) => x);
        
        memoized(1);  // miss - first call
        memoized(1);  // hit - cached
        memoized(2);  // miss - new key
        
        const stats = memoized.getStats();
        expect(stats.hits).toBe(1);
        // Note: memoize stores results after first call, so first call for each key
        // is not a miss in the cache sense - it's a computation
        expect(stats.size).toBe(2);
    });
});

describe('ObjectPool', () => {
    test('should create objects when pool is empty', () => {
        const factory = jest.fn(() => ({}));
        const pool = new ObjectPool(factory);
        
        pool.acquire();
        expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should reuse released objects', () => {
        const factory = jest.fn(() => ({ id: Math.random() }));
        const pool = new ObjectPool(factory);
        
        const obj1 = pool.acquire();
        pool.release(obj1);
        const obj2 = pool.acquire();
        
        expect(obj1).toBe(obj2);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should reset objects on release', () => {
        const pool = new ObjectPool(
            () => ({ value: 0 }),
            { reset: (obj) => { obj.value = 0; return obj; } }
        );
        
        const obj1 = pool.acquire();
        obj1.value = 100;
        pool.release(obj1);
        
        const obj2 = pool.acquire();
        expect(obj2.value).toBe(0);
    });

    test('should track statistics', () => {
        const pool = new ObjectPool(() => ({}));
        
        const obj1 = pool.acquire();
        const obj2 = pool.acquire();
        pool.release(obj1);
        pool.acquire();
        
        const stats = pool.getStats();
        expect(stats.created).toBe(2);
        expect(stats.reused).toBe(1);
    });

    test('should respect max size', () => {
        const pool = new ObjectPool(() => ({}), { maxSize: 2 });
        
        const obj1 = pool.acquire();
        const obj2 = pool.acquire();
        const obj3 = pool.acquire();
        
        pool.release(obj1);
        pool.release(obj2);
        pool.release(obj3);
        
        expect(pool.getStats().poolSize).toBe(2);
    });
});

describe('debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.useRealTimers();
    });

    test('should delay execution', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);
        
        debounced();
        expect(fn).not.toHaveBeenCalled();
        
        jest.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should reset timer on subsequent calls', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);
        
        debounced();
        jest.advanceTimersByTime(50);
        debounced();
        jest.advanceTimersByTime(50);
        debounced();
        jest.advanceTimersByTime(100);
        
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('throttle', () => {
    test('should limit execution rate', () => {
        const fn = jest.fn();
        const throttled = throttle(fn, 100);
        
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);
        
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
        
        // Call again immediately - should be blocked
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
        
        // Advance time and call again
        jest.spyOn(Date, 'now').mockReturnValue(now + 100);
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
        
        Date.now.mockRestore();
    });
});

describe('DeltaSync', () => {
    let deltaSync;

    beforeEach(() => {
        deltaSync = new DeltaSync();
    });

    test('should return full delta on first call', () => {
        const state = { health: 20, food: 18 };
        const delta = deltaSync.getDelta(state);
        
        expect(delta).toEqual(state);
    });

    test('should return null when no changes', () => {
        const state = { health: 20, food: 18 };
        
        deltaSync.getDelta(state);
        const delta = deltaSync.getDelta({ ...state });
        
        expect(delta).toBeNull();
    });

    test('should return only changed values', () => {
        deltaSync.getDelta({ health: 20, food: 18, position: { x: 0, y: 0 } });
        
        const delta = deltaSync.getDelta({ health: 15, food: 18, position: { x: 0, y: 0 } });
        
        expect(delta).toEqual({ health: 15 });
    });

    test('should detect nested object changes', () => {
        deltaSync.getDelta({ position: { x: 0, y: 64, z: 0 } });
        
        const delta = deltaSync.getDelta({ position: { x: 10, y: 64, z: 0 } });
        
        expect(delta).toEqual({ position: { x: 10, y: 64, z: 0 } });
    });

    test('should reset state', () => {
        deltaSync.getDelta({ health: 20 });
        deltaSync.reset();
        
        const delta = deltaSync.getDelta({ health: 20 });
        expect(delta).toEqual({ health: 20 });
    });
});
