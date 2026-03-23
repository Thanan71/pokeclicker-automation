/**
 * @file Farm.js
 * @brief Farm automation module - Entry point for modular architecture
 *
 * This file has been refactored to follow SOLID principles:
 * - Single Responsibility: Each module handles one concern
 * - Open/Closed: New features can be added without modifying existing code
 * - Liskov Substitution: Modules can be substituted if they implement the same interface
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: High-level modules depend on abstractions
 *
 * Module structure:
 * - Farm/FarmMenuBuilder.js: UI/menu construction
 * - Farm/FarmBerryOptimizer.js: Berry scoring and optimization
 * - Farm/FarmPlotManager.js: Plot state management
 * - Farm/FarmMutationStrategies.js: Mutation/unlock strategies
 * - Farm/FarmCore.js: Main coordinator class (AutomationFarm)
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */

// Re-export the main class for backward compatibility
// The AutomationFarm class is defined in Farm/FarmCore.js
// This allows existing code to continue using AutomationFarm without changes
