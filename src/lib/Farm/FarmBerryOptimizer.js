/**
 * @class FarmBerryOptimizer handles berry selection
 * Simplified version - auto-optimization removed for cleaner code
 */
class FarmBerryOptimizer
{
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
}
