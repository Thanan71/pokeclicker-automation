/**
 * @class FarmPlotManager handles plot state tracking and management
 * Follows Single Responsibility Principle - only handles plot-related operations
 */
class FarmPlotManager
{
    // Plot state tracking
    static __plotStates = [];
    static __lastPlotScan = 0;
    static PLOT_SCAN_INTERVAL = 5000; // 5 seconds

    /**
     * @brief Scans and updates plot states for smart management
     */
    static scanPlotStates()
    {
        const now = Date.now();
        if ((now - this.__lastPlotScan) < this.PLOT_SCAN_INTERVAL)
        {
            return; // Only scan every 5 seconds
        }

        this.__plotStates = [];
        this.__lastPlotScan = now;

        for (const [index, plot] of App.game.farming.plotList.entries())
        {
            const state = {
                index: index,
                isUnlocked: plot.isUnlocked,
                isEmpty: plot.isEmpty(),
                berry: plot.berry,
                stage: plot.stage(),
                age: plot.age,
                isSafeLocked: plot.isSafeLocked,
                hasWanderer: plot.wanderer !== null,
                mulch: plot.mulch,
                timeUntilRipe: plot.isEmpty() ? 0 : this.getTimeUntilStage(plot, PlotStage.Berry),
                timeUntilWither: plot.isEmpty() ? 0 : this.getTimeUntilStage(plot, PlotStage.Berry) +
                    (plot.berryData?.growthTime[PlotStage.Berry] || 0) - plot.age
            };
            this.__plotStates.push(state);
        }
    }

    /**
     * @brief Gets the current plot states
     *
     * @returns Array of plot state objects
     */
    static getPlotStates()
    {
        return this.__plotStates;
    }

    /**
     * @brief Gets the time until a plot gets past a specific stage
     *
     * @param plot: The plot to check the time left before the end of the given stage
     * @param stage: The stage to check
     * @param overallGrowthMultiplier: The farming overall growth multiplier (from oak items)
     *
     * @returns The time until the plot gets past the specified stage, as seconds
     */
    static getTimeUntilStage(plot, stage, overallGrowthMultiplier = App.game.farming.getGrowthMultiplier())
    {
        const baseTimeLeft = plot.berryData.growthTime[stage] - plot.age;
        const growthMultiplier = plot.getGrowthMultiplier() * overallGrowthMultiplier;
        const timeLeft = baseTimeLeft / growthMultiplier;
        return timeLeft;
    }

    /**
     * @brief Gets the planted count for the given berry type
     *
     * @param berryType: The type of the berry
     *
     * @returns The number of planted berries of the given type
     */
    static getPlantedBerriesCount(berryType)
    {
        return App.game.farming.plotList.reduce(
            (count, plot) => count + ((plot.berryData && (plot.berry == berryType)) ? 1 : 0),
            0
        );
    }

    /**
     * @brief Counts free (empty and unlocked) slots
     *
     * @returns The number of free slots
     */
    static countFreeSlots()
    {
        let count = 0;
        for (const plot of App.game.farming.plotList)
        {
            if (plot.isEmpty() && plot.isUnlocked && !plot.isSafeLocked)
            {
                count++;
            }
        }
        return count;
    }

    /**
     * @brief Tries to unlock new spots if the player has the required resources
     */
    static tryToUnlockNewSpots()
    {
        for (const [index, plot] of App.game.farming.plotList.entries())
        {
            if (!plot.isUnlocked)
            {
                FarmController.plotClick(index, { shiftKey: false });
            }
        }
    }

    /**
     * @brief Removes any unwanted berry from the plot at the given index
     *
     * @param {number} index: The index of the plot to clean
     * @param expectedBerryType: The expected berry type, any other type would be cleaned
     * @param {boolean} canUseShovel: If set to true, the shovel will be used to remove the berry if it can't be harvested
     *
     * @returns False if the plot still contains a berry, true otherwise
     */
    static removeAnyUnwantedBerry(index, expectedBerryType, canUseShovel = true)
    {
        const plot = App.game.farming.plotList[index];

        if (!plot.isUnlocked)
        {
            return false;
        }

        // If the plot is empty, there is nothing to do
        if (plot.isEmpty())
        {
            return true;
        }

        // Only consider unwanted berries
        if (plot.berry === expectedBerryType)
        {
            return false;
        }

        if (plot.stage() == PlotStage.Berry)
        {
            App.game.farming.harvest(index);
        }
        // Try to use the shovel if enabled
        else if (canUseShovel)
        {
            App.game.farming.shovel(index);
        }

        return plot.isEmpty();
    }

    /**
     * @brief Tries to plant the given berry at the given index
     *
     * @param index: The index of the spot to plant the berry in
     * @param berryType: The type of the berry to plant
     * @param removeAnyUnwantedBerry: If set to true, any unwanted berry at the given index will be removed
     *
     * @returns True if a berry was planted, false otherwise
     */
    static tryPlantBerryAtIndex(index, berryType, removeAnyUnwantedBerry = true)
    {
        const plot = App.game.farming.plotList[index];

        if (!plot.isUnlocked)
        {
            return false;
        }

        // Remove any mutation that might have occurred, as soon as possible
        if (removeAnyUnwantedBerry && !this.removeAnyUnwantedBerry(index, berryType))
        {
            return false;
        }

        if (berryType === BerryType.None)
        {
            return false;
        }

        if (App.game.farming.hasBerry(berryType))
        {
            App.game.farming.plant(index, berryType);
            return true;
        }

        return false;
    }

    /**
     * @brief Tries to plant the given berry in the selected indexes
     *
     * @param berryType: The type of the berry to plant
     * @param indexes: The list of indexes of the spot to plant the berry in
     */
    static tryPlantBerryAtIndexes(berryType, indexes)
    {
        for (const index of indexes)
        {
            this.tryPlantBerryAtIndex(index, berryType);
        }
    }

    /**
     * @brief Plants all available slots with the given berry
     *
     * @param berryToPlant: The berry type to plant
     *
     * @returns The number of berries planted
     */
    static plantAllBerries(berryToPlant)
    {
        let plantedCount = 0;
        const selectedBerryCount = App.game.farming.berryList[berryToPlant]();

        if (selectedBerryCount > 0)
        {
            App.game.farming.plantAll(berryToPlant);
            plantedCount = Math.min(this.countFreeSlots(), selectedBerryCount);
        }

        return plantedCount;
    }

    /**
     * @brief Applies rich mulch if enabled, then harvests the given slot
     *
     * @param {number} index: The plot index to harvest
     * @param {boolean} applyRichMulch: If set to true, rich mulch will be applied
     *
     * @returns The number of berries harvested (1 or 0)
     */
    static mulchAndHarvest(index, applyRichMulch = false)
    {
        const plot = App.game.farming.plotList[index];

        // Don't harvest if the plot contains a wandering pokémon being captured
        if (plot.wanderer && plot.wanderer.catching())
        {
            return 0;
        }

        // Only apply rich mulch if the plot doesn't already have mulch
        if (applyRichMulch && (plot.mulch === MulchType.None))
        {
            App.game.farming.addMulch(index, MulchType.Rich_Mulch);
        }

        App.game.farming.harvest(index);
        return 1;
    }

    /**
     * @brief Catches any wandering pokémon present on any farm plot
     *
     * @param {boolean} autoCatchEnabled: Whether auto-catch is enabled
     */
    static catchWanderingPokemons(autoCatchEnabled)
    {
        if (!autoCatchEnabled)
        {
            return;
        }

        for (const plot of App.game.farming.plotList)
        {
            if (plot.isEmpty() || !plot.canCatchWanderer())
            {
                continue;
            }

            // Throw a ball at the wandering pokémon
            App.game.farming.handleWanderer(plot);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports)
{
    module.exports = FarmPlotManager;
}
