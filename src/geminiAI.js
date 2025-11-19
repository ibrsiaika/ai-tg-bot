const { GoogleGenerativeAI } = require('@google/generative-ai');
const CONSTANTS = require('./constants');

/**
 * Google Gemini AI Integration
 * Provides intelligent decision-making and contextual assistance using Gemini Flash model (free tier)
 */
class GeminiAI {
    constructor(apiKey, notifier) {
        this.notifier = notifier;
        this.apiKey = apiKey;
        this.genAI = null;
        this.model = null;
        this.conversationHistory = [];
        this.maxHistoryLength = 10;
        this.isEnabled = false;
        
        // Initialize if API key is provided
        if (this.apiKey && this.apiKey.trim() !== '') {
            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                // Use gemini-1.5-flash model (free tier)
                this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                this.isEnabled = true;
                console.log('✓ Gemini AI initialized with Flash model');
            } catch (error) {
                console.error('Error initializing Gemini AI:', error.message);
                this.isEnabled = false;
            }
        } else {
            console.log('Gemini AI not configured (no API key)');
        }
    }

    /**
     * Check if Gemini AI is enabled and ready
     */
    isReady() {
        return this.isEnabled && this.model !== null;
    }

    /**
     * Get AI decision for current game state
     * @param {Object} gameState - Current bot state (health, food, inventory, position, etc.)
     * @returns {Promise<Object>} AI decision with action and reasoning
     */
    async getDecision(gameState) {
        if (!this.isReady()) {
            return null;
        }

        try {
            const prompt = this.buildDecisionPrompt(gameState);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse AI response
            const decision = this.parseAIResponse(text);
            
            // Store in conversation history
            this.addToHistory('decision', { prompt, response: text });
            
            return decision;
        } catch (error) {
            console.error('Error getting AI decision:', error.message);
            return null;
        }
    }

    /**
     * Get crafting suggestions based on current resources and needs
     * @param {Object} inventory - Current inventory state
     * @param {Object} needs - What the bot currently needs
     * @returns {Promise<Array>} List of suggested items to craft
     */
    async getCraftingSuggestions(inventory, needs) {
        if (!this.isReady()) {
            return [];
        }

        try {
            const prompt = `You are an expert Minecraft survival strategist. Based on the following situation, suggest what items to craft (prioritized list):

Current Inventory:
${JSON.stringify(inventory, null, 2)}

Current Needs:
${JSON.stringify(needs, null, 2)}

Provide a prioritized list of 3-5 items to craft. Format your response as a JSON array of objects with 'item' and 'reason' fields.
Only suggest items that can be crafted with available resources. Be concise and practical.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Try to parse JSON from response
            const suggestions = this.extractJSONFromText(text);
            
            return Array.isArray(suggestions) ? suggestions : [];
        } catch (error) {
            console.error('Error getting crafting suggestions:', error.message);
            return [];
        }
    }

    /**
     * Get building recommendations based on base state
     * @param {Object} baseState - Current base/building state
     * @returns {Promise<Object>} Building recommendations
     */
    async getBuildingAdvice(baseState) {
        if (!this.isReady()) {
            return null;
        }

        try {
            const prompt = `You are a Minecraft base building expert. Analyze this base state and provide ONE specific building recommendation:

Base State:
${JSON.stringify(baseState, null, 2)}

Respond with a JSON object containing:
{
  "structure": "name of structure to build",
  "priority": "high/medium/low",
  "reason": "brief explanation (one sentence)",
  "materials": ["required", "materials"]
}

Only suggest ONE thing. Be specific and practical.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const advice = this.extractJSONFromText(text);
            
            return advice;
        } catch (error) {
            console.error('Error getting building advice:', error.message);
            return null;
        }
    }

    /**
     * Analyze danger situation and get survival advice
     * @param {Object} dangerState - Current danger context
     * @returns {Promise<string>} Recommended action
     */
    async getDangerResponse(dangerState) {
        if (!this.isReady()) {
            return 'retreat';
        }

        try {
            const prompt = `You are a Minecraft survival expert. A bot is in danger. Recommend ONE action:

Danger Context:
${JSON.stringify(dangerState, null, 2)}

Respond with ONLY ONE WORD from: retreat, fight, hide, eat, heal, escape
Be decisive and quick.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim().toLowerCase();
            
            // Validate response
            const validActions = ['retreat', 'fight', 'hide', 'eat', 'heal', 'escape'];
            const action = validActions.find(a => text.includes(a)) || 'retreat';
            
            return action;
        } catch (error) {
            console.error('Error getting danger response:', error.message);
            return 'retreat';
        }
    }

    /**
     * Build a decision-making prompt from game state
     */
    buildDecisionPrompt(gameState) {
        return `You are an autonomous Minecraft bot AI. Make a decision based on current state:

Health: ${gameState.health}/20
Food: ${gameState.food}/20
Time: ${gameState.timeOfDay < 13000 ? 'Day' : 'Night'}
Position: ${JSON.stringify(gameState.position)}
Nearby Threats: ${gameState.threats || 'none'}
Inventory Status: ${gameState.inventoryFull ? 'Full' : 'Available'}
Current Tools: ${JSON.stringify(gameState.tools)}

Prioritize in this order:
1. Safety (health, food, threats)
2. Tool maintenance
3. Resource gathering
4. Building/crafting
5. Exploration

Respond with a JSON object:
{
  "action": "one of: gather_wood, mine_stone, craft_tools, build_shelter, explore, retreat, eat, heal",
  "priority": "critical/high/medium/low",
  "reasoning": "one sentence explanation"
}`;
    }

    /**
     * Parse AI response to extract decision
     */
    parseAIResponse(text) {
        try {
            // Try to extract JSON from the text
            const decision = this.extractJSONFromText(text);
            
            if (decision && decision.action) {
                return decision;
            }
            
            // Fallback: simple text parsing
            return {
                action: 'gather_wood',
                priority: 'medium',
                reasoning: 'AI response parsing failed, using default'
            };
        } catch (error) {
            console.error('Error parsing AI response:', error.message);
            return null;
        }
    }

    /**
     * Extract JSON from text that might contain markdown or extra text
     */
    extractJSONFromText(text) {
        try {
            // Remove markdown code blocks if present
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Try to find JSON object in the text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Try to find JSON array
            const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
            
            // If no match, try parsing the whole text
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Failed to extract JSON from AI response');
            return null;
        }
    }

    /**
     * Add entry to conversation history
     */
    addToHistory(type, data) {
        this.conversationHistory.push({
            timestamp: Date.now(),
            type,
            data
        });
        
        // Keep history limited
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory.shift();
        }
    }

    /**
     * Get AI analysis of bot performance
     * @param {Object} metrics - Performance metrics
     * @returns {Promise<string>} AI analysis and suggestions
     */
    async analyzePerformance(metrics) {
        if (!this.isReady()) {
            return 'AI analysis not available';
        }

        try {
            const prompt = `Analyze this Minecraft bot's performance and give 2-3 brief suggestions:

Metrics:
${JSON.stringify(metrics, null, 2)}

Provide concise, actionable suggestions to improve efficiency.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            return text.trim();
        } catch (error) {
            console.error('Error analyzing performance:', error.message);
            return 'Performance analysis failed';
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }
}

module.exports = GeminiAI;
