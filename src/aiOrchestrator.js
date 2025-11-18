const CONSTANTS = require('./constants');

/**
 * AI Orchestrator - Hybrid Intelligence System
 * 
 * Decides the optimal division of labor between:
 * - Gemini AI (strategic, complex decisions)
 * - Bot's Brain (intelligence.js - learned patterns, fast decisions)
 * - Rule-based systems (immediate reactions)
 * 
 * This is the "game changer" component that makes the bot truly intelligent
 */
class AIOrchestrator {
    constructor(bot, systems, notifier) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        this.geminiAI = systems.geminiAI;
        this.intelligence = systems.intelligence;
        
        // Decision routing metrics
        this.decisionMetrics = {
            aiDecisions: 0,
            brainDecisions: 0,
            ruleDecisions: 0,
            hybridDecisions: 0
        };
        
        // Performance tracking
        this.aiResponseTimes = [];
        this.brainResponseTimes = [];
        
        // Decision cache to avoid redundant AI calls
        this.decisionCache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes
        
        // AI call budget (rate limiting)
        this.aiCallsThisHour = 0;
        this.maxAICallsPerHour = 100; // Stay within free tier
        this.lastHourReset = Date.now();
        
        // Hybrid decision thresholds
        this.COMPLEXITY_THRESHOLD = 0.7; // Above this, use AI
        this.URGENCY_THRESHOLD = 0.8; // Above this, skip AI (too urgent)
        this.CONFIDENCE_THRESHOLD = 0.6; // Below this, consult AI
        
        console.log('✓ AI Orchestrator initialized - Hybrid intelligence active');
    }

    /**
     * Main decision routing - decides WHO makes the decision
     * @param {Object} context - Decision context
     * @returns {Promise<Object>} Decision with metadata
     */
    async routeDecision(context) {
        const {
            type, // 'strategic', 'tactical', 'reactive'
            complexity, // 0-1 scale
            urgency, // 0-1 scale
            stateSnapshot // Current game state
        } = context;

        // Check cache first
        const cacheKey = this.getCacheKey(context);
        const cached = this.getCachedDecision(cacheKey);
        if (cached) {
            return { ...cached, source: 'cache' };
        }

        // Reset hourly AI call counter
        this.resetHourlyCounter();

        // Decision routing logic
        let decision, source;

        // RULE 1: Reactive decisions always use bot brain (instant)
        if (type === 'reactive' || urgency > this.URGENCY_THRESHOLD) {
            decision = await this.getBrainDecision(stateSnapshot);
            source = 'brain';
            this.decisionMetrics.brainDecisions++;
        }
        // RULE 2: Strategic + complex + AI available = use AI
        else if (
            type === 'strategic' &&
            complexity > this.COMPLEXITY_THRESHOLD &&
            this.canUseAI() &&
            this.geminiAI?.isReady()
        ) {
            const startTime = Date.now();
            decision = await this.getAIDecision(stateSnapshot);
            this.trackAIResponseTime(Date.now() - startTime);
            source = 'ai';
            this.decisionMetrics.aiDecisions++;
            this.aiCallsThisHour++;
        }
        // RULE 3: Low confidence in brain = consult AI
        else if (this.shouldConsultAI(stateSnapshot)) {
            decision = await this.getHybridDecision(stateSnapshot);
            source = 'hybrid';
            this.decisionMetrics.hybridDecisions++;
        }
        // RULE 4: Default to brain (learned patterns)
        else {
            decision = await this.getBrainDecision(stateSnapshot);
            source = 'brain';
            this.decisionMetrics.brainDecisions++;
        }

        // Cache the decision
        this.cacheDecision(cacheKey, decision);

        return { ...decision, source, timestamp: Date.now() };
    }

    /**
     * Get decision from Gemini AI
     */
    async getAIDecision(gameState) {
        try {
            return await this.geminiAI.getDecision(gameState);
        } catch (error) {
            console.error('AI decision failed, falling back to brain:', error.message);
            return this.getBrainDecision(gameState);
        }
    }

    /**
     * Get decision from bot's intelligence system
     */
    async getBrainDecision(gameState) {
        const startTime = Date.now();
        
        // Use intelligence system's learned patterns
        const mostNeeded = this.intelligence.getMostNeededResource();
        const nearestResource = this.intelligence.findNearestKnownResource(mostNeeded.resource);
        
        this.trackBrainResponseTime(Date.now() - startTime);
        
        return {
            action: nearestResource ? `gather_${mostNeeded.resource}` : 'explore',
            priority: mostNeeded.priority > 0.7 ? 'high' : 'medium',
            reasoning: `Brain: ${mostNeeded.resource} needed (priority ${mostNeeded.priority.toFixed(2)})`,
            confidence: this.intelligence.getConfidence(mostNeeded.resource)
        };
    }

    /**
     * Hybrid decision: Consult both AI and brain, use best
     */
    async getHybridDecision(gameState) {
        // Get both decisions in parallel
        const [aiDecision, brainDecision] = await Promise.all([
            this.canUseAI() ? this.getAIDecision(gameState) : null,
            this.getBrainDecision(gameState)
        ]);

        // If AI failed or unavailable, use brain
        if (!aiDecision) {
            return brainDecision;
        }

        // Combine insights: AI provides strategy, brain provides execution
        return {
            action: aiDecision.action || brainDecision.action,
            priority: aiDecision.priority || brainDecision.priority,
            reasoning: `Hybrid: AI suggests ${aiDecision.action}, Brain has ${brainDecision.confidence.toFixed(2)} confidence`,
            confidence: Math.max(
                brainDecision.confidence || 0.5,
                this.estimateAIConfidence(aiDecision)
            ),
            aiInsight: aiDecision.reasoning,
            brainInsight: brainDecision.reasoning
        };
    }

    /**
     * Decide if we should consult AI based on brain's confidence
     */
    shouldConsultAI(gameState) {
        if (!this.canUseAI()) return false;
        
        // Get brain's confidence
        const brainDecision = this.intelligence.getMostNeededResource();
        const confidence = this.intelligence.getConfidence(brainDecision.resource) || 0.5;
        
        // Low confidence = consult AI
        return confidence < this.CONFIDENCE_THRESHOLD;
    }

    /**
     * Check if we can use AI (within budget)
     */
    canUseAI() {
        return this.aiCallsThisHour < this.maxAICallsPerHour && 
               this.geminiAI?.isReady();
    }

    /**
     * Reset hourly counter
     */
    resetHourlyCounter() {
        const now = Date.now();
        if (now - this.lastHourReset > 3600000) { // 1 hour
            this.aiCallsThisHour = 0;
            this.lastHourReset = now;
        }
    }

    /**
     * Cache management
     */
    getCacheKey(context) {
        return `${context.type}_${context.complexity}_${Math.floor(context.urgency * 10)}`;
    }

    getCachedDecision(key) {
        const cached = this.decisionCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.decision;
        }
        return null;
    }

    cacheDecision(key, decision) {
        this.decisionCache.set(key, {
            decision,
            timestamp: Date.now()
        });
    }

    /**
     * Performance tracking
     */
    trackAIResponseTime(ms) {
        this.aiResponseTimes.push(ms);
        if (this.aiResponseTimes.length > 100) {
            this.aiResponseTimes.shift();
        }
    }

    trackBrainResponseTime(ms) {
        this.brainResponseTimes.push(ms);
        if (this.brainResponseTimes.length > 100) {
            this.brainResponseTimes.shift();
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const avgAITime = this.aiResponseTimes.length > 0 
            ? this.aiResponseTimes.reduce((a, b) => a + b, 0) / this.aiResponseTimes.length 
            : 0;
        const avgBrainTime = this.brainResponseTimes.length > 0
            ? this.brainResponseTimes.reduce((a, b) => a + b, 0) / this.brainResponseTimes.length
            : 0;

        return {
            ...this.decisionMetrics,
            avgAIResponseTime: avgAITime.toFixed(2) + 'ms',
            avgBrainResponseTime: avgBrainTime.toFixed(2) + 'ms',
            aiCallsRemaining: this.maxAICallsPerHour - this.aiCallsThisHour,
            cacheSize: this.decisionCache.size,
            efficiency: this.calculateEfficiency()
        };
    }

    /**
     * Calculate overall efficiency
     */
    calculateEfficiency() {
        const total = this.decisionMetrics.aiDecisions + 
                     this.decisionMetrics.brainDecisions + 
                     this.decisionMetrics.hybridDecisions;
        
        if (total === 0) return 100;
        
        // Efficiency = (fast decisions + cached) / total
        const fastDecisions = this.decisionMetrics.brainDecisions;
        const efficiency = (fastDecisions / total) * 100;
        
        return efficiency.toFixed(1) + '%';
    }

    /**
     * Estimate AI confidence from response
     */
    estimateAIConfidence(aiDecision) {
        if (!aiDecision || !aiDecision.priority) return 0.5;
        
        const priorityMap = {
            'critical': 0.95,
            'high': 0.8,
            'medium': 0.6,
            'low': 0.4
        };
        
        return priorityMap[aiDecision.priority] || 0.5;
    }

    /**
     * Get strategic recommendations (AI-powered)
     */
    async getStrategicPlan(objectives) {
        if (!this.canUseAI()) {
            return this.getBrainStrategicPlan(objectives);
        }

        try {
            const prompt = `You are a Minecraft strategy AI. Given these objectives, create a prioritized action plan:
${JSON.stringify(objectives, null, 2)}

Return a JSON array of steps with: action, priority, resources_needed, estimated_time.
Be concise and practical.`;

            const result = await this.geminiAI.model.generateContent(prompt);
            const response = await result.response;
            const plan = this.geminiAI.extractJSONFromText(response.text());
            
            this.aiCallsThisHour++;
            return plan || this.getBrainStrategicPlan(objectives);
        } catch (error) {
            console.error('Strategic planning failed:', error.message);
            return this.getBrainStrategicPlan(objectives);
        }
    }

    /**
     * Fallback strategic planning using brain
     */
    getBrainStrategicPlan(objectives) {
        // Use intelligence system to create plan
        const plan = [];
        
        for (const objective of objectives) {
            plan.push({
                action: objective.name,
                priority: objective.priority || 'medium',
                resources_needed: objective.resources || [],
                estimated_time: '5 minutes'
            });
        }
        
        return plan;
    }

    /**
     * Report performance to Telegram
     */
    async reportPerformance() {
        const metrics = this.getMetrics();
        await this.notifier.send(
            `🧠 AI Orchestrator Report:\n` +
            `AI Decisions: ${metrics.aiDecisions}\n` +
            `Brain Decisions: ${metrics.brainDecisions}\n` +
            `Hybrid: ${metrics.hybridDecisions}\n` +
            `Efficiency: ${metrics.efficiency}\n` +
            `AI Calls Remaining: ${metrics.aiCallsRemaining}/hr`
        );
    }
}

module.exports = AIOrchestrator;
