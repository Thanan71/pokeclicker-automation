/**
 * @file index.js
 * @brief Farm module index - exports all Farm-related classes
 *
 * Module structure:
 * - FarmMenuBuilder: UI/menu construction
 * - FarmPlotManager: Plot state management
 * - FarmMutationStrategies: Mutation/unlock strategies
 * - FarmBerryOptimizer: Berry utilities (simplified)
 * - AutomationFarm: Main coordinator class (FarmCore)
 */

if (typeof module !== 'undefined' && module.exports)
{
    module.exports = {
        FarmMenuBuilder: require('./FarmMenuBuilder'),
        FarmBerryOptimizer: require('./FarmBerryOptimizer'),
        FarmPlotManager: require('./FarmPlotManager'),
        FarmMutationStrategies: require('./FarmMutationStrategies'),
        AutomationFarm: require('./FarmCore')
    };
}
