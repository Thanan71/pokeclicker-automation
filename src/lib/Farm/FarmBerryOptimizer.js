/**
 * @class FarmBerryOptimizer handles berry scoring, selection and optimization
 * Follows Single Responsibility Principle - only handles berry optimization logic
 */
class FarmBerryOptimizer
{
    // Berry scoring cache for performance
    static __berryScoreCache = new Map();
    static __lastScoreCacheUpdate = 0;
    static SCORE_CACHE_DURATION = 30000; // 30 seconds

    // Farm Points optimization data
    static __fpOptimizationData = {
        bestBerry: null,
        bestFpPerMinute: 0,
        lastUpdate: 0
    };

    /**
     * @brief Safely checks if a berry type is unlocked
     *
     * @param berryType: The type of berry to check
     *
     * @returns True if the berry is unlocked, false otherwise
     */
    static isBerryUnlocked(berryType)
    {
        return App.game.farming.unlockedBerries[berryType] === true;
    }

    /**
     * @brief Calculates the Farm Points per minute for a given berry type
     *
     * @param berryType: The type of berry to calculate FP/min for
     *
     * @returns The Farm Points per minute value
     */
    static calculateFpPerMinute(berryType)
    {
        if (!this.isBerryUnlocked(berryType))
        {
            return 0;
        }

        const berryData = App.game.farming.berryData[berryType];
        if (!berryData)
        {
            return 0;
        }

        // Get growth time in minutes
        const growthTimeMinutes = berryData.growthTime[PlotStage.Bloom] / 60000;

        // Get harvest amount
        const harvestAmount = berryData.harvestAmount;

        // Get Farm Points value
        const fpValue = berryData.farmValue;

        // Calculate FP per minute: (harvestAmount * fpValue) / growthTimeMinutes
        const fpPerMinute = (harvestAmount * fpValue) / growthTimeMinutes;

        return fpPerMinute;
    }

    /**
     * @brief Calculates a comprehensive score for a berry based on multiple factors
     *
     * @param berryType: The type of berry to score
     *
     * @returns The berry score (higher is better)
     */
    static calculateBerryScore(berryType)
    {
        // Check cache first
        const now = Date.now();
        if (this.__berryScoreCache.has(berryType) &&
            (now - this.__lastScoreCacheUpdate) < this.SCORE_CACHE_DURATION)
        {
            return this.__berryScoreCache.get(berryType);
        }

        if (!this.isBerryUnlocked(berryType))
        {
            return 0;
        }

        const berryData = App.game.farming.berryData[berryType];
        if (!berryData)
        {
            return 0;
        }

        // Factor 1: Farm Points per minute (40% weight)
        const fpPerMinute = this.calculateFpPerMinute(berryType);
        const fpScore = fpPerMinute * 0.4;

        // Factor 2: Harvest amount efficiency (20% weight)
        const harvestScore = berryData.harvestAmount * 0.2;

        // Factor 3: Growth speed bonus (20% weight) - faster is better
        const growthTimeMinutes = berryData.growthTime[PlotStage.Bloom] / 60000;
        const speedScore = (1 / Math.max(growthTimeMinutes, 0.1)) * 20;

        // Factor 4: Mutation potential (10% weight)
        const mutationScore = this.calculateMutationPotential(berryType) * 0.1;

        // Factor 5: Rarity bonus (10% weight)
        const rarityScore = this.calculateRarityBonus(berryType) * 0.1;

        // Total score
        const totalScore = fpScore + harvestScore + speedScore + mutationScore + rarityScore;

        // Cache the result
        this.__berryScoreCache.set(berryType, totalScore);
        this.__lastScoreCacheUpdate = now;

        return totalScore;
    }

    /**
     * @brief Calculates mutation potential for a berry type
     *
     * @param berryType: The type of berry
     *
     * @returns Mutation potential score
     */
    static calculateMutationPotential(berryType)
    {
        let potential = 0;

        // Check how many mutations this berry can trigger
        for (const mutation of App.game.farming.mutations)
        {
            if (mutation.mutatedBerry === berryType)
            {
                potential += 10; // This berry is a mutation result
            }
            // Check if this berry is used in mutation requirements
            if (mutation.requirements)
            {
                for (const req of mutation.requirements)
                {
                    if (req.berry === berryType)
                    {
                        potential += 5; // This berry is used in mutations
                    }
                }
            }
        }

        return potential;
    }

    /**
     * @brief Calculates rarity bonus for a berry type
     *
     * @param berryType: The type of berry
     *
     * @returns Rarity bonus score
     */
    static calculateRarityBonus(berryType)
    {
        // Higher generation berries are rarer
        const berryGen = Math.floor(berryType / 8) + 1;
        return berryGen * 2;
    }

    /**
     * @brief Gets the best berry to plant based on current conditions
     *
     * @param {boolean} autoOptimizeEnabled: Whether auto-optimize is enabled
     * @param {number} selectedBerryType: The manually selected berry type
     *
     * @returns The best berry type to plant
     */
    static getBestBerryToPlant(autoOptimizeEnabled, selectedBerryType)
    {
        // If auto-optimize is disabled, use selected berry
        if (!autoOptimizeEnabled)
        {
            return selectedBerryType;
        }

        let bestBerry = BerryType.Cheri;
        let bestScore = 0;

        // Check all unlocked berries - iterate through the unlockedBerries array
        for (let berryType = 0; berryType < App.game.farming.unlockedBerries.length; berryType++)
        {
            // Skip if unlockedBerries[berryType] is not a function
            if (typeof App.game.farming.unlockedBerries[berryType] !== 'function')
            {
                continue;
            }

            // Check if unlocked (it's an observable)
            if (!App.game.farming.unlockedBerries[berryType]())
            {
                continue;
            }

            // Skip if no berries in inventory
            if (!App.game.farming.berryList[berryType] || App.game.farming.berryList[berryType]() === 0)
            {
                continue;
            }

            const score = this.calculateBerryScore(berryType);
            if (score > bestScore)
            {
                bestScore = score;
                bestBerry = berryType;
            }
        }

        return bestBerry;
    }

    /**
     * @brief Updates Farm Points optimization data
     *
     * @param {boolean} maximizeFpEnabled: Whether FP maximization is enabled
     */
    static updateFpOptimization(maximizeFpEnabled)
    {
        if (!maximizeFpEnabled)
        {
            return;
        }

        const now = Date.now();
        if ((now - this.__fpOptimizationData.lastUpdate) < 10000)
        {
            return; // Only update every 10 seconds
        }

        let bestBerry = BerryType.Cheri;
        let bestFpPerMinute = 0;

        for (let berryType = 0; berryType < Object.keys(BerryType).length / 2; berryType++)
        {
            if (!this.isBerryUnlocked(berryType))
            {
                continue;
            }

            const fpPerMinute = this.calculateFpPerMinute(berryType);
            if (fpPerMinute > bestFpPerMinute)
            {
                bestFpPerMinute = fpPerMinute;
                bestBerry = berryType;
            }
        }

        this.__fpOptimizationData.bestBerry = bestBerry;
        this.__fpOptimizationData.bestFpPerMinute = bestFpPerMinute;
        this.__fpOptimizationData.lastUpdate = now;
    }

    /**
     * @brief Gets the current FP optimization data
     *
     * @returns The FP optimization data object
     */
    static getFpOptimizationData()
    {
        return this.__fpOptimizationData;
    }

    /**
     * @brief Clears the berry score cache
     */
    static clearCache()
    {
        this.__berryScoreCache.clear();
        this.__lastScoreCacheUpdate = 0;
    }

    /**
     * @brief Checks if cache needs refresh
     *
     * @returns True if cache should be refreshed
     */
    static shouldRefreshCache()
    {
        return (Date.now() - this.__lastScoreCacheUpdate) > this.SCORE_CACHE_DURATION;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports)
{
    module.exports = FarmBerryOptimizer;
}
