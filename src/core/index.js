/**
 * Core Module Index
 * Exports all core infrastructure components
 */

const ServiceContainer = require('./ServiceContainer');
const SystemBase = require('./SystemBase');
const CacheUtils = require('./CacheUtils');
const ConfigManager = require('./ConfigManager');
const NotifierAdapter = require('./NotifierAdapter');

module.exports = {
    // Service Container for dependency injection
    ServiceContainer,
    container: ServiceContainer.container,
    
    // Base class for systems
    SystemBase,
    
    // Caching and performance utilities
    MemoCache: CacheUtils.MemoCache,
    memoize: CacheUtils.memoize,
    ObjectPool: CacheUtils.ObjectPool,
    debounce: CacheUtils.debounce,
    throttle: CacheUtils.throttle,
    DeltaSync: CacheUtils.DeltaSync,
    
    // Configuration management
    ConfigManager,
    configManager: ConfigManager.configManager,
    
    // Notifier adapters
    NotifierAdapter: NotifierAdapter.NotifierAdapter,
    TelegramAdapter: NotifierAdapter.TelegramAdapter,
    ConsoleAdapter: NotifierAdapter.ConsoleAdapter,
    MultiChannelNotifier: NotifierAdapter.MultiChannelNotifier,
    createNotifier: NotifierAdapter.createNotifier
};
