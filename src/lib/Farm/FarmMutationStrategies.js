/**
 * @class FarmMutationStrategies handles berry mutation and unlock strategies
 * Follows Single Responsibility Principle - only handles mutation/unlock logic
 */
class FarmMutationStrategies
{
    // Harvest timing types
    static HarvestTimingType = {
        AsSoonAsPossible: 0,
        RightBeforeWithering: 1,
        LetTheBerryDie: 2
    };

    // Collection of unlock strategies
    static __unlockStrategySelection = [];

    /**
     * @brief Builds the complete unlock strategy selection
     */
    static buildUnlockStrategySelection()
    {
        this.__unlockStrategySelection = [];
        this.addGen1UnlockStrategies();
        this.addGen2UnlockStrategies();
        this.addGen3UnlockStrategies();
        this.addGen4UnlockStrategies();
        this.addGen5UnlockStrategies();
        this.addUnneededBerriesStrategies();
        this.addEnigmaBerryStrategy();
    }

    /**
     * @brief Gets the unlock strategy selection
     *
     * @returns Array of unlock strategies
     */
    static getUnlockStrategySelection()
    {
        return this.__unlockStrategySelection;
    }

    /**
     * @brief Tries to find the next unlock strategy
     *
     * @returns The next strategy to execute, or null if none found
     */
    static tryGetNextUnlockStrategy()
    {
        for (const strategy of this.__unlockStrategySelection)
        {
            // Don't consider strategies if the berry cannot be unlocked and it was flagged as optional
            if ((strategy.isOptional === true)
                && !App.game.farming.mutations.find((mutation) => mutation.mutatedBerry == strategy.berryToUnlock).unlocked)
            {
                continue;
            }

            if (strategy.isNeeded())
            {
                return strategy;
            }
        }

        return null;
    }

    /**
     * @brief Adds first generation berries unlock strategies
     */
    static addGen1UnlockStrategies()
    {
        // Unlock slots requiring Gen 1 berries
        this.addUnlockSlotStrategy(7, BerryType.Cheri);
        this.addUnlockSlotStrategy(13, BerryType.Chesto);
        this.addUnlockSlotStrategy(17, BerryType.Pecha);
        this.addUnlockSlotStrategy(11, BerryType.Rawst);
        this.addUnlockSlotStrategy(6, BerryType.Aspear);
        this.addUnlockSlotStrategy(8, BerryType.Leppa);
        this.addUnlockSlotStrategy(18, BerryType.Oran);
        this.addUnlockSlotStrategy(16, BerryType.Sitrus);

        // Make sure to have at least 20 of each berry type before proceeding
        this.addBerryRequirementBeforeFurtherUnlockStrategy(
            20,
            [
                BerryType.Cheri, BerryType.Chesto, BerryType.Pecha, BerryType.Rawst,
                BerryType.Aspear, BerryType.Leppa, BerryType.Oran, BerryType.Sitrus
            ]);
    }

    /**
     * @brief Adds second generation berries unlock strategies
     */
    static addGen2UnlockStrategies()
    {
        // Unlock Gen 2 berries through mutations
        this.addUnlockMutationStrategy(
            BerryType.Persim, this.plantTwoBerriesForMutationConfig(BerryType.Oran, BerryType.Pecha, false, false, false));
        this.addUnlockSlotStrategy(2, BerryType.Persim);

        this.addUnlockMutationStrategy(
            BerryType.Razz, this.plantTwoBerriesForMutationConfig(BerryType.Leppa, BerryType.Cheri, false, false));
        this.addUnlockSlotStrategy(14, BerryType.Razz);

        this.addUnlockMutationStrategy(
            BerryType.Bluk, this.plantTwoBerriesForMutationConfig(BerryType.Leppa, BerryType.Chesto, false, false));
        this.addUnlockSlotStrategy(22, BerryType.Bluk);

        this.addUnlockMutationStrategy(
            BerryType.Nanab, this.plantTwoBerriesForMutationConfig(BerryType.Aspear, BerryType.Pecha, false, false));
        this.addUnlockSlotStrategy(10, BerryType.Nanab);

        this.addUnlockMutationStrategy(
            BerryType.Wepear, this.plantTwoBerriesForMutationConfig(BerryType.Oran, BerryType.Rawst, false));
        this.addUnlockSlotStrategy(3, BerryType.Wepear);

        this.addUnlockMutationStrategy(
            BerryType.Pinap, this.plantTwoBerriesForMutationConfig(BerryType.Sitrus, BerryType.Aspear, false));
        this.addUnlockSlotStrategy(19, BerryType.Pinap);

        // Add Figy, Wiki, Mago, Aguav, Iapapa berry strategies
        const figyConfig = {};
        figyConfig[BerryType.Cheri] = [2, 3, 6, 10, 14, 16, 18, 19, 22];
        this.addUnlockMutationStrategy(BerryType.Figy, figyConfig);
        this.addUnlockSlotStrategy(21, BerryType.Figy);

        const chestoConfig = {};
        chestoConfig[BerryType.Chesto] = [2, 3, 6, 10, 12, 14, 19, 21, 22];
        this.addUnlockMutationStrategy(BerryType.Wiki, chestoConfig);
        this.addUnlockSlotStrategy(5, BerryType.Wiki);

        const magoConfig = {};
        magoConfig[BerryType.Pecha] = [2, 3, 5, 10, 12, 14, 19, 21, 22];
        this.addUnlockMutationStrategy(BerryType.Mago, magoConfig);
        this.addUnlockSlotStrategy(1, BerryType.Mago);

        const aguavConfig = {};
        aguavConfig[BerryType.Rawst] = [2, 3, 5, 10, 12, 14, 19, 21, 22];
        this.addUnlockMutationStrategy(BerryType.Aguav, aguavConfig);
        this.addUnlockSlotStrategy(9, BerryType.Aguav);

        const iapapaConfig = {};
        iapapaConfig[BerryType.Aspear] = [2, 3, 5, 10, 12, 14, 19, 21, 22];
        this.addUnlockMutationStrategy(BerryType.Iapapa, iapapaConfig);
        this.addUnlockSlotStrategy(23, BerryType.Iapapa);

        // Make sure to have at least 20 of each berry type before proceeding
        this.addBerryRequirementBeforeFurtherUnlockStrategy(
            20,
            [
                BerryType.Persim, BerryType.Razz, BerryType.Bluk, BerryType.Nanab, BerryType.Wepear, BerryType.Pinap,
                BerryType.Figy, BerryType.Wiki, BerryType.Mago, BerryType.Aguav, BerryType.Iapapa
            ]);
    }

    /**
     * @brief Adds third generation berries unlock strategies
     */
    static addGen3UnlockStrategies()
    {
        // Gen 3 berry mutations
        const pomegConfig = {};
        pomegConfig[BerryType.Iapapa] = [5, 8, 16, 19];
        pomegConfig[BerryType.Mago] = [6, 9, 22];
        this.addUnlockMutationStrategy(BerryType.Pomeg, pomegConfig);
        this.addUnlockSlotStrategy(15, BerryType.Pomeg);

        const kelpsyConfig = {};
        kelpsyConfig[BerryType.Persim] = [6, 8, 21, 23];
        kelpsyConfig[BerryType.Chesto] = [7, 10, 14, 22];
        this.addUnlockMutationStrategy(BerryType.Kelpsy, kelpsyConfig);
        this.addUnlockSlotStrategy(0, BerryType.Kelpsy);

        const qualotConfig = {};
        qualotConfig[BerryType.Pinap] = [0, 8, 15, 18];
        qualotConfig[BerryType.Mago] = [6, 9, 19, 21];
        this.addUnlockMutationStrategy(BerryType.Qualot, qualotConfig);
        this.addUnlockSlotStrategy(4, BerryType.Qualot);

        const hondewConfig = {};
        hondewConfig[BerryType.Figy] = [1, 8, 15, 23];
        hondewConfig[BerryType.Wiki] = [3, 5, 17, 19];
        hondewConfig[BerryType.Aguav] = [6, 9, 22];
        this.addUnlockMutationStrategy(BerryType.Hondew, hondewConfig);
        this.addUnlockSlotStrategy(24, BerryType.Hondew);

        const grepaConfig = {};
        grepaConfig[BerryType.Aguav] = [0, 3, 15, 18];
        grepaConfig[BerryType.Figy] = [6, 9, 21, 24];
        this.addUnlockMutationStrategy(BerryType.Grepa, grepaConfig);
        this.addUnlockSlotStrategy(20, BerryType.Grepa);

        // More Gen 3 berries
        this.addUnlockMutationStrategy(
            BerryType.Tamato, this.plantTwoBerriesForSurroundingMutationConfig(BerryType.Pomeg, BerryType.Razz));
        this.addUnlockMutationStrategy(
            BerryType.Cornn, this.plantThreeBerriesForMutationConfig(BerryType.Leppa, BerryType.Bluk, BerryType.Wiki));
        this.addUnlockMutationStrategy(
            BerryType.Magost, this.plantThreeBerriesForMutationConfig(BerryType.Pecha, BerryType.Nanab, BerryType.Mago));
        this.addUnlockMutationStrategy(
            BerryType.Rabuta, this.plantTwoBerriesForSurroundingMutationConfig(BerryType.Aguav, BerryType.Aspear));

        const nomelConfig = {};
        nomelConfig[BerryType.Wepear] = [0, 3, 15, 18];
        nomelConfig[BerryType.Pinap] = [6, 9, 21, 24];
        this.addUnlockMutationStrategy(BerryType.Nomel, nomelConfig);

        this.addBerryRequirementBeforeFurtherUnlockStrategy(
            25,
            [BerryType.Tamato, BerryType.Cornn, BerryType.Magost, BerryType.Rabuta, BerryType.Nomel]);

        // Advanced Gen 3 berries
        const allSlotIndexes = App.game.farming.plotList.map((_, index) => index);

        const spelonConfig = {};
        spelonConfig[BerryType.Tamato] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Spelon, spelonConfig);

        const pamtreConfig = {};
        pamtreConfig[BerryType.Cornn] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Pamtre, pamtreConfig, 1, null, [OakItemType.Cell_Battery]);

        const watmelConfig = {};
        watmelConfig[BerryType.Magost] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Watmel, watmelConfig);

        const durinConfig = {};
        durinConfig[BerryType.Rabuta] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Durin, durinConfig);

        const belueConfig = {};
        belueConfig[BerryType.Nomel] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Belue, belueConfig);

        // Pinkan berry (optional)
        const pinkanConfig = {};
        pinkanConfig[BerryType.Nanab] = [0, 4, 20, 24];
        pinkanConfig[BerryType.Pecha] = [2, 22];
        pinkanConfig[BerryType.Mago] = [5, 9, 15, 19];
        pinkanConfig[BerryType.Persim] = [7, 17];
        pinkanConfig[BerryType.Qualot] = [10, 14];
        pinkanConfig[BerryType.Magost] = [11, 13];
        pinkanConfig[BerryType.Watmel] = [12];
        this.addUnlockMutationStrategy(BerryType.Pinkan, pinkanConfig, 1, null, [OakItemType.Sprinklotad]);
        this.__unlockStrategySelection.at(-1).isOptional = true;

        this.addBerryRequirementBeforeFurtherUnlockStrategy(
            25,
            [
                BerryType.Pomeg, BerryType.Kelpsy, BerryType.Qualot, BerryType.Hondew, BerryType.Grepa,
                BerryType.Spelon, BerryType.Pamtre, BerryType.Watmel, BerryType.Durin, BerryType.Belue
            ]);
    }

    /**
     * @brief Adds fourth generation berries unlock strategies
     */
    static addGen4UnlockStrategies()
    {
        const allSlotIndexes = App.game.farming.plotList.map((_, index) => index);

        // Gen 4 berry mutations
        this.addUnlockMutationStrategy(
            BerryType.Occa, this.plantFourBerriesForMutationConfig(BerryType.Tamato, BerryType.Figy, BerryType.Spelon, BerryType.Razz),
            1, null, [OakItemType.Magma_Stone]);

        this.addUnlockMutationStrategy(
            BerryType.Coba, this.plantTwoBerriesForMutationConfig(BerryType.Wiki, BerryType.Aguav));

        this.addUnlockMutationStrategy(
            BerryType.Passho, this.plantFourBerriesForMutationConfig(BerryType.Oran, BerryType.Kelpsy, BerryType.Chesto, BerryType.Coba));

        this.addUnlockMutationStrategy(
            BerryType.Wacan, this.plantFourBerriesForMutationConfig(BerryType.Iapapa, BerryType.Pinap, BerryType.Qualot, BerryType.Grepa));

        this.addUnlockMutationStrategy(
            BerryType.Rindo, this.plantTwoBerriesForMutationConfig(BerryType.Figy, BerryType.Aguav));

        const yacheConfig = {};
        yacheConfig[BerryType.Passho] = [0, 2, 4, 10, 12, 14, 20, 22, 24];
        this.addUnlockMutationStrategy(BerryType.Yache, yacheConfig);

        this.addUnlockMutationStrategy(
            BerryType.Payapa,
            this.plantFourBerriesForMutationConfig(BerryType.Wiki, BerryType.Cornn, BerryType.Bluk, BerryType.Pamtre),
            1, null, [OakItemType.Rocky_Helmet, OakItemType.Cell_Battery]);

        const tangaConfig = {};
        tangaConfig[BerryType.Rindo] = App.game.farming.plotList.map((_, index) => index).filter(index => ![6, 8, 16, 18].includes(index));
        this.addUnlockMutationStrategy(BerryType.Tanga, tangaConfig);

        // Kasib berry (special - let berries die)
        const kasibConfig = {};
        kasibConfig[BerryType.Cheri] = App.game.farming.plotList.map((_, index) => index);
        this.addUnlockMutationStrategy(BerryType.Kasib, kasibConfig, 4);
        const kasibBerryStrategy = this.__unlockStrategySelection.at(-1);
        kasibBerryStrategy.harvestStrategy = this.HarvestTimingType.LetTheBerryDie;

        this.addUnlockMutationStrategy(
            BerryType.Haban, this.plantFourBerriesForMutationConfig(BerryType.Occa, BerryType.Passho, BerryType.Wacan, BerryType.Rindo));

        this.addUnlockMutationStrategy(
            BerryType.Colbur, this.plantThreeBerriesForMutationConfig(BerryType.Rabuta, BerryType.Kasib, BerryType.Payapa));

        this.addUnlockMutationStrategy(
            BerryType.Roseli,
            this.plantFourBerriesForMutationConfig(BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel),
            1, null, [OakItemType.Sprinklotad]);

        // Oak item dependent mutations
        const shucaConfig = {};
        shucaConfig[BerryType.Watmel] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Shuca, shucaConfig, 1, OakItemType.Sprinklotad);

        const chartiConfig = {};
        chartiConfig[BerryType.Cornn] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Charti, chartiConfig, 1, OakItemType.Cell_Battery);

        const babiriConfig = {};
        babiriConfig[BerryType.Shuca] = [0, 1, 2, 3, 4, 7, 17, 20, 21, 22, 23, 24];
        babiriConfig[BerryType.Charti] = [5, 9, 10, 11, 12, 13, 14, 15, 19];
        this.addUnlockMutationStrategy(BerryType.Babiri, babiriConfig, 20);

        const snoverConfig = {};
        snoverConfig[BerryType.Babiri] = App.game.farming.plotList.map((_, index) => index).filter(index => ![18, 19, 22, 23, 24].includes(index));
        this.addUnlockMutationStrategy(BerryType.Snover, snoverConfig, 1, null, [], "Snover");

        const chopleConfig = {};
        chopleConfig[BerryType.Spelon] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Chople, chopleConfig, 1, OakItemType.Magma_Stone);

        const kebiaConfig = {};
        kebiaConfig[BerryType.Pamtre] = allSlotIndexes;
        this.addUnlockMutationStrategy(BerryType.Kebia, kebiaConfig, 1, OakItemType.Rocky_Helmet);
    }

    /**
     * @brief Adds fifth generation berries unlock strategies
     */
    static addGen5UnlockStrategies()
    {
        // Gen 5 berry mutations
        this.addUnlockMutationStrategy(
            BerryType.Micle,
            this.plantABerryForMutationRequiringOver600PointsConfig(BerryType.Pamtre),
            1, null, [OakItemType.Rocky_Helmet]);

        this.addUnlockMutationStrategy(
            BerryType.Custap,
            this.plantABerryForMutationRequiringOver600PointsConfig(BerryType.Watmel),
            1, null, [OakItemType.Sprinklotad]);

        this.addUnlockMutationStrategy(
            BerryType.Jaboca, this.plantABerryForMutationRequiringOver600PointsConfig(BerryType.Durin));

        this.addUnlockMutationStrategy(
            BerryType.Rowap, this.plantABerryForMutationRequiringOver600PointsConfig(BerryType.Belue));

        // Legendary pokemon required mutations
        this.addUnlockMutationStrategy(
            BerryType.Liechi,
            this.plantABerryForMutationRequiring23BerriesConfig(BerryType.Passho),
            1, null, [], "Kyogre");

        this.addUnlockMutationStrategy(
            BerryType.Ganlon,
            this.plantABerryForMutationRequiring23BerriesConfig(BerryType.Shuca),
            1, null, [], "Groudon");

        this.addUnlockMutationStrategy(
            BerryType.Kee, this.plantTwoBerriesForMutationConfig(BerryType.Liechi, BerryType.Ganlon));

        this.addUnlockMutationStrategy(
            BerryType.Salac,
            this.plantABerryForMutationRequiring23BerriesConfig(BerryType.Coba),
            1, null, [], "Rayquaza");

        // Petaya berry (complex)
        const petayaConfig = {};
        petayaConfig[BerryType.Kasib] = [0];
        petayaConfig[BerryType.Payapa] = [2];
        petayaConfig[BerryType.Yache] = [4];
        petayaConfig[BerryType.Shuca] = [5];
        petayaConfig[BerryType.Wacan] = [9];
        petayaConfig[BerryType.Chople] = [10];
        petayaConfig[BerryType.Coba] = [11];
        petayaConfig[BerryType.Kebia] = [12];
        petayaConfig[BerryType.Haban] = [14];
        petayaConfig[BerryType.Colbur] = [15];
        petayaConfig[BerryType.Babiri] = [16];
        petayaConfig[BerryType.Charti] = [17];
        petayaConfig[BerryType.Tanga] = [19];
        petayaConfig[BerryType.Occa] = [20];
        petayaConfig[BerryType.Rindo] = [21];
        petayaConfig[BerryType.Passho] = [22];
        petayaConfig[BerryType.Roseli] = [23];
        petayaConfig[BerryType.Chilan] = [24];
        this.addUnlockMutationStrategy(BerryType.Petaya, petayaConfig, 1);

        this.addUnlockMutationStrategy(
            BerryType.Maranga, this.plantTwoBerriesForMutationConfig(BerryType.Salac, BerryType.Petaya));

        this.addUnlockMutationStrategy(
            BerryType.Apicot,
            this.plantABerryForMutationRequiring23BerriesConfig(BerryType.Chilan),
            1, null, [], "Palkia");

        this.addUnlockMutationStrategy(
            BerryType.Lansat,
            this.plantABerryForMutationRequiring23BerriesConfig(BerryType.Roseli),
            1, null, [], "Dialga");

        const starfConfig = {};
        starfConfig[BerryType.Roseli] = App.game.farming.plotList.map((_, index) => index).filter(index => ![11, 12, 13].includes(index));
        this.addUnlockMutationStrategy(BerryType.Starf, starfConfig);
    }

    /**
     * @brief Adds unneeded berries strategies
     */
    static addUnneededBerriesStrategies()
    {
        // Lum berry
        const lumConfig = {};
        lumConfig[BerryType.Sitrus] = [0, 4, 20, 24];
        lumConfig[BerryType.Oran] = [1, 3, 21, 23];
        lumConfig[BerryType.Aspear] = [2, 22];
        lumConfig[BerryType.Leppa] = [5, 9, 15, 19];
        lumConfig[BerryType.Pecha] = [7, 17];
        lumConfig[BerryType.Rawst] = [10, 14];
        lumConfig[BerryType.Chesto] = [11, 13];
        lumConfig[BerryType.Cheri] = [12];
        this.addUnlockMutationStrategy(BerryType.Lum, lumConfig, 1);
    }

    /**
     * @brief Adds Enigma berry strategy
     */
    static addEnigmaBerryStrategy()
    {
        const neededBerries = EnigmaMutation.getReqs();

        const enigmaConfig = {};
        enigmaConfig[neededBerries[0]] = [1, 13];
        enigmaConfig[neededBerries[1]] = [5, 17];
        enigmaConfig[neededBerries[2]] = [7, 19];
        enigmaConfig[neededBerries[3]] = [11, 23];

        this.addUnlockMutationStrategy(BerryType.Enigma, enigmaConfig);
        this.__unlockStrategySelection.at(-1).requiresDiscord = true;
    }

    /**
     * @brief Adds an unlock strategy to unlock a slot
     */
    static addUnlockSlotStrategy(slotIndex, berryType)
    {
        this.__unlockStrategySelection.push({
            isNeeded: function () { return !App.game.farming.plotList[slotIndex].isUnlocked; },
            harvestStrategy: this.HarvestTimingType.AsSoonAsPossible,
            oakItemToEquip: null,
            forbiddenOakItems: [],
            requiredPokemon: null,
            requiresDiscord: false,
            berryToUnlock: berryType,
            slotIndex: slotIndex
        });
    }

    /**
     * @brief Adds an unlock strategy for mutations
     */
    static addUnlockMutationStrategy(berryType, berriesIndexes, minimumRequiredBerry = 1, oakItemNeeded = null, oakItemsToRemove = [], requiredPokemonName = null)
    {
        this.__unlockStrategySelection.push({
            isNeeded: function () {
                return this.doesPlayerNeedMoreBerry(berryType, minimumRequiredBerry);
            }.bind(this),
            berryToUnlock: berryType,
            harvestStrategy: this.HarvestTimingType.RightBeforeWithering,
            oakItemToEquip: oakItemNeeded,
            forbiddenOakItems: oakItemsToRemove,
            requiredPokemon: requiredPokemonName,
            requiresDiscord: false,
            berriesIndexes: berriesIndexes
        });
    }

    /**
     * @brief Adds a berry requirement strategy
     */
    static addBerryRequirementBeforeFurtherUnlockStrategy(berriesMinAmount, berriesToGather)
    {
        this.__unlockStrategySelection.push({
            isNeeded: function () {
                return !berriesToGather.every((berryType) => {
                    const alreadyPlantedCount = FarmPlotManager.getPlantedBerriesCount(berryType);
                    const berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;
                    return (App.game.farming.berryList[berryType]() >= (berriesMinAmount - (alreadyPlantedCount * berryHarvestAmount)));
                });
            },
            harvestStrategy: this.HarvestTimingType.AsSoonAsPossible,
            oakItemToEquip: null,
            forbiddenOakItems: [],
            requiredPokemon: null,
            requiresDiscord: false,
            berriesMinAmount: berriesMinAmount,
            berriesToGather: berriesToGather
        });
    }

    /**
     * @brief Checks if player needs more of a specific berry
     */
    static doesPlayerNeedMoreBerry(berryType, targetCount)
    {
        if (!App.game.farming.unlockedBerries[berryType]())
        {
            return true;
        }

        const totalCount = App.game.farming.berryList[berryType]() + FarmPlotManager.getPlantedBerriesCount(berryType);
        return (totalCount < targetCount);
    }

    // Configuration helper methods
    static plantTwoBerriesForMutationConfig(berry1Type, berry2Type, everyPlotUnlocked = true, thirteenthPlotUnlocked = true, tenthPlotUnlocked = true)
    {
        const config = {};
        if (everyPlotUnlocked)
        {
            config[berry1Type] = [0, 3, 15, 18];
            config[berry2Type] = [6, 9, 21, 24];
        }
        else if (tenthPlotUnlocked)
        {
            if (thirteenthPlotUnlocked)
            {
                config[berry1Type] = [2, 10, 14, 22];
                config[berry2Type] = [12];
            }
            else
            {
                config[berry1Type] = [2, 17];
                config[berry2Type] = [12];
            }
        }
        else
        {
            config[berry1Type] = [7, 17];
            config[berry2Type] = [11, 13];
        }
        return config;
    }

    static plantThreeBerriesForMutationConfig(berry1Type, berry2Type, berry3Type)
    {
        const config = {};
        config[berry1Type] = [1, 4, 16, 19];
        config[berry2Type] = [5, 8, 20, 23];
        config[berry3Type] = [6, 9, 21, 24];
        return config;
    }

    static plantFourBerriesForMutationConfig(berry1Type, berry2Type, berry3Type, berry4Type)
    {
        const config = {};
        config[berry1Type] = [0, 4, 17];
        config[berry2Type] = [2, 15, 19];
        config[berry3Type] = [5, 9, 22];
        config[berry4Type] = [7, 20, 24];
        return config;
    }

    static plantTwoBerriesForSurroundingMutationConfig(triggerBerryType, mutatedBerryType)
    {
        const config = {};
        config[triggerBerryType] = [6, 9, 21, 24];
        config[mutatedBerryType] = App.game.farming.plotList.map((_, index) => index).filter(x => !config[triggerBerryType].includes(x));
        return config;
    }

    static plantABerryForMutationRequiringOver600PointsConfig(berryType)
    {
        const config = {};
        config[berryType] = App.game.farming.plotList.map((_, index) => index).filter(index => ![6, 8, 11, 12, 13].includes(index));
        return config;
    }

    static plantABerryForMutationRequiring23BerriesConfig(berryType)
    {
        const config = {};
        config[berryType] = App.game.farming.plotList.map((_, index) => index).filter(index => ![12, 13].includes(index));
        return config;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports)
{
    module.exports = FarmMutationStrategies;
}
