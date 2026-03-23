/**
 * @file index.js
 * @brief Farm module index - exports all Farm-related classes
 *
 * This module follows SOLID principles by separating concerns:
 * - FarmMenuBuilder: UI/menu construction (Single Responsibility)
 * - FarmBerryOptimizer: Berry scoring and optimization (Single Responsibility)
 * - FarmPlotManager: Plot state management (Single Responsibility)
 * - FarmMutationStrategies: Mutation/unlock strategies (Single Responsibility)
 * - AutomationFarm: Main coordinator (Dependency Inversion)
 */

// Import all Farm modules
// Note: In the browser environment, these are loaded via script tags
// This file serves as documentation and potential module system support

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
