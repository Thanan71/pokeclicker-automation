/**
 * @class AutomationFarm is the main class that coordinates all Farm automation modules
 * Follows Dependency Inversion Principle - depends on abstractions (other modules) not implementations
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationFarm
{
    static Settings = {
        AutoCatchWanderers: "Farming-AutoCatchWanderers",
        ColburNonsenseEnabled: "Farming-ColburNonsenseEnabled",
        FeatureEnabled: "Farming-Enabled",
        FocusOnUnlocks: "Farming-FocusOnUnlocks",
        HarvestLate: "Farming-HarvestLate",
        OakItemLoadoutUpdate: "Farming-OakItemLoadoutUpdate",
        SelectedBerryToPlant: "Farming-SelectedBerryToPlant",
        UseRichMulch: "Farming-UseRichMulch",
        UseShovel: "Farming-UseShovel",
        // Advanced settings
        AutoOptimizeBerries: "Farming-AutoOptimizeBerries",
        AutoMutations: "Farming-AutoMutations",
        MaximizeFarmPoints: "Farming-MaximizeFarmPoints",
        SmartPlotManagement: "Farming-SmartPlotManagement",
        OptimalTiming: "Farming-OptimalTiming"
    };

    // The berry type forced to plant by other features
    static ForcePlantBerriesAsked = null;

    // Internal state
    static __farmingContainer = null;
    static __contentFloatingContainer = null;
    static __contentFloatingContentContainer = null;
    static __berriesDropdownList = null;
    static __farmInGameModal = null;
    static __lockedBerries = [];
    static __farmingLoop = null;
    static __currentStrategy = null;
    static __lastFarmingBerryType = null;
    static __floatingPanelStateData = null;
    static __harvestCount = 0;
    static __freeSlotCount = 0;
    static __plantedBerryCount = 0;
    static __desiredLayout = null;

    /**
     * @brief Builds the menu, and initializes internal data
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Set default values for all settings
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoCatchWanderers, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.HarvestLate, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseRichMulch, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseShovel, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SelectedBerryToPlant, BerryType.Cheri);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ColburNonsenseEnabled, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoOptimizeBerries, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoMutations, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.MaximizeFarmPoints, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SmartPlotManagement, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.OptimalTiming, true);

            this.__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            FarmMutationStrategies.buildUnlockStrategySelection();
            this.__chooseUnlockStrategy();
            this.toggleAutoFarming();
        }
    }

    /**
     * @brief Toggles the 'Farming' feature
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     */
    static toggleAutoFarming(enable)
    {
        if (!App.game.farming.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");

            if (enable)
            {
                this.__contentFloatingContainer.hidden = false;
            }
            else
            {
                this.__contentFloatingContainer.hidden = true;
            }
        }

        if (enable)
        {
            if (this.__farmingLoop === null)
            {
                this.__farmingLoop = setInterval(this.__farmLoop.bind(this), 10000);
                this.__farmLoop();
            }
        }
        else
        {
            clearInterval(this.__farmingLoop);
            this.__farmingLoop = null;
            Automation.Utils.OakItem.ForbiddenItems = [];
        }
    }

    /**
     * @brief Toggles Colbur Nonsense mode
     */
    static toggleColburNonsense(enable)
    {
        if (enable)
        {
            Automation.Utils.LocalStorage.setValue(this.Settings.UseShovel, true);
            Automation.Utils.LocalStorage.setValue(this.Settings.HarvestLate, true);
            this.__desiredLayout = [51, 64, 0, 0, 0, 45, 45, 0, 50, 0, 0, 0, 0, 0, 0, 50, 0, 50, 0, 0, 0, 0, 0, 0, 0];
            console.log("✅ Mode Colbur Nonsense activé - layout chargé");
        }
        else
        {
            this.__desiredLayout = null;
        }
    }

    /*********************************************************************\
    |***    Private methods                                            ***|
    \*********************************************************************/

    /**
     * @brief Builds the complete menu
     */
    static __buildMenu()
    {
        // Build main menu using FarmMenuBuilder
        const { farmingContainer, autoFarmingButton } = FarmMenuBuilder.buildMenu(
            this.Settings,
            this.toggleAutoFarming.bind(this)
        );
        this.__farmingContainer = farmingContainer;

        // Only display the menu when the farm is unlocked
        if (!App.game.farming.canAccess())
        {
            this.__farmingContainer.hidden = true;
            this.__setFarmingUnlockWatcher();
        }

        // Build advanced settings panel
        const farmingSettingPanel = FarmMenuBuilder.buildAdvancedSettingsPanel(
            autoFarmingButton,
            this.Settings,
            this.__onUnlockButtonClick.bind(this)
        );

        // Build Colbur Nonsense toggle
        FarmMenuBuilder.buildColburNonsenseToggle(
            farmingSettingPanel,
            this.Settings,
            () => this.toggleColburNonsense(Automation.Utils.LocalStorage.getValue(this.Settings.ColburNonsenseEnabled) === "true")
        );

        // Build advanced farming features
        FarmMenuBuilder.buildAdvancedFarmingFeatures(farmingSettingPanel, this.Settings);

        // Build berry dropdown list
        this.__buildBerryDropdownList(farmingSettingPanel);

        // Build floating modal
        const { contentFloatingContainer, contentFloatingContentContainer } = FarmMenuBuilder.createFloatingModal("farmModal");
        this.__contentFloatingContainer = contentFloatingContainer;
        this.__contentFloatingContentContainer = contentFloatingContentContainer;
    }

    /**
     * @brief Handles unlock button click
     */
    static __onUnlockButtonClick()
    {
        const disableReason = "This settings is not considered when the\n"
            + "'Focus on unlocking plots and new berries' setting is enabled";

        if (Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
        {
            Automation.Menu.setButtonDisabledState(this.Settings.HarvestLate, true, disableReason);
        }

        const disableState = (Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true");
        Automation.Menu.setButtonDisabledState(this.Settings.HarvestLate, disableState, disableReason);

        if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true")
        {
            this.__updateFloatingPanel();
            this.__farmLoop();
        }
    }

    /**
     * @brief Builds the berry dropdown list
     */
    static __buildBerryDropdownList(parent)
    {
        const selectOptions = [];

        let savedSelectedBerry = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));

        if (!App.game.farming.unlockedBerries[savedSelectedBerry]())
        {
            Automation.Utils.LocalStorage.setValue(this.Settings.SelectedBerryToPlant, BerryType.Cheri);
            savedSelectedBerry = BerryType.Cheri;
        }

        const berryListCopy = [...FarmController.berryListFiltered()];
        berryListCopy.sort((a, b) => (BerryType[a] < BerryType[b]) ? -1 : 1);

        for (const berryId of berryListCopy)
        {
            const berryName = BerryType[berryId];

            const element = document.createElement("div");
            element.style.paddingTop = "1px";

            const image = document.createElement("img");
            image.src = `assets/images/items/berry/${berryName}.png`;
            image.style.height = "22px";
            image.style.marginRight = "5px";
            image.style.marginLeft = "5px";
            image.style.position = "relative";
            image.style.bottom = "1px";
            element.appendChild(image);

            if (!App.game.farming.unlockedBerries[berryId]())
            {
                this.__lockedBerries.push({ berryId, element });
                element.hidden = true;
            }

            element.appendChild(document.createTextNode(berryName));

            selectOptions.push({ value: berryId, element, selected: (berryId == savedSelectedBerry) });
        }

        const tooltip = "Choose which berry the automation should farm.\n"
            + "This setting is ignored if the berry/plot unlock is enabled.";
        this.__berriesDropdownList = Automation.Menu.createDropdownListWithHtmlOptions(selectOptions, "Berry to farm", tooltip);
        this.__berriesDropdownList.getElementsByTagName('button')[0].style.width = "118px";

        this.__berriesDropdownList.onValueChange = function ()
        {
            Automation.Utils.LocalStorage.setValue(this.Settings.SelectedBerryToPlant, this.__berriesDropdownList.selectedValue);
        }.bind(this);

        parent.appendChild(this.__berriesDropdownList);

        if (this.__lockedBerries.length != 0)
        {
            const watcher = setInterval(function ()
            {
                for (var i = this.__lockedBerries.length - 1; i >= 0; i--)
                {
                    const barryData = this.__lockedBerries[i];
                    if (App.game.farming.unlockedBerries[barryData.berryId]())
                    {
                        barryData.element.hidden = false;
                        this.__lockedBerries.splice(i, 1);
                    }
                }

                if (this.__lockedBerries.length == 0)
                {
                    clearInterval(watcher);
                }
            }.bind(this), 5000);
        }
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked
     */
    static __setFarmingUnlockWatcher()
    {
        const watcher = setInterval(function ()
        {
            if (App.game.farming.canAccess())
            {
                clearInterval(watcher);
                this.__farmingContainer.hidden = false;
                this.toggleAutoFarming();
            }
        }.bind(this), 10000);
    }

    /**
     * @brief The main Farming loop
     */
    static __farmLoop()
    {
        // Run enhanced farming features first
        this.__enhancedFarmLoop();

        this.__harvestAsEfficientAsPossible();

        if (Automation.Utils.LocalStorage.getValue(AutomationFarm.Settings.ColburNonsenseEnabled))
        {
            this.__maintainColburNonsense();
        }

        // Try to unlock berries, if enabled
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
            && (this.ForcePlantBerriesAsked == null))
        {
            this.__chooseUnlockStrategy();

            if (this.__currentStrategy)
            {
                this.__removeOakItemIfNeeded();
                this.__equipOakItemIfNeeded();
                this.__executeCurrentStrategy();
                this.__lastFarmingBerryType = null;
                return;
            }
        }
        else
        {
            this.__currentStrategy = null;
        }

        this.__updateFloatingPanel();

        // Otherwise, fallback to planting berries
        const autoOptimizeEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.AutoOptimizeBerries) === "true";
        const selectedBerryType = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));
        const berryToPlant = this.ForcePlantBerriesAsked ?? FarmBerryOptimizer.getBestBerryToPlant(autoOptimizeEnabled, selectedBerryType);

        // Remove any unwanted berry, if enabled
        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseShovel) === "true")
        {
            for (const index of App.game.farming.plotList.keys())
            {
                FarmPlotManager.removeAnyUnwantedBerry(index, berryToPlant, true);
            }
        }

        this.__plantedBerryCount = FarmPlotManager.plantAllBerries(berryToPlant);

        if (this.__plantedBerryCount > 0)
        {
            const berryName = BerryType[berryToPlant];
            const berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
            this.__sendNotif("Planted some " + berryName + " " + berryImage);
        }

        if (this.__currentStrategy !== null)
        {
            this.__currentStrategy = null;
        }
    }

    /**
     * @brief Enhanced farm loop with all advanced features
     */
    static __enhancedFarmLoop()
    {
        // Run continuous adaptation
        this.__continuousAdaptation();

        // Run smart plot management
        if (Automation.Utils.LocalStorage.getValue(this.Settings.SmartPlotManagement) === "true")
        {
            FarmPlotManager.scanPlotStates();
        }

        // Run optimal timing harvest
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OptimalTiming) === "true")
        {
            this.__optimalTimingHarvest();
        }

        // Run auto-mutations
        if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoMutations) === "true")
        {
            this.__handleAutoMutations();
        }

        // Update FP optimization
        const maximizeFpEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.MaximizeFarmPoints) === "true";
        FarmBerryOptimizer.updateFpOptimization(maximizeFpEnabled);

        // Catch wanderers
        const autoCatchEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.AutoCatchWanderers) === "true";
        FarmPlotManager.catchWanderingPokemons(autoCatchEnabled);
    }

    /**
     * @brief Performs continuous adaptation based on game state
     */
    static __continuousAdaptation()
    {
        FarmPlotManager.tryToUnlockNewSpots();

        if (FarmBerryOptimizer.shouldRefreshCache())
        {
            FarmBerryOptimizer.clearCache();
        }
    }

    /**
     * @brief Performs optimal timing for harvesting
     */
    static __optimalTimingHarvest()
    {
        FarmPlotManager.scanPlotStates();

        const richMulchEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.UseRichMulch) === "true";
        const harvestLateEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.HarvestLate) === "true";

        for (const plotState of FarmPlotManager.getPlotStates())
        {
            if (!plotState.isUnlocked || plotState.isEmpty || plotState.isSafeLocked)
            {
                continue;
            }

            if (plotState.stage !== PlotStage.Berry)
            {
                continue;
            }

            let shouldHarvest = false;

            if (harvestLateEnabled)
            {
                shouldHarvest = plotState.timeUntilWither < 30000;
            }
            else
            {
                shouldHarvest = true;
            }

            if (shouldHarvest)
            {
                FarmPlotManager.mulchAndHarvest(plotState.index, richMulchEnabled);
                this.__harvestCount++;
                this.__freeSlotCount++;
            }
        }
    }

    /**
     * @brief Detects and handles auto-mutations
     */
    static __handleAutoMutations()
    {
        for (const mutation of App.game.farming.mutations)
        {
            if (!mutation.unlocked)
            {
                continue;
            }

            // Simple mutation handling - can be expanded
        }
    }

    /**
     * @brief Harvests as efficiently as possible
     */
    static __harvestAsEfficientAsPossible()
    {
        this.__harvestCount = 0;
        this.__freeSlotCount = 0;
        this.__plantedBerryCount = 0;

        const focusOnUnlocksEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true";
        const harvestLateEnabled = !focusOnUnlocksEnabled && (Automation.Utils.LocalStorage.getValue(this.Settings.HarvestLate) === "true");
        const richMulchEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.UseRichMulch) === "true";
        const overallGrowthMultiplier = App.game.farming.getGrowthMultiplier();

        for (const [index, plot] of App.game.farming.plotList.entries())
        {
            if (plot.isSafeLocked)
            {
                continue;
            }

            if (plot.isEmpty())
            {
                if (plot.isUnlocked)
                {
                    this.__freeSlotCount++;
                }
                continue;
            }

            if (plot.stage() != PlotStage.Berry)
            {
                continue;
            }

            const isCurrentBerryTheTarget = (this.__currentStrategy?.berryToUnlock == plot.berry);

            if ((this.ForcePlantBerriesAsked == null) && !isCurrentBerryTheTarget)
            {
                if (this.__currentStrategy?.harvestStrategy === FarmMutationStrategies.HarvestTimingType.LetTheBerryDie)
                {
                    continue;
                }

                if ((this.__currentStrategy?.harvestStrategy === FarmMutationStrategies.HarvestTimingType.RightBeforeWithering)
                    || harvestLateEnabled)
                {
                    if (FarmPlotManager.getTimeUntilStage(plot, PlotStage.Berry, overallGrowthMultiplier) > 15)
                    {
                        continue;
                    }
                }
            }

            FarmPlotManager.mulchAndHarvest(index, richMulchEnabled);
            this.__harvestCount++;
            this.__freeSlotCount++;
        }
    }

    /**
     * @brief Maintains Colbur Nonsense layout
     */
    static __maintainColburNonsense()
    {
        const layout = this.__desiredLayout;
        if (!layout) return;

        App.game.farming.plotList.forEach((plot, index) =>
        {
            const desiredBerry = layout[index] ?? 0;

            if (plot.berry !== desiredBerry && !plot.isEmpty())
            {
                App.game.farming.harvest(index);
                App.game.farming.plant(index, desiredBerry);
            }
            else if (plot.stage() === PlotStage.Berry && plot.berry === 51)
            {
                App.game.farming.harvest(index);
                App.game.farming.plant(index, 0);
            }
        });
    }

    /**
     * @brief Updates the floating panel content
     */
    static __updateFloatingPanel()
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) !== "true")
        {
            return;
        }

        this.__floatingPanelStateData = null;

        if (this.__currentStrategy)
        {
            this.__lastFarmingBerryType = null;
            return;
        }

        const selectedBerryType = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));
        if (this.__lastFarmingBerryType != selectedBerryType)
        {
            const textPrefix = document.createTextNode("Currently planting ");

            const berryImage = document.createElement("img");
            const berryName = BerryType[selectedBerryType];
            berryImage.src = `assets/images/items/berry/${berryName}.png`;
            berryImage.style.height = "20px";

            const textSuffix = document.createTextNode(`${berryName} berries`);

            this.__contentFloatingContentContainer.innerHTML = "";
            this.__contentFloatingContentContainer.appendChild(textPrefix);
            this.__contentFloatingContentContainer.appendChild(document.createElement("br"));
            this.__contentFloatingContentContainer.appendChild(berryImage);
            this.__contentFloatingContentContainer.appendChild(textSuffix);

            this.__lastFarmingBerryType = selectedBerryType;
        }
    }

    /**
     * @brief Equips the needed Oak item
     */
    static __equipOakItemIfNeeded()
    {
        if ((this.__currentStrategy.oakItemToEquip === null)
            || (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true"))
        {
            return;
        }

        const currentLoadout = App.game.oakItems.itemList.filter((item) => item.isActive);

        if (!currentLoadout.some(item => (item.name == this.__currentStrategy.oakItemToEquip)))
        {
            if (currentLoadout.length === App.game.oakItems.maxActiveCount())
            {
                App.game.oakItems.deactivate(currentLoadout.reverse()[0].name);
            }

            App.game.oakItems.activate(this.__currentStrategy.oakItemToEquip);
        }
    }

    /**
     * @brief Removes the unwanted Oak item
     */
    static __removeOakItemIfNeeded()
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")
        {
            return;
        }

        Automation.Utils.OakItem.ForbiddenItems = this.__currentStrategy.forbiddenOakItems;

        for (const item of this.__currentStrategy.forbiddenOakItems)
        {
            App.game.oakItems.deactivate(item);
        }
    }

    /**
     * @brief Chooses the next unlock strategy
     */
    static __chooseUnlockStrategy()
    {
        this.__currentStrategy = FarmMutationStrategies.tryGetNextUnlockStrategy();

        if (this.__currentStrategy === null)
        {
            this.__disableAutoUnlock("No more automated unlock possible");
            Automation.Notifications.sendWarningNotif("No more automated unlock possible.\nDisabling the 'Auto unlock' feature", "Farming");
            return;
        }

        this.__checkOakItemRequirement();
        this.__checkPokemonRequirement();
        this.__checkDiscordLinkRequirement();

        if ((this.__currentStrategy !== null)
            && this.__currentStrategy.berryToUnlock
            && !App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == this.__currentStrategy.berryToUnlock).unlocked)
        {
            const berryName = BerryType[this.__currentStrategy.berryToUnlock];

            Automation.Menu.forceAutomationState(this.Settings.FocusOnUnlocks, false);
            Automation.Notifications.sendWarningNotif("Farming unlock disabled, you do not meet the requirements"
                + ` to unlock the ${berryName} berry`, "Farming");

            this.__disableAutoUnlock(`You do not meet the requirements to unlock the ${berryName} berry`);

            const watcher = setInterval(function ()
            {
                if (App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType[berryName]).unlocked)
                {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000);
        }
    }

    /**
     * @brief Executes the current strategy
     */
    static __executeCurrentStrategy()
    {
        if (!this.__currentStrategy)
        {
            return;
        }

        // Handle slot unlock strategies
        if (this.__currentStrategy.slotIndex !== undefined)
        {
            const slotIndex = this.__currentStrategy.slotIndex;
            const berryType = this.__currentStrategy.berryToUnlock;

            let berryToPlant = berryType;
            if (App.game.farming.plotBerryCost(slotIndex).amount <= App.game.farming.berryList[berryType]())
            {
                berryToPlant = BerryType.Cheri;
            }
            FarmPlotManager.plantAllBerries(berryToPlant);
            return;
        }

        // Handle mutation strategies
        if (this.__currentStrategy.berriesIndexes)
        {
            const berriesIndexes = this.__currentStrategy.berriesIndexes;
            const berriesOrder = Object.keys(berriesIndexes).map(x => parseInt(x)).sort(
                (a, b) => App.game.farming.berryData[b].growthTime[PlotStage.Bloom] - App.game.farming.berryData[a].growthTime[PlotStage.Bloom]
            );

            for (const berryType of berriesOrder)
            {
                FarmPlotManager.tryPlantBerryAtIndexes(berryType, berriesIndexes[berryType]);
            }
            return;
        }

        // Handle berry requirement strategies
        if (this.__currentStrategy.berriesToGather)
        {
            let plotIndex = 0;
            for (const berryType of this.__currentStrategy.berriesToGather)
            {
                if (!App.game.farming.hasBerry(berryType))
                {
                    continue;
                }

                let neededAmount = (this.__currentStrategy.berriesMinAmount - App.game.farming.berryList[berryType]());
                const berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;

                const alreadyPlantedCount = FarmPlotManager.getPlantedBerriesCount(berryType);
                neededAmount -= (alreadyPlantedCount * berryHarvestAmount);

                while ((neededAmount > 0) && (plotIndex <= 24) && App.game.farming.hasBerry(berryType))
                {
                    if (App.game.farming.plotList[plotIndex].isUnlocked
                        && App.game.farming.plotList[plotIndex].isEmpty())
                    {
                        App.game.farming.plant(plotIndex, berryType);
                        neededAmount -= (berryHarvestAmount - 1);
                    }
                    plotIndex++;
                }

                if (plotIndex > 24)
                {
                    break;
                }
            }

            FarmPlotManager.plantAllBerries(BerryType.Cheri);
        }
    }

    /**
     * @brief Checks Oak item requirement
     */
    static __checkOakItemRequirement()
    {
        if ((this.__currentStrategy == null)
            || (this.__currentStrategy.oakItemToEquip === null))
        {
            return;
        }

        const oakItem = App.game.oakItems.itemList[this.__currentStrategy.oakItemToEquip];

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")
            && !oakItem.isActive)
        {
            this.__disableAutoUnlock("The next unlock requires the '" + oakItem.displayName + "' Oak item\n"
                + "and loadout auto-update was disabled.\n"
                + "You can either equip it manually or turn auto-equip back on.");

            const watcher = setInterval(function ()
            {
                if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) === "true")
                    || oakItem.isActive)
                {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000);

            return;
        }

        if (oakItem.isUnlocked())
        {
            return;
        }

        this.__disableAutoUnlock("The '" + oakItem.displayName + "' Oak item is required for the next unlock");

        const watcher = setInterval(function ()
        {
            if (oakItem.isUnlocked())
            {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Checks Pokemon requirement
     */
    static __checkPokemonRequirement()
    {
        if ((this.__currentStrategy == null)
            || (this.__currentStrategy.requiredPokemon === null))
        {
            return;
        }

        const neededPokemonId = PokemonHelper.getPokemonByName(this.__currentStrategy.requiredPokemon).id;
        if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0)
        {
            return;
        }

        this.__disableAutoUnlock("You need to catch " + this.__currentStrategy.requiredPokemon
            + " (#" + neededPokemonId.toString() + ") for the next unlock");

        const watcher = setInterval(function ()
        {
            if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0)
            {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Checks Discord link requirement
     */
    static __checkDiscordLinkRequirement()
    {
        if ((this.__currentStrategy == null)
            || (!this.__currentStrategy.requiresDiscord))
        {
            return;
        }

        if (App.game.discord.ID() !== null)
        {
            const enigmaMutation = App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType.Enigma);

            if (enigmaMutation.hintsSeen.every((seen) => seen()))
            {
                return;
            }

            this.__disableAutoUnlock("You need to collect the four hints from the Kanto Berry Master\n"
                + "for the next unlock. He's located in Cerulean City.");
        }
        else
        {
            this.__disableAutoUnlock("A linked discord account is needed for the next unlock.");
        }

        const watcher = setInterval(function ()
        {
            if (App.game.discord.ID() === null)
            {
                return;
            }

            const enigmaMutation = App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType.Enigma);

            if (enigmaMutation.hintsSeen.every((seen) => seen()))
            {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Disables the 'Auto unlock' button
     */
    static __disableAutoUnlock(reason)
    {
        Automation.Menu.forceAutomationState(this.Settings.FocusOnUnlocks, false);
        Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, true, reason);
        Automation.Utils.OakItem.ForbiddenItems = [];
        this.__currentStrategy = null;
    }

    /**
     * @brief Sends the Farming automation notification
     */
    static __sendNotif(details)
    {
        if (this.__plantedBerryCount > 0)
        {
            Automation.Notifications.sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details, "Farming");
        }
    }
}
