/**
 * Service Container / Dependency Injection Container
 * Provides centralized dependency management with lazy-loading support
 */
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
        this.singletons = new Map();
        this.initialized = new Set();
        this.lifecycleHooks = new Map();
    }

    /**
     * Register a service factory for lazy-loading
     * @param {string} name - Service name
     * @param {Function} factory - Factory function that creates the service
     * @param {Object} options - Options for service registration
     */
    register(name, factory, options = {}) {
        const { singleton = true, dependencies = [], lifecycle = {} } = options;
        
        this.factories.set(name, {
            factory,
            singleton,
            dependencies,
            lifecycle
        });
        
        if (lifecycle.onInit || lifecycle.onDestroy) {
            this.lifecycleHooks.set(name, lifecycle);
        }
    }

    /**
     * Register an already instantiated service
     * @param {string} name - Service name
     * @param {*} instance - Service instance
     */
    registerInstance(name, instance) {
        this.services.set(name, instance);
        this.initialized.add(name);
    }

    /**
     * Get a service (lazy-loads if not yet instantiated)
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Return cached singleton
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Return registered instance
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        // Create from factory
        if (this.factories.has(name)) {
            return this._createFromFactory(name);
        }

        throw new Error(`Service '${name}' not registered`);
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name) || 
               this.factories.has(name) || 
               this.singletons.has(name);
    }

    /**
     * Check if a service has been initialized
     * @param {string} name - Service name
     * @returns {boolean}
     */
    isInitialized(name) {
        return this.initialized.has(name);
    }

    /**
     * Create service from factory with dependency resolution
     * @private
     */
    _createFromFactory(name) {
        const registration = this.factories.get(name);
        if (!registration) {
            throw new Error(`No factory registered for '${name}'`);
        }

        const { factory, singleton, dependencies } = registration;

        // Resolve dependencies first
        const resolvedDeps = dependencies.map(dep => this.get(dep));

        // Create instance
        const instance = factory(...resolvedDeps);

        // Cache singleton
        if (singleton) {
            this.singletons.set(name, instance);
        }

        this.initialized.add(name);

        // Call lifecycle hook
        const lifecycle = this.lifecycleHooks.get(name);
        if (lifecycle && lifecycle.onInit) {
            lifecycle.onInit(instance);
        }

        return instance;
    }

    /**
     * Initialize a specific service or all services
     * @param {string} [name] - Service name (optional, initializes all if not provided)
     */
    async initialize(name = null) {
        if (name) {
            const service = this.get(name);
            if (service && typeof service.initialize === 'function') {
                await service.initialize();
            }
            return service;
        }

        // Initialize all registered factories
        for (const serviceName of this.factories.keys()) {
            if (!this.initialized.has(serviceName)) {
                this.get(serviceName);
            }
        }
    }

    /**
     * Destroy a service or all services
     * @param {string} [name] - Service name (optional, destroys all if not provided)
     */
    async destroy(name = null) {
        if (name) {
            return this._destroyService(name);
        }

        // Destroy all services in reverse order
        const services = Array.from(this.initialized).reverse();
        for (const serviceName of services) {
            await this._destroyService(serviceName);
        }

        this.services.clear();
        this.singletons.clear();
        this.initialized.clear();
    }

    /**
     * Destroy a single service
     * @private
     */
    async _destroyService(name) {
        const lifecycle = this.lifecycleHooks.get(name);
        const service = this.singletons.get(name) || this.services.get(name);

        if (service) {
            // Call lifecycle hook
            if (lifecycle && lifecycle.onDestroy) {
                await lifecycle.onDestroy(service);
            }

            // Call service's own cleanup
            if (typeof service.destroy === 'function') {
                await service.destroy();
            } else if (typeof service.cleanup === 'function') {
                await service.cleanup();
            } else if (typeof service.close === 'function') {
                await service.close();
            } else if (typeof service.stop === 'function') {
                await service.stop();
            }
        }

        this.singletons.delete(name);
        this.services.delete(name);
        this.initialized.delete(name);
    }

    /**
     * Get list of all registered service names
     * @returns {string[]}
     */
    getServiceNames() {
        return [
            ...Array.from(this.services.keys()),
            ...Array.from(this.factories.keys())
        ].filter((v, i, a) => a.indexOf(v) === i);
    }

    /**
     * Get statistics about the container
     * @returns {Object}
     */
    getStats() {
        return {
            totalRegistered: this.factories.size + this.services.size,
            initialized: this.initialized.size,
            singletons: this.singletons.size,
            services: Array.from(this.initialized)
        };
    }
}

// Export singleton instance
const container = new ServiceContainer();

module.exports = ServiceContainer;
module.exports.container = container;
