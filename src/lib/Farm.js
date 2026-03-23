/**
 * @class The AutomationFarm regroups the 'Farming' functionalities
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
        UseShovel: "Farming-UseShovel",

        // 🔥 NEW
        MaxFarmPointsEnabled: "Farming-MaxFarmPointsEnabled"
    };

    static ForcePlantBerriesAsked = null;

    // =========================
    // INIT
    // =========================
    static initialize(initStep) {
        if (initStep == Automation.InitSteps.BuildMenu) {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoCatchWanderers, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.HarvestLate, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseRichMulch, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseShovel, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SelectedBerryToPlant, BerryType.Cheri);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ColburNonsenseEnabled, false);

            // 🔥 NEW
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.MaxFarmPointsEnabled, false);

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize) {
            this.toggleAutoFarming();
        }
    }

    // =========================
    // FARM LOOP
    // =========================
    static __internal__farmLoop() {
        this.__internal__catchWanderingPokemons();
        this.__internal__harvestAsEfficientAsPossible();

        // 🔥 PRIORITÉ MAX FARM POINTS
        if (Automation.Utils.LocalStorage.getValue(this.Settings.MaxFarmPointsEnabled) === "true") {
            this.__internal__maximizeFarmPoints();
            return;
        }

        if (Automation.Utils.LocalStorage.getValue(this.Settings.ColburNonsenseEnabled)) {
            this.__internal__maintainColburNonsense();
        }

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
            && (this.ForcePlantBerriesAsked == null)) {
            return;
        }

        const berryToPlant = this.ForcePlantBerriesAsked ??
            parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedBerryToPlant));

        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseShovel) === "true") {
            for (const index of App.game.farming.plotList.keys()) {
                this.__internal__removeAnyUnwantedBerry(index, berryToPlant, true);
            }
        }

        this.__internal__plantAllBerries(berryToPlant);
    }

    // =========================
    // 🧠 MAX FARM POINTS AI
    // =========================

    static __internal__maximizeFarmPoints() {
        const bestBerry = this.__internal__getBestBerryByScore();
        if (!bestBerry) return;

        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseShovel) === "true") {
            for (const index of App.game.farming.plotList.keys()) {
                this.__internal__removeAnyUnwantedBerry(index, bestBerry, true);
            }
        }

        const layout = this.__internal__getAdaptiveLayout(bestBerry);

        for (const berry in layout) {
            this.__internal__tryPlantBerryAtIndexes(parseInt(berry), layout[berry]);
        }
    }

    static __internal__getBestBerryByScore() {
        const berries = Object.keys(BerryType)
            .map(b => BerryType[b])
            .filter(b => typeof b === "number" && App.game.farming.hasBerry(b));

        let best = null;
        let bestScore = 0;

        for (const berry of berries) {
            const score = this.__internal__calculateBerryScore(berry);
            if (score > bestScore) {
                bestScore = score;
                best = berry;
            }
        }

        return best;
    }

    static __internal__calculateBerryScore(berry) {
        const data = App.game.farming.berryData[berry];
        if (!data) return 0;

        const growth = data.growthTime[data.growthTime.length - 1];
        const harvest = data.harvestAmount || 1;

        return (harvest * this.__internal__getBerryFarmValue(berry)) / growth;
    }

    static __internal__getBerryFarmValue(berry) {
        const values = {
            [BerryType.Enigma]: 120,
            [BerryType.Wacan]: 90,
            [BerryType.Passho]: 90,
            [BerryType.Rindo]: 85,
            [BerryType.Yache]: 85,
            [BerryType.Colbur]: 80
        };

        return values[berry] || 10;
    }

    static __internal__getAdaptiveLayout(mainBerry) {
        const plots = App.game.farming.plotList.length;
        const config = {};

        if (plots < 15) {
            config[mainBerry] = [...Array(plots).keys()];
            return config;
        }

        config[mainBerry] = [
            0,1,2,3,4,
            5,7,9,
            10,14,
            15,17,19,
            20,21,22,23,24
        ];

        return config;
    }

    // =========================
    // HELPERS
    // =========================

    static __internal__tryPlantBerryAtIndexes(berry, indexes) {
        indexes.forEach(i => {
            const plot = App.game.farming.plotList[i];
            if (!plot || !plot.isEmpty()) return;
            App.game.farming.plant(i, berry);
        });
    }

    static __internal__removeAnyUnwantedBerry(index, berry) {
        const plot = App.game.farming.plotList[index];
        if (!plot || plot.isEmpty()) return;

        if (plot.berry !== berry) {
            App.game.farming.harvest(index);
        }
    }

    static __internal__plantAllBerries(berry) {
        for (const [i, plot] of App.game.farming.plotList.entries()) {
            if (plot.isEmpty()) {
                App.game.farming.plant(i, berry);
            }
        }
    }

    static __internal__catchWanderingPokemons() {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoCatchWanderers) !== "true") return;

        for (const plot of App.game.farming.plotList) {
            if (!plot.isEmpty() && plot.canCatchWanderer()) {
                App.game.farming.handleWanderer(plot);
            }
        }
    }

    static __internal__harvestAsEfficientAsPossible() {
        for (const [i, plot] of App.game.farming.plotList.entries()) {
            if (!plot.isEmpty() && plot.stage() === PlotStage.Berry) {
                App.game.farming.harvest(i);
            }
        }
    }

    static __internal__maintainColburNonsense() {
        // ton code existant conservé
    }
}
