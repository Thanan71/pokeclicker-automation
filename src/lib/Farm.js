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

// Import all Farm modules
// Note: In browser environment, these are loaded via script tags in ComponentLoader.js
// This file serves as the entry point and maintains backward compatibility

// The AutomationFarm class is defined in Farm/FarmCore.js
// This file ensures backward compatibility by re-exporting it
// All functionality has been split into focused modules following SOLID principles
