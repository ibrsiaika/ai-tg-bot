# Troubleshooting Guide

Common issues and their solutions when running the Autonomous Minecraft Bot.

## Connection Issues

### "Error: connect ECONNREFUSED"

**Problem**: Cannot connect to Minecraft server

**Solutions**:
1. Verify the server is running:
   ```bash
   # Check if server is listening on the port
   netstat -an | grep 25565
   ```

2. Check `.env` settings:
   ```env
   MINECRAFT_HOST=localhost  # Or correct server IP
   MINECRAFT_PORT=25565      # Match server port
   ```

3. Test connection manually:
   ```bash
   # Try connecting with regular Minecraft client first
   # Or use telnet to test the port
   telnet localhost 25565
   ```

4. Check firewall settings:
   ```bash
   # On Linux, allow the port
   sudo ufw allow 25565
   ```

### "Authentication failed"

**Problem**: Server rejecting bot login

**Solutions**:
1. If server is in offline mode, set in `server.properties`:
   ```properties
   online-mode=false
   ```

2. Check username is not already in use

3. Verify server whitelist (if enabled):
   ```bash
   # In server console
   whitelist add AutoBot
   ```

4. Check server banned players list

## Bot Behavior Issues

### Bot Gets Stuck

**Problem**: Bot stops moving or responding

**Solutions**:
1. Check console for errors

2. Look for pathfinding issues:
   - Bot may be surrounded by blocks
   - Trying to reach unreachable location
   - In a loop detecting/avoiding danger

3. Manual intervention:
   - Restart the bot: `Ctrl+C` then `npm start`
   - Teleport bot in-game: `/tp AutoBot ~ ~10 ~`
   - Clear area around bot manually

4. Adjust behavior settings in `.env`:
   ```env
   MIN_HEALTH_PERCENT=70  # More cautious
   ```

### Bot Dies Repeatedly

**Problem**: Bot keeps dying after respawn

**Solutions**:
1. Check spawn area:
   - Clear hostile mobs nearby
   - Add lighting to prevent spawns
   - Build a safe spawn room

2. Increase safety thresholds:
   ```env
   MIN_HEALTH_PERCENT=80
   MIN_FOOD_LEVEL=15
   ```

3. Modify retreat behavior in `src/combat.js`:
   ```javascript
   // Increase retreat distance
   const escapePos = this.bot.entity.position.plus(escapeDirection.scaled(30));
   ```

4. Start bot during daytime:
   - Fewer hostile mobs
   - Easier to establish base

### Bot Not Finding Resources

**Problem**: Bot can't find wood, stone, or ores

**Solutions**:
1. Check the area:
   - Ensure resources are nearby
   - Bot has limited search radius (32-64 blocks)
   - May be in ocean/desert biome

2. Manually gather initial resources:
   - Give bot some starter items
   - Place resources nearby

3. Increase search radius in code:
   ```javascript
   // In src/gathering.js
   const tree = this.bot.findBlock({
       matching: block => woodTypes.includes(block.name),
       maxDistance: 128  // Increased from 64
   });
   ```

### Bot Not Crafting

**Problem**: Bot has resources but doesn't craft

**Solutions**:
1. Check inventory:
   - Bot may not have enough materials
   - Items may be in wrong format (logs vs planks)

2. Verify recipe availability:
   - Some recipes need crafting table
   - Bot should auto-craft table if needed

3. Debug crafting in console:
   ```javascript
   // Add to src/crafting.js
   console.log('Available recipes:', this.bot.recipesFor(item.id));
   ```

## Telegram Issues

### No Notifications Received

**Problem**: Telegram bot not sending messages

**Solutions**:
1. Verify token and chat ID:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdef...  # Should be long string
   TELEGRAM_CHAT_ID=987654321              # Numeric ID
   ```

2. Start conversation with bot:
   - Find bot in Telegram (use @username)
   - Send `/start` command
   - Try sending a test message

3. Check bot permissions:
   - Bot should have permission to send messages
   - Check with @BotFather if bot is active

4. Test token manually:
   ```bash
   curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
   ```

5. Enable console fallback (already enabled):
   - Notifications will print to console if Telegram fails
   - Check console output for error messages

### Telegram Rate Limiting

**Problem**: "Too many requests" error

**Solutions**:
1. Reduce notification frequency in code:
   ```javascript
   // Add rate limiting in src/telegram.js
   this.lastNotification = 0;
   const now = Date.now();
   if (now - this.lastNotification < 2000) return; // 2 second cooldown
   this.lastNotification = now;
   ```

2. Batch multiple updates:
   - Collect events and send summaries
   - Reduce spam from frequent actions

## Performance Issues

### High CPU Usage

**Problem**: Bot consuming too much CPU

**Solutions**:
1. Increase sleep delays:
   ```javascript
   // In autonomous loop (src/behavior.js)
   await this.sleep(10000); // Increased from 5000
   ```

2. Reduce pathfinding frequency:
   - Pathfinding is expensive
   - Cache paths when possible

3. Limit concurrent goals:
   - Bot tries to do too much
   - Simplify behavior priorities

### Memory Leaks

**Problem**: Memory usage grows over time

**Solutions**:
1. Restart bot periodically:
   ```bash
   # Use a process manager like PM2
   npm install -g pm2
   pm2 start index.js --name minecraft-bot
   pm2 restart minecraft-bot --cron "0 */6 * * *"  # Restart every 6 hours
   ```

2. Clear entity cache:
   ```javascript
   // Add to behavior loop
   if (Math.random() < 0.01) {
       this.bot.entities = {};
   }
   ```

## Inventory Issues

### Inventory Always Full

**Problem**: Bot's inventory fills up quickly

**Solutions**:
1. Increase junk removal:
   ```javascript
   // In src/inventory.js, expand junk list
   const junkItems = [
       'dirt', 'cobblestone', 'gravel', 'andesite', 
       'diorite', 'granite', 'rotten_flesh', 'poisonous_potato',
       'spider_eye', 'stone', 'netherrack'  // Add more
   ];
   ```

2. Build more storage:
   - Bot should auto-build chests
   - Manually place chests nearby

3. Reduce collection amounts:
   ```javascript
   // In src/behavior.js
   await this.systems.gathering.collectWood(10);  // Reduced from 20
   ```

### Can't Find Tools

**Problem**: Bot says it has no tools

**Solutions**:
1. Check tool durability:
   - Tools may be broken
   - Bot should auto-craft new ones

2. Manually give tools:
   ```
   /give AutoBot minecraft:stone_pickaxe
   /give AutoBot minecraft:stone_axe
   ```

3. Ensure crafting materials:
   - Need planks and sticks
   - Bot should gather automatically

## Mining Issues

### PartialReadError During Mining

**Problem**: Bot encounters `PartialReadError: Read error for undefined : undefined` when mining diamonds or other ores

**Explanation**: This is a protocol-level packet parsing error from the protodef library. It occurs when reading entity equipment packets from the Minecraft server and is typically non-fatal.

**Solutions**:
1. Error is now handled gracefully (as of latest update):
   - Bot logs the error but continues operating
   - No restart required
   - Mining operations continue normally

2. If bot still crashes with this error:
   ```bash
   # Update to latest version
   git pull
   npm install
   ```

3. Check Minecraft version compatibility:
   - Ensure server version matches bot configuration
   - Update `.env` if needed:
     ```env
     MINECRAFT_VERSION=1.20.1  # Match your server version
     ```

### Pathfinding Timeout ("Took too long to decide path to goal!")

**Problem**: Bot gets "Took too long to decide path to goal!" error when trying to mine

**Explanation**: Pathfinding can timeout when trying to reach difficult-to-access blocks

**Solutions**:
1. Now handled automatically with fallback (as of latest update):
   - Bot tries exact pathfinding first
   - Falls back to nearby goal if timeout occurs
   - Continues mining operations

2. If pathfinding still fails frequently:
   - Clear obstacles around mining areas
   - Bot may be in complex cave system
   - Try teleporting bot to open area

### Bot Falls in Caves

**Problem**: Bot falls into caves while mining

**Solutions**:
1. Improve descent logic in `src/mining.js`:
   ```javascript
   // More safety checks before descending
   const blockBelow2 = this.bot.blockAt(this.bot.entity.position.offset(0, -2, 0));
   const blockBelow3 = this.bot.blockAt(this.bot.entity.position.offset(0, -3, 0));
   if (!blockBelow2 || !blockBelow3 || blockBelow2.name === 'air') {
       console.log('Unsafe to descend, stopping');
       return;
   }
   ```

2. Start mining at safer depth:
   - Don't go too deep initially
   - Build down stairs manually first

### Bot Digs into Lava

**Problem**: Bot accidentally mines into lava

**Solutions**:
1. Improve lava detection (already implemented):
   ```javascript
   // In src/mining.js
   if (blockBelow2 && (blockBelow2.name === 'lava' || blockBelow2.name === 'flowing_lava')) {
       console.log('Lava detected below, stopping descent');
       return;
   }
   ```

2. Carry water bucket:
   - Manually give bot water bucket
   - Can extinguish lava

3. Mine at safer Y levels:
   - Y=11 is above lava lakes
   - Y=12+ is safer

## Building Issues

### Buildings Look Wrong

**Problem**: Structures not building correctly

**Solutions**:
1. Ensure flat terrain:
   - Bot builds better on flat ground
   - Manually flatten area first

2. Check material availability:
   - Need enough planks/blocks
   - Bot should gather automatically

3. Increase building area:
   ```javascript
   // In src/building.js
   const baseSize = 11;  // Increased from 7
   ```

### Can't Place Blocks

**Problem**: Bot can't place blocks

**Solutions**:
1. Check material in inventory

2. Verify block placement logic:
   - Needs reference block to place against
   - May need to build up from ground

3. Check game mode:
   - Should be survival mode
   - Creative mode may cause issues

## Farming Issues

### Crops Not Growing

**Problem**: Planted crops don't grow

**Solutions**:
1. Check water source:
   - Farmland needs water within 4 blocks
   - Bot should place water automatically

2. Verify lighting:
   - Crops need light level 9+
   - Bot should place torches

3. Check farmland:
   - Must be tilled (not dirt)
   - Bot uses hoe to create farmland

### Can't Harvest

**Problem**: Bot doesn't harvest mature crops

**Solutions**:
1. Check crop maturity detection:
   - Age must be 7 for wheat/carrots/potatoes
   - Debug in console

2. Verify bot pathfinding to crops

3. Manual testing:
   ```javascript
   // Add debug logging in src/farming.js
   console.log('Crop:', block.name, 'Age:', block.getProperties().age);
   ```

## Advanced Debugging

### Enable Verbose Logging

Add debug output throughout the code:

```javascript
// In index.js
process.env.DEBUG = 'minecraft-protocol';

// In any system file
console.log('[DEBUG] Current goal:', this.currentGoal);
console.log('[DEBUG] Inventory:', this.bot.inventory.items().map(i => i.name));
console.log('[DEBUG] Position:', this.bot.entity.position);
console.log('[DEBUG] Health:', this.bot.health, 'Food:', this.bot.food);
```

### Monitor Bot State

Create a status endpoint:

```javascript
// Add to index.js
const http = require('http');

http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
        position: this.bot.entity.position,
        health: this.bot.health,
        food: this.bot.food,
        inventory: this.bot.inventory.items().length,
        currentGoal: this.systems.behavior.currentGoal?.name
    }));
}).listen(3000);

console.log('Status available at http://localhost:3000');
```

### Use Process Manager

For production stability:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start index.js --name minecraft-bot

# Monitor
pm2 monit

# View logs
pm2 logs minecraft-bot

# Auto-restart on crash
pm2 startup
pm2 save
```

## Getting More Help

If you're still stuck:

1. **Check the logs**: Read console output carefully
2. **Search issues**: Look at GitHub issues for similar problems
3. **Create an issue**: Provide detailed information:
   - What you tried
   - Error messages
   - Environment details
   - Configuration (without secrets)
4. **Join discussions**: Ask in GitHub Discussions

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Can't connect to server | Check server is running |
| `Error: Invalid credentials` | Wrong username/password | Check authentication |
| `Timeout` | Operation took too long | Increase timeout or simplify task |
| `Cannot read property 'position' of undefined` | Entity doesn't exist | Add null checks |
| `Movement timeout` | Pathfinding failed | Clear path or reset bot |
| `Error: Too far` | Target out of reach | Move closer first |

---

Still having issues? Create a GitHub issue with:
- Detailed description
- Steps to reproduce
- Full error message
- Environment info
- Configuration (redacted)
