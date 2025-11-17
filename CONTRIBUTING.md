# Contributing to Autonomous Minecraft Bot

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Help others learn and improve
- Focus on constructive feedback
- Keep discussions relevant and professional

## How to Contribute

### Reporting Bugs

When reporting bugs, please include:

1. **Clear title**: Describe the issue briefly
2. **Steps to reproduce**: Detailed steps to recreate the bug
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**:
   - Node.js version
   - Minecraft version
   - Operating system
   - Bot configuration (without sensitive data)
6. **Logs**: Relevant console output or error messages

Example:
```
**Bug**: Bot gets stuck when mining at Y=11

**Steps**:
1. Start bot on Minecraft 1.20.1 server
2. Wait for bot to initiate mining
3. Bot descends to Y=11
4. Bot stops moving

**Expected**: Bot should continue mining
**Actual**: Bot stops and doesn't respond
**Environment**: Node.js 18.0, Ubuntu 22.04
```

### Suggesting Features

For feature requests:

1. Check if it's already suggested in issues
2. Describe the feature clearly
3. Explain the use case and benefits
4. Consider implementation complexity
5. Be open to discussion and alternatives

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following code style guidelines
4. **Test your changes** (if possible)
5. **Commit with clear messages**: `git commit -m 'Add amazing feature'`
6. **Push to your branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ai-tg-bot.git
cd ai-tg-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your test server details
nano .env

# Run the bot
npm start
```

## Code Style Guidelines

### JavaScript Style

- Use **2 spaces** for indentation
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Use **UPPER_CASE** for constants
- Add **semicolons** at end of statements
- Use **async/await** instead of callbacks
- Add **JSDoc comments** for public functions

Example:
```javascript
/**
 * Collects wood from nearby trees
 * @param {number} count - Number of logs to collect
 * @returns {Promise<boolean>} Success status
 */
async collectWood(count = 20) {
    console.log(`Starting wood collection (target: ${count})`);
    // Implementation...
}
```

### File Organization

- **One class per file**
- **Descriptive file names**: `mining.js`, `combat.js`
- **Logical grouping**: Keep related functions together
- **Clear exports**: Export one main class per file

### Comments

- Write **clear, concise** comments
- Explain **why**, not just what
- Update comments when changing code
- Use TODO comments for future improvements

Good:
```javascript
// Retreat if health drops below threshold to avoid death
if (!this.safety.isSafe()) {
    await this.systems.combat.retreat();
}
```

Not good:
```javascript
// Check if safe
if (!this.safety.isSafe()) {
```

## Project Structure

```
ai-tg-bot/
├── index.js              # Main entry point - bot initialization
├── src/
│   ├── behavior.js       # Autonomous decision making
│   ├── safety.js         # Health and danger monitoring
│   ├── inventory.js      # Inventory and item management
│   ├── telegram.js       # Telegram notifications
│   ├── gathering.js      # Resource collection
│   ├── crafting.js       # Item crafting
│   ├── mining.js         # Mining operations
│   ├── building.js       # Structure building
│   ├── combat.js         # Combat and defense
│   └── farming.js        # Farming automation
├── package.json
├── .env.example
└── README.md
```

## Adding New Features

### Adding a New System

1. Create a new file in `src/`: `src/newsystem.js`
2. Implement the system class:

```javascript
class NewSystem {
    constructor(bot, pathfinder, notifier, inventoryManager) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        this.inventory = inventoryManager;
    }

    async doSomething() {
        console.log('Doing something');
        // Implementation
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = NewSystem;
```

3. Register in `index.js`:

```javascript
const NewSystem = require('./src/newsystem');

// In initializeSystems():
this.systems.newsystem = new NewSystem(
    this.bot,
    this.bot.pathfinder,
    this.systems.notifier,
    this.systems.inventory
);
```

4. Use in `src/behavior.js`:

```javascript
goals.push({
    name: 'use_new_system',
    priority: this.priorities.MEDIUM,
    action: async () => await this.systems.newsystem.doSomething()
});
```

### Adding a New Behavior

Add goals in `src/behavior.js`:

```javascript
// In chooseNextGoal() method
if (Math.random() < 0.3) {
    goals.push({
        name: 'my_custom_goal',
        priority: this.priorities.MEDIUM,
        action: async () => await this.myCustomAction()
    });
}

// Add the action method
async myCustomAction() {
    console.log('Executing custom action');
    // Your implementation
    await this.notifier.send('Custom action completed');
}
```

## Testing

Currently, testing requires a running Minecraft server. When testing:

1. **Use a test server**: Don't test on production servers
2. **Monitor console**: Watch for errors and unexpected behavior
3. **Check Telegram**: Verify notifications work correctly
4. **Test edge cases**: Low health, full inventory, no resources
5. **Run for extended time**: At least 30 minutes to see full behavior

### Manual Testing Checklist

- [ ] Bot connects successfully
- [ ] Bot spawns without errors
- [ ] Resource gathering works
- [ ] Tool crafting works
- [ ] Mining system operates correctly
- [ ] Combat/retreat works when threatened
- [ ] Building creates structures
- [ ] Farming plants and harvests
- [ ] Inventory management functions
- [ ] Telegram notifications send
- [ ] Bot handles death/respawn
- [ ] Bot reconnects after disconnect

## Documentation

When adding features, update:

1. **README.md**: Main documentation
2. **QUICKSTART.md**: If it affects setup
3. **CUSTOMIZATION.md**: If it adds customization options
4. **Code comments**: Inline documentation
5. **EXAMPLES.md**: If new config options

## Commit Messages

Use clear, descriptive commit messages:

**Good**:
- `Add diamond prioritization to mining system`
- `Fix pathfinding bug in building system`
- `Improve combat retreat logic`
- `Update Telegram notification formatting`

**Not good**:
- `fix bug`
- `updates`
- `changes`
- `test`

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

Example:
```
feat: Add automatic ore vein detection

Implements full ore vein detection when mining. When a valuable
ore is found, the bot now mines all connected ore blocks of the
same type before continuing.

- Adds findOreVein() method to mining system
- Improves ore collection efficiency
- Sends Telegram notification when vein is found

Closes #42
```

## Review Process

Pull requests will be reviewed for:

1. **Functionality**: Does it work as intended?
2. **Code quality**: Is it clean and maintainable?
3. **Documentation**: Are changes documented?
4. **Style**: Does it follow project conventions?
5. **Testing**: Has it been tested?

Be patient and receptive to feedback!

## Areas Needing Contribution

We especially welcome contributions in:

- **Testing framework**: Automated testing setup
- **Error handling**: More robust error recovery
- **Performance**: Optimization opportunities
- **Features**: New autonomous behaviors
- **Documentation**: Tutorials, guides, examples
- **Bug fixes**: See open issues
- **Pathfinding**: Improved navigation
- **Building**: More structure templates
- **Combat**: Advanced combat strategies

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Review documentation first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to make this bot better! 🤖
