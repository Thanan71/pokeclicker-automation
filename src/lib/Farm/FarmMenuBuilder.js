/**
 * @class FarmMenuBuilder handles all menu construction for the Farm automation
 */
class FarmMenuBuilder
{
    /**
     * @brief Builds the main farming menu
     *
     * @param {Object} settings: The settings object containing all setting keys
     * @param {Function} toggleCallback: Callback function for toggle button
     */
    static buildMenu(settings, toggleCallback)
    {
        // Add the related buttons to the automation menu
        const farmingContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(farmingContainer);

        Automation.Menu.addSeparator(farmingContainer);

        // Only display the menu when the farm is unlocked
        if (!App.game.farming.canAccess())
        {
            farmingContainer.hidden = true;
        }

        const autoFarmTooltip = "Automatically harvest and plant crops"
            + Automation.Menu.TooltipSeparator
            + "Crops are harvested as soon as they ripe\n"
            + "New crops are planted using the selected one in the farm menu";
        const autoFarmingButton =
            Automation.Menu.addAutomationButton("Farming", settings.FeatureEnabled, autoFarmTooltip, farmingContainer);
        autoFarmingButton.addEventListener("click", toggleCallback, false);

        return { farmingContainer, autoFarmingButton };
    }

    /**
     * @brief Builds the advanced settings panel
     *
     * @param {Element} parentButton: The parent button element
     * @param {Object} settings: The settings object
     * @param {Function} unlockButtonCallback: Callback for unlock button click
     *
     * @returns The settings panel element
     */
    static buildAdvancedSettingsPanel(parentButton, settings, unlockButtonCallback)
    {
        const farmingSettingPanel = Automation.Menu.addSettingPanel(parentButton.parentElement.parentElement);

        const titleDiv = Automation.Menu.createTitleElement("Farming advanced settings");
        titleDiv.style.marginBottom = "10px";
        farmingSettingPanel.appendChild(titleDiv);

        // Automatically catch wanderers button
        const catchWanderersLabel = "Catch wandering pokémons";
        const catchWanderersTooltip = "When a wandering pokémon appears it tries to catch it.\n"
            + "The in-game pokéball filters are used to determine the ball to use.\n"
            + "If no filter matches, the pokémon will flee.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(catchWanderersLabel,
            settings.AutoCatchWanderers,
            catchWanderersTooltip,
            farmingSettingPanel);

        // Focus on unlock button
        const unlockLabel = "Focus on unlocking plots and new berries";
        const unlockTooltip = "Takes the necessary actions to unlock new slots and berries";
        const unlockButton = Automation.Menu.addLabeledAdvancedSettingsToggleButton(unlockLabel,
            settings.FocusOnUnlocks,
            unlockTooltip,
            farmingSettingPanel);

        // Disable oak items button
        const disableOakItemTooltip = "Modifies the oak item loadout when required for a mutation to occur"
            + Automation.Menu.TooltipSeparator
            + "⚠️ Disabling this functionality will prevent some berries from being unlocked";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Update oak item loadout when needed",
            settings.OakItemLoadoutUpdate,
            disableOakItemTooltip,
            farmingSettingPanel);

        // Gather as late as possible button
        const gatherAsLateAsPossibleTooltip = "Enabling this setting will harvest the berries right before they die.\n"
            + "This is useful when you want the aura instead of the berry itself.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Harvest berries as late as possible",
            settings.HarvestLate,
            gatherAsLateAsPossibleTooltip,
            farmingSettingPanel);

        // Use rich mulch before harvesting button
        const richMulchBeforeHarvestTooltip = "Enabling this setting will apply rich mulch to the plot right before harvesting."
            + Automation.Menu.TooltipSeparator
            + "Mulch will not be applied if their is no available stock.\n"
            + "Nor will it be if the plot already has some mulch applied.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Apply rich mulch before harvesting",
            settings.UseRichMulch,
            richMulchBeforeHarvestTooltip,
            farmingSettingPanel);

        // Use shovels to remove unwanted berries button
        const useShovelTooltip = "Enabling this setting will use shovels to remove unwanted berries from plots."
            + Automation.Menu.TooltipSeparator
            + "Shovels will not be used if their is no available stock.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Use shovels to remove unwanted berries",
            settings.UseShovel,
            useShovelTooltip,
            farmingSettingPanel);

        // Add unlock button callback
        if (unlockButtonCallback)
        {
            unlockButton.addEventListener("click", unlockButtonCallback, false);
        }

        return farmingSettingPanel;
    }

    /**
     * @brief Builds the Colbur Nonsense mode toggle
     *
     * @param {Element} parentPanel: The parent panel
     * @param {Object} settings: The settings object
     * @param {Function} toggleCallback: Callback for toggle
     */
    static buildColburNonsenseToggle(parentPanel, settings, toggleCallback)
    {
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Colbur Nonsense Mode",
            settings.ColburNonsenseEnabled,
            "Active le layout Colbur Nonsense (force le pattern Payapa/Colbur/Babiri/Petaya + Cheri partout).\nActive automatiquement Use Shovel + Harvest Late.",
            parentPanel,
            toggleCallback
        );
    }

    /**
     * @brief Creates the floating modal for farming status
     *
     * @param {string} modalId: The in-game modal ID to attach to
     *
     * @returns Object containing the floating container elements
     */
    static createFloatingModal(modalId)
    {
        const farmInGameModal = document.getElementById(modalId);

        const farmTitle = '🌾Farming 🌾';
        const categoryContainer = Automation.Menu.addFloatingCategory("automationFarmingModal", farmTitle, farmInGameModal);
        const contentFloatingContainer = categoryContainer.parentElement;
        contentFloatingContainer.hidden = true;

        const contentFloatingContentContainer = document.createElement("div");
        contentFloatingContentContainer.style.textAlign = "center";
        contentFloatingContentContainer.style.padding = "4px";
        categoryContainer.appendChild(contentFloatingContentContainer);

        return {
            farmInGameModal,
            contentFloatingContainer,
            contentFloatingContentContainer
        };
    }
}
