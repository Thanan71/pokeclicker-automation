/**
 * @class AutomationFarm is the main class that coordinates all Farm automation modules
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationFarm {
    static Settings = {
        AutoCatchWanderers: "Farming-AutoCatchWanderers",
        ColburNonsenseEnabled: "Farming-ColburNonsenseEnabled",
        FeatureEnabled: "Farming-Enabled",
        FocusOnUnlocks: "Farming-FocusOnUnlocks",
        HarvestLate: "Farming-HarvestLate",
        OakItemLoadoutUpdate: "Farming-OakItemLoadoutUpdate",
        SelectedBerryToPlant: "Farming-SelectedBerryToPlant",
        UseRichMulch: "Farming-UseRichMulch",
        UseShovel: "Farming-UseShovel"
    };

    // The berry type forced to plant by other features
    static ForcePlantBerriesAsked = null;

    // Internal state
    static __farmingContainer = null;
    static __contentFloatingContainer = null;
    static __contentFloatingContentContainer = null;
    static __berriesDropdownList = null;
    static __lockedBerries = [];
    static __farmingLoop = null;
    static __currentStrategy = null;
    static __lastFarmingBerryType = null;
    static __harvestCount = 0;
    static __freeSlotCount = 0;
    static __plantedBerryCount = 0;
    static __desiredLayout = null;

    /**
     * @brief Builds the menu, and initializes internal data
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep) {
        if (initStep == Automation.InitSteps.BuildMenu) {
            // Set default values for all settings
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoCatchWanderers, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.HarvestLate, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseRichMulch, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseShovel, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SelectedBerryToPlant, BerryType.Cheri);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ColburNonsenseEnabled, false);

            // Load Colbur Nonsense layout if enabled
            if (Automation.Utils.LocalStorage.getValue(this.Settings.ColburNonsenseEnabled) === "true") {
                console.log("🔄 Colbur Nonsense: Loading layout from localStorage (was enabled)");
                // Layout from wiki:
                // Babiri  Petaya  Cheri  Cheri  Cheri
                // Payapa  Payapa  Cheri  Colbur Cheri
                // Cheri   Cheri   Cheri  Cheri  Cheri
                // Cheri   Colbur  Cheri  Colbur Cheri
                // Cheri   Cheri   Cheri  Cheri  Cheri
                this.__desiredLayout = [50, 64, 1, 1, 1, 45, 45, 1, 51, 1, 1, 1, 1, 1, 1, 1, 51, 1, 51, 1, 1, 1, 1, 1, 1];
                console.log("✅ Colbur Nonsense: Layout loaded:", this.__desiredLayout);
            }
            else {
                console.log("ℹ️ Colbur Nonsense: Mode not enabled during initialization");
            }

            this.__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize) {
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
    static toggleAutoFarming(enable) {
        if (!App.game.farming.canAccess()) {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false)) {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");

            if (enable) {
                this.__contentFloatingContainer.hidden = false;
            }
            else {
                this.__contentFloatingContainer.hidden = true;
            }
        }

        if (enable) {
            if (this.__farmingLoop === null) {
                this.__farmingLoop = setInterval(this.__farmLoop.bind(this), 10000);
                this.__farmLoop();
            }
        }
        else {
            clearInterval(this.__farmingLoop);
            this.__farmingLoop = null;
            Automation.Utils.OakItem.ForbiddenItems = [];
        }
    }

    /**
     * @brief Toggles Colbur Nonsense mode
     */
    static toggleColburNonsense(enable) {
        if (enable) {
            console.log("🔧 Colbur Nonsense: Enabling mode");
            Automation.Utils.LocalStorage.setValue(this.Settings.ColburNonsenseEnabled, true);
            Automation.Utils.LocalStorage.setValue(this.Settings.UseShovel, true);
            Automation.Utils.LocalStorage.setValue(this.Settings.HarvestLate, true);
            // Layout from wiki:
            // Babiri  Petaya  Cheri  Cheri  Cheri
            // Payapa  Payapa  Cheri  Colbur Cheri
            // Cheri   Cheri   Cheri  Cheri  Cheri
            // Cheri   Colbur  Cheri  Colbur Cheri
            // Cheri   Cheri   Cheri  Cheri  Cheri
            this.__desiredLayout = [50, 64, 1, 1, 1, 45, 45, 1, 51, 1, 1, 1, 1, 1, 1, 1, 51, 1, 51, 1, 1, 1, 1, 1, 1];
            console.log("✅ Colbur Nonsense: Mode enabled with layout:", this.__desiredLayout);
            console.log("✅ Colbur Nonsense: UseShovel set to true");
            console.log("✅ Colbur Nonsense: HarvestLate set to true");
        }
        else {
            console.log("🔧 Colbur Nonsense: Disabling mode");
            Automation.Utils.LocalStorage.setValue(this.Settings.ColburNonsenseEnabled, false);
            this.__desiredLayout = null;
            console.log("✅ Colbur Nonsense: Mode disabled, layout cleared");
        }
    }

    /*********************************************************************\
    |***    Private methods                                            ***|
    \*********************************************************************/

    /**
     * @brief Builds the complete menu
     */
    static __buildMenu() {
        console.log("🔧 Colbur Nonsense: Building menu");

        // Build main menu using FarmMenuBuilder
        const { farmingContainer, autoFarmingButton } = FarmMenuBuilder.buildMenu(
            this.Settings,
            this.toggleAutoFarming.bind(this)
        );
        this.__farmingContainer = farmingContainer;

        // Only display the menu when the farm is unlocked
        if (!App.game.farming.canAccess()) {
            console.log("🔒 Colbur Nonsense: Farm not accessible, hiding menu");
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
        console.log("🔧 Colbur Nonsense: Building toggle button");
        FarmMenuBuilder.buildColburNonsenseToggle(
            farmingSettingPanel,
            this.Settings,
            () => {
                const currentState = Automation.Utils.LocalStorage.getValue(this.Settings.ColburNonsenseEnabled) === "true";
                console.log(`🔧 Colbur Nonsense: Toggle clicked, current state: ${currentState}`);
                this.toggleColburNonsense(!currentState);
            }
        );

        // Build berry dropdown list
        this.__buildBerryDropdownList(farmingSettingPanel);

        // Build floating modal
        const { contentFloatingContainer, contentFloatingContentContainer } = FarmMenuBuilder.createFloatingModal("farmModal");
        this.__contentFloatingContainer = contentFloatingContainer;
        this.__contentFloatingContentContainer = contentFloatingContentContainer;

        console.log("✅ Colbur Nonsense: Menu built successfully");
    }

    /**
     * @brief Handles unlock button click
     */
    static __onUnlockButtonClick() {
        const disableReason = "This settings is not considered when the\n"
            + "'Focus on unlocking plots and new berries' setting is enabled";

        const disableState = (Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true");
        Automation.Menu.setButtonDisabledState(this.Settings.HarvestLate, disableState, disableReason);

        if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true") {
            this.__updateFloatingPanel();
            this.__farmLoop();
        }
    }

    /**
     * @brief Builds the berry dropdown list
     */
    static __buildBerryDropdownList(parent) {
        const selectOptions = [];

        let savedSelectedBerry = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));

        if (!App.game.farming.unlockedBerries[savedSelectedBerry]()) {
            Automation.Utils.LocalStorage.setValue(this.Settings.SelectedBerryToPlant, BerryType.Cheri);
            savedSelectedBerry = BerryType.Cheri;
        }

        const berryListCopy = [...FarmController.berryListFiltered()];
        berryListCopy.sort((a, b) => (BerryType[a] < BerryType[b]) ? -1 : 1);

        for (const berryId of berryListCopy) {
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

            if (!App.game.farming.unlockedBerries[berryId]()) {
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

        this.__berriesDropdownList.onValueChange = function () {
            Automation.Utils.LocalStorage.setValue(this.Settings.SelectedBerryToPlant, this.__berriesDropdownList.selectedValue);
        }.bind(this);

        parent.appendChild(this.__berriesDropdownList);

        if (this.__lockedBerries.length != 0) {
            const watcher = setInterval(function () {
                for (var i = this.__lockedBerries.length - 1; i >= 0; i--) {
                    const barryData = this.__lockedBerries[i];
                    if (App.game.farming.unlockedBerries[barryData.berryId]()) {
                        barryData.element.hidden = false;
                        this.__lockedBerries.splice(i, 1);
                    }
                }

                if (this.__lockedBerries.length == 0) {
                    clearInterval(watcher);
                }
            }.bind(this), 5000);
        }
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked
     */
    static __setFarmingUnlockWatcher() {
        const watcher = setInterval(function () {
            if (App.game.farming.canAccess()) {
                clearInterval(watcher);
                this.__farmingContainer.hidden = false;
                this.toggleAutoFarming();
            }
        }.bind(this), 10000);
    }

    /**
     * @brief The main Farming loop
     */
    static __farmLoop() {
        const colburNonsenseEnabled = Automation.Utils.LocalStorage.getValue(AutomationFarm.Settings.ColburNonsenseEnabled);
        const featureEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true";

        console.log("🔄 Farm Loop: Starting iteration");
        console.log(`📊 Farm Loop: Feature enabled: ${featureEnabled}, Colbur Nonsense enabled: ${colburNonsenseEnabled}`);
        console.log(`📊 Farm Loop: Desired layout: ${this.__desiredLayout}`);

        // If Colbur Nonsense is enabled, ONLY run Colbur Nonsense logic
        if (colburNonsenseEnabled) {
            console.log("🔄 Colbur Nonsense: Running maintenance loop");
            this.__maintainColburNonsense();
            return;
        }

        // Catch wanderers
        const autoCatchEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.AutoCatchWanderers) === "true";
        FarmPlotManager.catchWanderingPokemons(autoCatchEnabled);

        // Try to unlock new spots
        FarmPlotManager.tryToUnlockNewSpots();

        // Run normal harvest logic
        this.__harvestAsEfficientAsPossible();

        // Try to unlock berries, if enabled
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
            && (this.ForcePlantBerriesAsked == null)) {
            this.__chooseUnlockStrategy();

            if (this.__currentStrategy) {
                this.__removeOakItemIfNeeded();
                this.__equipOakItemIfNeeded();
                this.__executeCurrentStrategy();
                this.__lastFarmingBerryType = null;
                return;
            }
        }
        else {
            this.__currentStrategy = null;
        }

        this.__updateFloatingPanel();

        // Otherwise, fallback to planting berries
        const selectedBerryType = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));
        const berryToPlant = this.ForcePlantBerriesAsked ?? selectedBerryType;

        // Remove any unwanted berry, if enabled
        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseShovel) === "true") {
            for (const index of App.game.farming.plotList.keys()) {
                FarmPlotManager.removeAnyUnwantedBerry(index, berryToPlant, true);
            }
        }

        this.__plantedBerryCount = FarmPlotManager.plantAllBerries(berryToPlant);

        if (this.__plantedBerryCount > 0) {
            const berryName = BerryType[berryToPlant];
            const berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
            this.__sendNotif("Planted some " + berryName + " " + berryImage);
        }

        if (this.__currentStrategy !== null) {
            this.__currentStrategy = null;
        }
    }

    /**
     * @brief Harvests as efficiently as possible
     */
    static __harvestAsEfficientAsPossible() {
        this.__harvestCount = 0;
        this.__freeSlotCount = 0;
        this.__plantedBerryCount = 0;

        const focusOnUnlocksEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true";
        const harvestLateEnabled = !focusOnUnlocksEnabled && (Automation.Utils.LocalStorage.getValue(this.Settings.HarvestLate) === "true");
        const richMulchEnabled = Automation.Utils.LocalStorage.getValue(this.Settings.UseRichMulch) === "true";
        const overallGrowthMultiplier = App.game.farming.getGrowthMultiplier();

        for (const [index, plot] of App.game.farming.plotList.entries()) {
            if (plot.isSafeLocked) {
                continue;
            }

            if (plot.isEmpty()) {
                if (plot.isUnlocked) {
                    this.__freeSlotCount++;
                }
                continue;
            }

            if (plot.stage() != PlotStage.Berry) {
                continue;
            }

            const isCurrentBerryTheTarget = (this.__currentStrategy?.berryToUnlock == plot.berry);

            if ((this.ForcePlantBerriesAsked == null) && !isCurrentBerryTheTarget) {
                if (this.__currentStrategy?.harvestStrategy === FarmMutationStrategies.HarvestTimingType.LetTheBerryDie) {
                    continue;
                }

                if ((this.__currentStrategy?.harvestStrategy === FarmMutationStrategies.HarvestTimingType.RightBeforeWithering)
                    || harvestLateEnabled) {
                    if (FarmPlotManager.getTimeUntilStage(plot, PlotStage.Berry, overallGrowthMultiplier) > 15) {
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
     * @brief Maintains Colbur Nonsense layout for Farm Points optimization
     * Layout from wiki:
     * Babiri  Petaya  Cheri  Cheri  Cheri
     * Payapa  Payapa  Cheri  Colbur Cheri
     * Cheri   Cheri   Cheri  Cheri  Cheri
     * Cheri   Colbur  Cheri  Colbur Cheri
     * Cheri   Cheri   Cheri  Cheri  Cheri
     *
     * - Index 0: Babiri (50) - protects Petaya, plant immediately when empty
     * - Index 1: Petaya (64) - reference time for planting, plant immediately when empty
     * - Index 2,3,4,7,9,10,11,12,13,14,15,17,19,20,21,22,23,24: Cheri (1) - plant immediately when empty, harvest and replant when ripe
     * - Index 5,6: Payapa (45) - Mutation Chance up aura, plant at correct timing
     * - Index 8,16,18: Colbur (51) - harvest when ripe, replant Cheri (Colbur will overtake Cheri again)
     *
     * Strategy: Colbur is a Parasite Berry that overtakes Cheri.
     * Harvest Colbur when ripe, then replant Cheri. Colbur will overtake Cheri again.
     * This maximizes Farm Points per second (Colbur gives 2300 FP vs Cheri's 5 FP).
     *
     * Planting timing (relative to Petaya planted first):
     * - Petaya: Planted first (reference time)
     * - Babiri: 18:00:00 after Petaya (or 11:59:56 with Mulch/Sprayduck, or 07:59:54 with both)
     * - Payapa: 09:30:00 after Petaya (or 06:19:58 with Mulch/Sprayduck, or 04:13:17 with both)
     * - Colbur: 07:30:00 after Petaya (or 04:59:58 with Mulch/Sprayduck, or 03:19:58 with both)
     * - Cheri: Plant immediately when empty, harvest and replant when ripe
     */
    static __maintainColburNonsense() {
        const layout = this.__desiredLayout;
        if (!layout) {
            console.log("❌ Colbur Nonsense: Layout is null, cannot maintain");
            return;
        }

        console.log("🔄 Colbur Nonsense: Starting maintenance with layout:", layout);

        let actionsPerformed = 0;

        // Calculate planting times based on growth multipliers
        const hasMulch = Automation.Utils.LocalStorage.getValue(this.Settings.UseRichMulch) === "true";
        const hasSprayduck = App.game.oakItems.itemList[OakItemType.Sprayduck]?.isActive ?? false;

        // Base times in seconds (from Petaya planting)
        // Calculated so all berries mature at the same time as Petaya (28800s)
        // Petaya: 28800s, Babiri: 14400s, Payapa: 7200s, Colbur: 3600s, Cheri: 1800s
        const baseTimes = {
            babiri: 14400,  // 4:00:00 (28800 - 14400)
            payapa: 21600,  // 6:00:00 (28800 - 7200)
            colbur: 25200   // 7:00:00 (28800 - 3600)
        };

        let adjustedTimes = { ...baseTimes };

        if (hasMulch && hasSprayduck) {
            // Both Mulch and Sprayduck (growth time / 2.5)
            // Petaya: 11520s, Babiri: 5760s, Payapa: 2880s, Colbur: 1440s, Cheri: 720s
            adjustedTimes.babiri = 5760;   // 1:36:00 (11520 - 5760)
            adjustedTimes.payapa = 8640;   // 2:24:00 (11520 - 2880)
            adjustedTimes.colbur = 10080;  // 2:48:00 (11520 - 1440)
        }
        else if (hasMulch || hasSprayduck) {
            // Mulch or Sprayduck (growth time / 1.5)
            // Petaya: 19200s, Babiri: 9600s, Payapa: 4800s, Colbur: 2400s, Cheri: 1200s
            adjustedTimes.babiri = 9600;   // 2:40:00 (19200 - 9600)
            adjustedTimes.payapa = 14400;  // 4:00:00 (19200 - 4800)
            adjustedTimes.colbur = 16800;  // 4:40:00 (19200 - 2400)
        }

        console.log(`📊 Colbur Nonsense: Planting times (Mulch: ${hasMulch}, Sprayduck: ${hasSprayduck}):`);
        console.log(`  Babiri: ${adjustedTimes.babiri}s`);
        console.log(`  Payapa: ${adjustedTimes.payapa}s`);
        console.log(`  Colbur: ${adjustedTimes.colbur}s`);

        // Check if Petaya has been planted (reference time)
        const petayaPlot = App.game.farming.plotList[1];
        const petayaPlanted = !petayaPlot.isEmpty() && petayaPlot.berry === BerryType.Petaya;
        let timeSincePetayaPlanted = 0;

        if (petayaPlanted) {
            // Get Petaya planting time (approximate based on age)
            const petayaAge = petayaPlot.age;
            const petayaGrowthTime = App.game.farming.berryData[BerryType.Petaya].growthTime[PlotStage.Berry];
            timeSincePetayaPlanted = petayaAge;

            console.log(`📊 Colbur Nonsense: Petaya age: ${petayaAge}s, growth time: ${petayaGrowthTime}s`);
        }
        else {
            console.log("⏳ Colbur Nonsense: Petaya not planted yet, planting Cheri immediately");
        }

        // Process each plot
        App.game.farming.plotList.forEach((plot, index) => {
            const desiredBerry = layout[index] ?? 0;
            const currentBerry = plot.berry;
            const isEmpty = plot.isEmpty();
            const stage = plot.stage();

            // Skip locked plots
            if (!plot.isUnlocked || plot.isSafeLocked) {
                return;
            }

            // Special handling for Babiri plot (index 0)
            if (index === 0) {
                // If Babiri is ripe, harvest it and replant
                if (!isEmpty && currentBerry === BerryType.Babiri && stage === PlotStage.Berry) {
                    console.log(`🌾 Colbur Nonsense: Harvesting ripe Babiri at plot ${index}`);
                    App.game.farming.harvest(index);
                    actionsPerformed++;

                    // Replant Babiri
                    if (App.game.farming.hasBerry(BerryType.Babiri)) {
                        console.log(`🌱 Colbur Nonsense: Replanting Babiri at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Babiri);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`⚠️ Colbur Nonsense: Cannot replant Babiri at plot ${index} - not enough berries`);
                    }
                }
                // If plot is empty, plant Babiri
                else if (isEmpty) {
                    if (App.game.farming.hasBerry(BerryType.Babiri)) {
                        console.log(`🌱 Colbur Nonsense: Planting Babiri at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Babiri);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`⚠️ Colbur Nonsense: Cannot plant Babiri at plot ${index} - not enough berries`);
                    }
                }
            }
            // Handle Colbur plots (index 8, 16, 18)
            else if ([8, 16, 18].includes(index)) {
                const shouldPlantNow = timeSincePetayaPlanted >= adjustedTimes.colbur;

                if (isEmpty && desiredBerry === BerryType.Colbur) {
                    if (shouldPlantNow && App.game.farming.hasBerry(BerryType.Colbur)) {
                        console.log(`🌱 Colbur Nonsense: Planting Colbur at plot ${index} (timing: ${timeSincePetayaPlanted}s >= ${adjustedTimes.colbur}s)`);
                        App.game.farming.plant(index, BerryType.Colbur);
                        actionsPerformed++;
                    }
                    else if (!shouldPlantNow) {
                        console.log(`⏳ Colbur Nonsense: Waiting to plant Colbur at plot ${index} (${timeSincePetayaPlanted}s / ${adjustedTimes.colbur}s)`);
                    }
                }
                else if (!isEmpty && currentBerry === BerryType.Colbur) {
                    if (stage === PlotStage.Berry) {
                        console.log(`🌾 Colbur Nonsense: Harvesting ripe Colbur at plot ${index} for Farm Points`);
                        App.game.farming.harvest(index);
                        actionsPerformed++;

                        // Replant Cheri so Colbur can overtake it again
                        if (App.game.farming.hasBerry(BerryType.Cheri)) {
                            console.log(`🌱 Colbur Nonsense: Replanting Cheri at plot ${index} (Colbur will overtake)`);
                            App.game.farming.plant(index, BerryType.Cheri);
                            actionsPerformed++;
                        }
                    }
                }
                // If Cheri is growing, just wait
                else if (!isEmpty && currentBerry === BerryType.Cheri) {
                    console.log(`⏳ Colbur Nonsense: Cheri growing at plot ${index}, waiting for Colbur to overtake`);
                }
            }
            // Handle Payapa plots (index 5, 6)
            else if ([5, 6].includes(index)) {
                const shouldPlantNow = timeSincePetayaPlanted >= adjustedTimes.payapa;

                if (isEmpty && desiredBerry === BerryType.Payapa) {
                    if (shouldPlantNow && App.game.farming.hasBerry(BerryType.Payapa)) {
                        console.log(`🌱 Colbur Nonsense: Planting Payapa at plot ${index} (timing: ${timeSincePetayaPlanted}s >= ${adjustedTimes.payapa}s)`);
                        App.game.farming.plant(index, BerryType.Payapa);
                        actionsPerformed++;
                    }
                    else if (!shouldPlantNow) {
                        console.log(`⏳ Colbur Nonsense: Waiting to plant Payapa at plot ${index} (${timeSincePetayaPlanted}s / ${adjustedTimes.payapa}s)`);
                    }
                }
                else if (!isEmpty && currentBerry === BerryType.Payapa) {
                    if (stage === PlotStage.Berry) {
                        console.log(`🌾 Colbur Nonsense: Harvesting ripe Payapa at plot ${index}`);
                        App.game.farming.harvest(index);
                        actionsPerformed++;

                        if (App.game.farming.hasBerry(BerryType.Payapa)) {
                            console.log(`🌱 Colbur Nonsense: Replanting Payapa at plot ${index}`);
                            App.game.farming.plant(index, BerryType.Payapa);
                            actionsPerformed++;
                        }
                    }
                }
            }
            // Handle Petaya plot (index 1)
            else if (index === 1) {
                if (!isEmpty && currentBerry === BerryType.Petaya) {
                    if (stage === PlotStage.Berry) {
                        console.log(`🌾 Colbur Nonsense: Harvesting ripe Petaya at plot ${index}`);
                        App.game.farming.harvest(index);
                        actionsPerformed++;

                        if (App.game.farming.hasBerry(BerryType.Petaya)) {
                            console.log(`🌱 Colbur Nonsense: Replanting Petaya at plot ${index}`);
                            App.game.farming.plant(index, BerryType.Petaya);
                            actionsPerformed++;
                        }
                    }
                }
                // If plot is empty, plant Petaya
                else if (isEmpty) {
                    if (App.game.farming.hasBerry(BerryType.Petaya)) {
                        console.log(`🌱 Colbur Nonsense: Planting Petaya at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Petaya);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`⚠️ Colbur Nonsense: Cannot plant Petaya at plot ${index} - not enough berries`);
                    }
                }
            }
            // Handle Cheri plots (indices 2,3,4,7,9,10,11,12,13,14,15,17,19,20,21,22,23,24)
            else if (desiredBerry === BerryType.Cheri) {
                // If plot is empty, plant Cheri
                if (isEmpty) {
                    if (App.game.farming.hasBerry(BerryType.Cheri)) {
                        console.log(`🌱 Colbur Nonsense: Planting Cheri at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Cheri);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`⚠️ Colbur Nonsense: Cannot plant Cheri at plot ${index} - not enough berries`);
                    }
                }
                // If Cheri is ripe, harvest it and replant
                else if (!isEmpty && currentBerry === BerryType.Cheri && stage === PlotStage.Berry) {
                    console.log(`🌾 Colbur Nonsense: Harvesting ripe Cheri at plot ${index}`);
                    App.game.farming.harvest(index);
                    actionsPerformed++;

                    // Replant Cheri
                    if (App.game.farming.hasBerry(BerryType.Cheri)) {
                        console.log(`🌱 Colbur Nonsense: Replanting Cheri at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Cheri);
                        actionsPerformed++;
                    }
                }
                // If Cheri is growing, just wait for it to ripen
                else if (!isEmpty && currentBerry === BerryType.Cheri && stage !== PlotStage.Berry) {
                    // Cheri is growing, wait for it to ripen
                }
                // If wrong berry is planted, remove it and plant Cheri
                else if (!isEmpty && currentBerry !== BerryType.Cheri) {
                    if (stage === PlotStage.Berry) {
                        console.log(`🌾 Colbur Nonsense: Harvesting wrong berry ${BerryType[currentBerry]} at plot ${index} (want Cheri)`);
                        App.game.farming.harvest(index);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`🔧 Colbur Nonsense: Shoveling wrong berry ${BerryType[currentBerry]} at plot ${index} (want Cheri)`);
                        App.game.farming.shovel(index);
                        actionsPerformed++;
                    }

                    // Plant Cheri
                    if (App.game.farming.hasBerry(BerryType.Cheri)) {
                        console.log(`🌱 Colbur Nonsense: Planting Cheri at plot ${index}`);
                        App.game.farming.plant(index, BerryType.Cheri);
                        actionsPerformed++;
                    }
                }
            }
            // Handle empty plots (can plant Cheri for Colbur to overtake)
            else if (desiredBerry === 0) {
                // If plot has a berry, harvest or shovel it
                if (!isEmpty) {
                    if (stage === PlotStage.Berry) {
                        console.log(`🌾 Colbur Nonsense: Harvesting berry ${BerryType[currentBerry]} at plot ${index} (want empty)`);
                        App.game.farming.harvest(index);
                        actionsPerformed++;
                    }
                    else {
                        console.log(`🔧 Colbur Nonsense: Shoveling berry ${BerryType[currentBerry]} at plot ${index} (want empty)`);
                        App.game.farming.shovel(index);
                        actionsPerformed++;
                    }
                }
                // Optionally plant Cheri in empty plots for more Colbur opportunities
                else if (isEmpty && App.game.farming.hasBerry(BerryType.Cheri)) {
                    console.log(`🌱 Colbur Nonsense: Planting Cheri at plot ${index} (optional for Colbur)`);
                    App.game.farming.plant(index, BerryType.Cheri);
                    actionsPerformed++;
                }
            }
            // If wrong berry, remove it and plant correct one
            else if (!isEmpty && currentBerry !== desiredBerry) {
                if (stage === PlotStage.Berry) {
                    console.log(`🌾 Colbur Nonsense: Harvesting wrong berry ${BerryType[currentBerry]} at plot ${index} (want ${BerryType[desiredBerry]})`);
                    App.game.farming.harvest(index);
                    actionsPerformed++;
                }
                else {
                    console.log(`🔧 Colbur Nonsense: Shoveling wrong berry ${BerryType[currentBerry]} at plot ${index} (want ${BerryType[desiredBerry]})`);
                    App.game.farming.shovel(index);
                    actionsPerformed++;
                }

                if (desiredBerry !== 0 && App.game.farming.hasBerry(desiredBerry)) {
                    console.log(`🌱 Colbur Nonsense: Planting ${BerryType[desiredBerry]} at plot ${index}`);
                    App.game.farming.plant(index, desiredBerry);
                    actionsPerformed++;
                }
            }
        });

        console.log(`✅ Colbur Nonsense: Maintenance complete - ${actionsPerformed} actions performed`);
    }

    /**
     * @brief Determines if a Colbur Berry should be harvested based on timing
     * @param growingBerries: Array of berries that are still growing
     * @param maxTimeUntilBerry: Maximum time until any berry reaches Berry stage
     * @returns True if the berry should be harvested, false otherwise
     */
    static __shouldHarvestColburBerry(growingBerries, maxTimeUntilBerry) {
        // If no berries are growing, harvest immediately
        if (growingBerries.length === 0) {
            return true;
        }

        // If the max time is very short (less than 30 seconds), wait for synchronization
        if (maxTimeUntilBerry < 30) {
            return false;
        }

        // Otherwise, harvest to allow replanting and maintain the cycle
        return true;
    }

    /**
     * @brief Determines if a berry should be planted now based on timing synchronization
     * @param berryType: The type of berry to plant
     * @param maxGrowthTime: The maximum growth time among all berries
     * @param plantingOrder: Array of {berryType, growthTime} sorted by growth time
     * @param growingBerries: Array of berries that are currently growing
     * @returns True if the berry should be planted now, false otherwise
     */
    static __shouldPlantBerryNow(berryType, maxGrowthTime, plantingOrder, growingBerries) {
        // If no berries are growing, plant immediately
        if (growingBerries.length === 0) {
            return true;
        }

        // Find this berry's growth time
        const berryInfo = plantingOrder.find(item => item.berryType === berryType);
        if (!berryInfo) {
            return true; // Berry not in order, plant immediately
        }

        const berryGrowthTime = berryInfo.growthTime;
        const timeOffset = maxGrowthTime - berryGrowthTime;

        // If this berry has the longest growth time, plant it first
        if (timeOffset === 0) {
            return true;
        }

        // Check if there are berries with longer growth times still growing
        const longerBerriesGrowing = growingBerries.filter(state => {
            const longerBerryInfo = plantingOrder.find(item => item.berryType === state.currentBerry);
            return longerBerryInfo && longerBerryInfo.growthTime > berryGrowthTime;
        });

        // If there are longer berries still growing, wait
        if (longerBerriesGrowing.length > 0) {
            // Check if the longer berries are close to being ready
            const maxTimeUntilReady = Math.max(...longerBerriesGrowing.map(state => state.timeUntilBerry));

            // If longer berries will be ready soon (within offset time), wait
            if (maxTimeUntilReady <= timeOffset) {
                return false;
            }
        }

        // Otherwise, plant now
        return true;
    }

    /**
     * @brief Calculates the optimal planting order for Colbur Nonsense berries
     * to ensure they all reach Berry stage at the same time.
     * @returns Array of {berryType, growthTime} sorted by growth time (longest first)
     */
    static __getColburNonsensePlantingOrder() {
        const layout = this.__desiredLayout;
        if (!layout) {
            return [];
        }

        // Get unique berry types from layout (excluding 0 = empty)
        const berryTypes = [...new Set(layout.filter(b => b !== 0))];

        // Calculate growth time for each berry type
        const berryGrowthTimes = berryTypes.map(berryType => {
            const berryData = App.game.farming.berryData[berryType];
            const growthTime = berryData.growthTime[PlotStage.Berry];
            return { berryType, growthTime };
        });

        // Sort by growth time (longest first - these should be planted first)
        berryGrowthTimes.sort((a, b) => b.growthTime - a.growthTime);

        console.log("📊 Colbur Nonsense: Planting order (longest growth time first):");
        berryGrowthTimes.forEach((item, index) => {
            console.log(`  ${index + 1}. ${BerryType[item.berryType]}: ${item.growthTime}s`);
        });

        return berryGrowthTimes;
    }

    /**
     * @brief Plants berries in the correct order to synchronize their maturity
     */
    static __plantColburNonsenseWithTiming() {
        const layout = this.__desiredLayout;
        if (!layout) {
            return;
        }

        const plantingOrder = this.__getColburNonsensePlantingOrder();
        if (plantingOrder.length === 0) {
            return;
        }

        // Find the longest growth time
        const maxGrowthTime = plantingOrder[0].growthTime;

        // Plant each berry type with appropriate timing
        plantingOrder.forEach(({ berryType, growthTime }) => {
            // Calculate time offset needed
            const timeOffset = maxGrowthTime - growthTime;

            // Find all plots that should have this berry
            const plotIndexes = layout.map((berry, index) => berry === berryType ? index : -1).filter(index => index !== -1);

            console.log(`🌱 Colbur Nonsense: Planting ${BerryType[berryType]} (growth time: ${growthTime}s, offset: ${timeOffset}s)`);

            // Plant in all designated plots
            plotIndexes.forEach(index => {
                const plot = App.game.farming.plotList[index];
                if (plot.isUnlocked && !plot.isSafeLocked && plot.isEmpty()) {
                    if (App.game.farming.hasBerry(berryType)) {
                        App.game.farming.plant(index, berryType);
                        console.log(`  ✅ Planted at plot ${index}`);
                    }
                    else {
                        console.log(`  ⚠️ Cannot plant at plot ${index} - not enough berries`);
                    }
                }
            });
        });
    }

    /**
     * @brief Updates the floating panel content
     */
    static __updateFloatingPanel() {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) !== "true") {
            return;
        }

        if (this.__currentStrategy) {
            this.__lastFarmingBerryType = null;
            return;
        }

        const selectedBerryType = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));
        if (this.__lastFarmingBerryType != selectedBerryType) {
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
    static __equipOakItemIfNeeded() {
        if ((this.__currentStrategy.oakItemToEquip === null)
            || (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")) {
            return;
        }

        const currentLoadout = App.game.oakItems.itemList.filter((item) => item.isActive);

        if (!currentLoadout.some(item => (item.name == this.__currentStrategy.oakItemToEquip))) {
            if (currentLoadout.length === App.game.oakItems.maxActiveCount()) {
                App.game.oakItems.deactivate(currentLoadout.reverse()[0].name);
            }

            App.game.oakItems.activate(this.__currentStrategy.oakItemToEquip);
        }
    }

    /**
     * @brief Removes the unwanted Oak item
     */
    static __removeOakItemIfNeeded() {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true") {
            return;
        }

        Automation.Utils.OakItem.ForbiddenItems = this.__currentStrategy.forbiddenOakItems;

        for (const item of this.__currentStrategy.forbiddenOakItems) {
            App.game.oakItems.deactivate(item);
        }
    }

    /**
     * @brief Chooses the next unlock strategy
     */
    static __chooseUnlockStrategy() {
        this.__currentStrategy = FarmMutationStrategies.tryGetNextUnlockStrategy();

        if (this.__currentStrategy === null) {
            this.__disableAutoUnlock("No more automated unlock possible");
            Automation.Notifications.sendWarningNotif("No more automated unlock possible.\nDisabling the 'Auto unlock' feature", "Farming");
            return;
        }

        this.__checkOakItemRequirement();
        this.__checkPokemonRequirement();
        this.__checkDiscordLinkRequirement();

        if ((this.__currentStrategy !== null)
            && this.__currentStrategy.berryToUnlock
            && !App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == this.__currentStrategy.berryToUnlock).unlocked) {
            const berryName = BerryType[this.__currentStrategy.berryToUnlock];

            Automation.Menu.forceAutomationState(this.Settings.FocusOnUnlocks, false);
            Automation.Notifications.sendWarningNotif("Farming unlock disabled, you do not meet the requirements"
                + ` to unlock the ${berryName} berry`, "Farming");

            this.__disableAutoUnlock(`You do not meet the requirements to unlock the ${berryName} berry`);

            const watcher = setInterval(function () {
                if (App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType[berryName]).unlocked) {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000);
        }
    }

    /**
     * @brief Executes the current strategy
     */
    static __executeCurrentStrategy() {
        if (!this.__currentStrategy) {
            return;
        }

        // Handle slot unlock strategies
        if (this.__currentStrategy.slotIndex !== undefined) {
            const slotIndex = this.__currentStrategy.slotIndex;
            const berryType = this.__currentStrategy.berryToUnlock;

            let berryToPlant = berryType;
            if (App.game.farming.plotBerryCost(slotIndex).amount <= App.game.farming.berryList[berryType]()) {
                berryToPlant = BerryType.Cheri;
            }
            FarmPlotManager.plantAllBerries(berryToPlant);
            return;
        }

        // Handle mutation strategies
        if (this.__currentStrategy.berriesIndexes) {
            const berriesIndexes = this.__currentStrategy.berriesIndexes;
            const berriesOrder = Object.keys(berriesIndexes).map(x => parseInt(x)).sort(
                (a, b) => App.game.farming.berryData[b].growthTime[PlotStage.Bloom] - App.game.farming.berryData[a].growthTime[PlotStage.Bloom]
            );

            for (const berryType of berriesOrder) {
                FarmPlotManager.tryPlantBerryAtIndexes(berryType, berriesIndexes[berryType]);
            }
            return;
        }

        // Handle berry requirement strategies
        if (this.__currentStrategy.berriesToGather) {
            let plotIndex = 0;
            for (const berryType of this.__currentStrategy.berriesToGather) {
                if (!App.game.farming.hasBerry(berryType)) {
                    continue;
                }

                let neededAmount = (this.__currentStrategy.berriesMinAmount - App.game.farming.berryList[berryType]());
                const berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;

                const alreadyPlantedCount = FarmPlotManager.getPlantedBerriesCount(berryType);
                neededAmount -= (alreadyPlantedCount * berryHarvestAmount);

                while ((neededAmount > 0) && (plotIndex <= 24) && App.game.farming.hasBerry(berryType)) {
                    if (App.game.farming.plotList[plotIndex].isUnlocked
                        && App.game.farming.plotList[plotIndex].isEmpty()) {
                        App.game.farming.plant(plotIndex, berryType);
                        neededAmount -= (berryHarvestAmount - 1);
                    }
                    plotIndex++;
                }

                if (plotIndex > 24) {
                    break;
                }
            }

            FarmPlotManager.plantAllBerries(BerryType.Cheri);
        }
    }

    /**
     * @brief Checks Oak item requirement
     */
    static __checkOakItemRequirement() {
        if ((this.__currentStrategy == null)
            || (this.__currentStrategy.oakItemToEquip === null)) {
            return;
        }

        const oakItem = App.game.oakItems.itemList[this.__currentStrategy.oakItemToEquip];

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")
            && !oakItem.isActive) {
            this.__disableAutoUnlock("The next unlock requires the '" + oakItem.displayName + "' Oak item\n"
                + "and loadout auto-update was disabled.\n"
                + "You can either equip it manually or turn auto-equip back on.");

            const watcher = setInterval(function () {
                if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) === "true")
                    || oakItem.isActive) {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000);

            return;
        }

        if (oakItem.isUnlocked()) {
            return;
        }

        this.__disableAutoUnlock("The '" + oakItem.displayName + "' Oak item is required for the next unlock");

        const watcher = setInterval(function () {
            if (oakItem.isUnlocked()) {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Checks Pokemon requirement
     */
    static __checkPokemonRequirement() {
        if ((this.__currentStrategy == null)
            || (this.__currentStrategy.requiredPokemon === null)) {
            return;
        }

        const neededPokemonId = PokemonHelper.getPokemonByName(this.__currentStrategy.requiredPokemon).id;
        if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0) {
            return;
        }

        this.__disableAutoUnlock("You need to catch " + this.__currentStrategy.requiredPokemon
            + " (#" + neededPokemonId.toString() + ") for the next unlock");

        const watcher = setInterval(function () {
            if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0) {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Checks Discord link requirement
     */
    static __checkDiscordLinkRequirement() {
        if ((this.__currentStrategy == null)
            || (!this.__currentStrategy.requiresDiscord)) {
            return;
        }

        if (App.game.discord.ID() !== null) {
            const enigmaMutation = App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType.Enigma);

            if (enigmaMutation.hintsSeen.every((seen) => seen())) {
                return;
            }

            this.__disableAutoUnlock("You need to collect the four hints from the Kanto Berry Master\n"
                + "for the next unlock. He's located in Cerulean City.");
        }
        else {
            this.__disableAutoUnlock("A linked discord account is needed for the next unlock.");
        }

        const watcher = setInterval(function () {
            if (App.game.discord.ID() === null) {
                return;
            }

            const enigmaMutation = App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == BerryType.Enigma);

            if (enigmaMutation.hintsSeen.every((seen) => seen())) {
                Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                clearInterval(watcher);
            }
        }.bind(this), 5000);
    }

    /**
     * @brief Disables the 'Auto unlock' button
     */
    static __disableAutoUnlock(reason) {
        Automation.Menu.forceAutomationState(this.Settings.FocusOnUnlocks, false);
        Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, true, reason);
        Automation.Utils.OakItem.ForbiddenItems = [];
        this.__currentStrategy = null;
    }

    /**
     * @brief Sends the Farming automation notification
     */
    static __sendNotif(details) {
        if (this.__plantedBerryCount > 0) {
            Automation.Notifications.sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details, "Farming");
        }
    }
}
