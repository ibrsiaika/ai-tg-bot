const fs = require('fs');
const path = require('path');

/**
 * Plugin Manager for Custom Behaviors
 * Enables community extensions and custom bot behaviors
 */
class PluginManager {
    constructor(bot, systems, eventBus) {
        this.bot = bot;
        this.systems = systems;
        this.eventBus = eventBus;
        this.plugins = new Map();
        this.pluginsDirectory = path.join(process.cwd(), 'plugins');
        this.loadedPlugins = [];
    }

    /**
     * Initialize plugin system
     */
    async initialize() {
        try {
            // Ensure plugins directory exists
            if (!fs.existsSync(this.pluginsDirectory)) {
                fs.mkdirSync(this.pluginsDirectory, { recursive: true });
                console.log('✓ Created plugins directory');
            }

            console.log('🔌 Plugin Manager initialized');
            console.log(`  Plugins directory: ${this.pluginsDirectory}`);
            
            // Auto-load plugins
            await this.discoverAndLoadPlugins();
            
            return true;
        } catch (error) {
            console.error('Error initializing plugin manager:', error);
            return false;
        }
    }

    /**
     * Discover and load all plugins from plugins directory
     */
    async discoverAndLoadPlugins() {
        try {
            if (!fs.existsSync(this.pluginsDirectory)) {
                console.log('No plugins directory found');
                return [];
            }

            const pluginDirs = fs.readdirSync(this.pluginsDirectory)
                .filter(file => {
                    const fullPath = path.join(this.pluginsDirectory, file);
                    return fs.statSync(fullPath).isDirectory();
                });

            console.log(`Found ${pluginDirs.length} potential plugin(s)`);

            for (const dir of pluginDirs) {
                try {
                    await this.loadPlugin(dir);
                } catch (error) {
                    console.error(`Failed to load plugin '${dir}':`, error.message);
                }
            }

            return this.loadedPlugins;
        } catch (error) {
            console.error('Error discovering plugins:', error);
            return [];
        }
    }

    /**
     * Load a single plugin
     */
    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginsDirectory, pluginName);
            
            // Check for package.json
            const packagePath = path.join(pluginPath, 'package.json');
            if (!fs.existsSync(packagePath)) {
                console.warn(`Plugin '${pluginName}' missing package.json, skipping`);
                return null;
            }

            // Load package.json
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Check version compatibility
            const compatible = this.checkCompatibility(packageData);
            if (!compatible) {
                console.warn(`Plugin '${pluginName}' not compatible with current bot version`);
                return null;
            }

            // Load plugin main file
            const mainFile = packageData.main || 'index.js';
            const pluginMainPath = path.join(pluginPath, mainFile);
            
            if (!fs.existsSync(pluginMainPath)) {
                console.warn(`Plugin '${pluginName}' main file not found: ${mainFile}`);
                return null;
            }

            // Require the plugin
            const PluginClass = require(pluginMainPath);
            
            // Instantiate plugin
            const plugin = new PluginClass(this.bot, this.systems);
            
            // Validate plugin interface
            if (!this.validatePlugin(plugin)) {
                console.warn(`Plugin '${pluginName}' does not implement required interface`);
                return null;
            }

            // Load the plugin
            await plugin.onLoad();
            
            // Store plugin
            this.plugins.set(pluginName, {
                instance: plugin,
                metadata: packageData,
                loadedAt: Date.now()
            });

            this.loadedPlugins.push(pluginName);
            
            console.log(`✓ Loaded plugin: ${plugin.getName()} v${plugin.getVersion()}`);
            
            if (this.eventBus) {
                this.eventBus.emit('plugin:loaded', {
                    name: plugin.getName(),
                    version: plugin.getVersion()
                });
            }

            return plugin;
        } catch (error) {
            console.error(`Error loading plugin '${pluginName}':`, error);
            return null;
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                console.warn(`Plugin '${pluginName}' not found`);
                return false;
            }

            // Call onUnload
            await plugin.instance.onUnload();
            
            // Remove from loaded plugins
            this.plugins.delete(pluginName);
            const index = this.loadedPlugins.indexOf(pluginName);
            if (index > -1) {
                this.loadedPlugins.splice(index, 1);
            }

            console.log(`✓ Unloaded plugin: ${pluginName}`);
            
            if (this.eventBus) {
                this.eventBus.emit('plugin:unloaded', { name: pluginName });
            }

            return true;
        } catch (error) {
            console.error(`Error unloading plugin '${pluginName}':`, error);
            return false;
        }
    }

    /**
     * Reload a plugin
     */
    async reloadPlugin(pluginName) {
        try {
            console.log(`Reloading plugin: ${pluginName}`);
            
            await this.unloadPlugin(pluginName);
            
            // Clear require cache
            const pluginPath = path.join(this.pluginsDirectory, pluginName);
            Object.keys(require.cache).forEach(key => {
                if (key.startsWith(pluginPath)) {
                    delete require.cache[key];
                }
            });
            
            await this.loadPlugin(pluginName);
            
            console.log(`✓ Reloaded plugin: ${pluginName}`);
            return true;
        } catch (error) {
            console.error(`Error reloading plugin '${pluginName}':`, error);
            return false;
        }
    }

    /**
     * Validate plugin implements required interface
     */
    validatePlugin(plugin) {
        const requiredMethods = ['onLoad', 'onUnload', 'getName', 'getVersion'];
        
        for (const method of requiredMethods) {
            if (typeof plugin[method] !== 'function') {
                console.error(`Plugin missing required method: ${method}`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check version compatibility
     */
    checkCompatibility(packageData) {
        if (!packageData.botVersion) {
            return true; // No version requirement
        }

        // In real implementation, would check semver compatibility
        // For now, simple check
        const currentVersion = '4.0.0';
        const requiredVersion = packageData.botVersion;
        
        console.log(`Plugin requires bot version: ${requiredVersion}`);
        console.log(`Current bot version: ${currentVersion}`);
        
        // Simple major version check
        const currentMajor = parseInt(currentVersion.split('.')[0]);
        const requiredMajor = parseInt(requiredVersion.split('.')[0]);
        
        return currentMajor >= requiredMajor;
    }

    /**
     * Get plugin info
     */
    getPluginInfo(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            return null;
        }

        return {
            name: plugin.instance.getName(),
            version: plugin.instance.getVersion(),
            description: plugin.metadata.description || 'No description',
            author: plugin.metadata.author || 'Unknown',
            loadedAt: plugin.loadedAt,
            uptime: Date.now() - plugin.loadedAt
        };
    }

    /**
     * Get all loaded plugins
     */
    listPlugins() {
        const plugins = [];
        
        for (const [name, plugin] of this.plugins) {
            plugins.push({
                name: plugin.instance.getName(),
                version: plugin.instance.getVersion(),
                description: plugin.metadata.description || 'No description',
                enabled: true
            });
        }

        return plugins;
    }

    /**
     * Get plugin statistics
     */
    getStats() {
        return {
            totalPlugins: this.plugins.size,
            loadedPlugins: this.loadedPlugins,
            pluginsDirectory: this.pluginsDirectory
        };
    }

    /**
     * Unload all plugins
     */
    async unloadAll() {
        console.log('Unloading all plugins...');
        
        for (const pluginName of this.loadedPlugins) {
            await this.unloadPlugin(pluginName);
        }
        
        console.log('✓ All plugins unloaded');
    }
}

/**
 * Base Plugin Class
 * Extend this class to create custom plugins
 */
class BasePlugin {
    constructor(bot, systems) {
        this.bot = bot;
        this.systems = systems;
    }

    /**
     * Called when plugin is loaded
     */
    async onLoad() {
        throw new Error('onLoad() must be implemented');
    }

    /**
     * Called when plugin is unloaded
     */
    async onUnload() {
        throw new Error('onUnload() must be implemented');
    }

    /**
     * Get plugin name
     */
    getName() {
        throw new Error('getName() must be implemented');
    }

    /**
     * Get plugin version
     */
    getVersion() {
        throw new Error('getVersion() must be implemented');
    }
}

module.exports = PluginManager;
module.exports.BasePlugin = BasePlugin;
