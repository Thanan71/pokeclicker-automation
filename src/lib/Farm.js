/**
 * @file Farm.js
 * @brief Farm automation module - Entry point for modular architecture
 *
 * Module structure:
 * - Farm/FarmMenuBuilder.js: UI/menu construction
 * - Farm/FarmPlotManager.js: Plot state management
 * - Farm/FarmMutationStrategies.js: Mutation/unlock strategies
 * - Farm/FarmBerryOptimizer.js: Berry utilities (simplified)
 * - Farm/FarmCore.js: Main coordinator class (AutomationFarm)
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */

// The AutomationFarm class is defined in Farm/FarmCore.js
// This file serves as the entry point and maintains backward compatibility
