document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Main Form
    const competitorNameInput = document.getElementById('competitor-name');
    
    // Setup insurance company autocomplete
    setupInsuranceCompanyAutocomplete(competitorNameInput);

    // Payment Breakdown Fields
    const annualCashPriceInput = document.getElementById('annual-cash-price');
    const downPaymentInput = document.getElementById('down-payment');
    const instalmentAmountInput = document.getElementById('instalment-amount');
    const numberOfInstalmentsInput = document.getElementById('number-of-instalments');
    const ddAnnualTotalValue = document.getElementById('dd-annual-total-value');
    const totalExcessInput = document.getElementById('total-excess');
    const finalTotalPaymentValue = document.getElementById('final-total-payment-value');

    // DOM Elements - Optional Info & Add-ons
    const telematicsPolicyToggle = document.getElementById('telematics-policy-toggle');
    const telematicsDetailsContainer = document.getElementById('telematics-details-container');
    const telematicsDetailsInput = document.getElementById('telematics-details');

    // New Addon Search System
    const addonSearchInput = document.getElementById('addon-search-input');
    const addonSuggestionsList = document.getElementById('addon-suggestions-list');
    const selectedAddonsContainer = document.getElementById('selected-addons-container');

    // DOM Elements - Action Buttons
    const prefillButton = document.getElementById('prefill-button');
    const saveButton = document.getElementById('save-button');
    const saveButtonText = saveButton.querySelector('.btn-text');
    const saveButtonIcon = saveButton.querySelector('.btn-icon');
    const clearButton = document.getElementById('clear-button');
    const copySummaryButton = document.getElementById('copy-summary-button');

    const baseFormInputs = [
        competitorNameInput, annualCashPriceInput,
        downPaymentInput, instalmentAmountInput, numberOfInstalmentsInput, totalExcessInput,
        telematicsPolicyToggle, telematicsDetailsInput,
    ];

    const LOCAL_STORAGE_KEY = 'quoteCaptureDataV7'; // From previous correct step
    let currentInputState = 'product';
    let selectedProductData = null;
    let activeSuggestionIndex = -1;

    const AVAILABLE_ADDONS_DATA = [
        { name: "Audio Equipment Cover", priceEditable: true },
        {
            name: "Breakdown Cover",
            priceEditable: true,
            subOptionsConfig: {
                type: 'multiselect',
                options: [
                    { id: "roadside", label: "Roadside Assistance", price: 0 },
                    { id: "homestart", label: "Home Start", price: 0 },
                    { id: "national", label: "National Recovery", price: 0 },
                    { id: "onward", label: "Onward Travel", price: 0 },
                    { id: "european_bd", label: "European Breakdown", price: 0 },
                    { id: "partsLabour", label: "Parts and Labour", price: 0 }
                ]
            }
        },
        { name: "Child Car Seat Cover", priceEditable: true },
        { name: "Consumables Cover", priceEditable: true },
        { name: "Courtesy Car Cover", priceEditable: true },
        { name: "Daily Allowance Cover", priceEditable: true },
        { name: "Driving Abroad Cover", priceEditable: true },
        { name: "Engine Protection Cover", priceEditable: true },
        { name: "Enhanced Personal Belongings Cover", priceEditable: true },
        { name: "Excess Protection", priceEditable: true },
        { name: "Flood Damage Cover", priceEditable: true },
        { name: "Gap Insurance", priceEditable: true },
        { name: "Key Cover", priceEditable: true },
        { name: "Motor Legal Protection", priceEditable: true },
        { name: "Medical Expenses Cover", priceEditable: true },
        { name: "Misfuelling Cover", priceEditable: true },
        { name: "Named Driver Cover", priceEditable: true },
        { name: "No Claims Bonus Protection", priceEditable: true },
        { name: "Personal Accident Cover", priceEditable: true },
        { name: "Return to Invoice Cover", priceEditable: true },
        { name: "Sat Nav Cover", priceEditable: true },
        { name: "SmartFob Keycare", priceEditable: true },
        { name: "Towing Insurance", priceEditable: true },
        { name: "Tyre Protection Cover", priceEditable: true },
        { name: "Uninsured Driver Protection", priceEditable: true },
        { name: "Windscreen Cover", priceEditable: true }
    ].sort((a, b) => a.name.localeCompare(b.name));

    let currentlySelectedAddons = [];

    // --- Event Listeners ---
    baseFormInputs.forEach(input => {
        input.addEventListener('input', () => { saveData(); calculateAllTotals(); });
        input.addEventListener('change', () => { saveData(); calculateAllTotals(); });
    });

    telematicsPolicyToggle.addEventListener('change', () => {
        toggleConditionalInput(telematicsPolicyToggle, telematicsDetailsContainer);
        saveData();
        calculateAllTotals();
    });

    addonSearchInput.addEventListener('input', handleAddonSearchInput);
    addonSearchInput.addEventListener('keydown', handleAddonSearchKeydown);
    addonSearchInput.addEventListener('blur', () => {
        setTimeout(() => {
            const subOptionsPanelHovered = document.querySelector('.addon-sub-options-panel:hover');
            if (!addonSuggestionsList.matches(':hover') && !subOptionsPanelHovered) {
                 addonSuggestionsList.innerHTML = '';
                 addonSuggestionsList.style.display = 'none';
            }
        }, 250);
    });
    addonSuggestionsList.addEventListener('mouseleave', () => {
        const subOptionsPanelHovered = document.querySelector('.addon-sub-options-panel:hover');
        if (document.activeElement !== addonSearchInput && !subOptionsPanelHovered) {
            addonSuggestionsList.innerHTML = '';
            addonSuggestionsList.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(event) {
        const openPanel = document.querySelector('.addon-sub-options-panel.expanded');
        if (openPanel && !openPanel.contains(event.target) && !event.target.closest('.addon-bubble')) {
            openPanel.classList.remove('expanded');
            openPanel.classList.add('collapsed');
            const trigger = openPanel.closest('.addon-bubble').querySelector('.sub-options-trigger');
            if(trigger) trigger.classList.remove('active');
        }
    });

    prefillButton.addEventListener('click', () => loadData(true));
    saveButton.addEventListener('click', handleSaveAnimation);
    clearButton.addEventListener('click', clearForm);
    copySummaryButton.addEventListener('click', copySummary);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && document.activeElement !== addonSearchInput) {
            const currentElement = document.activeElement;
            if (currentElement.tagName === 'INPUT' && currentElement.type !== 'checkbox' || currentElement.tagName === 'SELECT') {
                event.preventDefault();
                const focusableElements = Array.from(document.querySelectorAll('input:not([type="hidden"]):not(:disabled), select:not(:disabled), button:not(:disabled)'))
                                           .filter(el => el.offsetParent !== null && !el.closest('.collapsed'));
                let currentIndex = focusableElements.indexOf(currentElement);
                let nextElement = focusableElements[currentIndex + 1];
                if (nextElement) {
                    nextElement.focus();
                } else {
                    saveButton.focus();
                }
            }
        }
    });

    // --- Functions ---
    function toggleConditionalInput(checkboxElement, containerElement) {
        if (checkboxElement.checked) {
            containerElement.classList.add('expanded');
            containerElement.classList.remove('collapsed');
        } else {
            containerElement.classList.remove('expanded');
            containerElement.classList.add('collapsed');
        }
    }
    
    function parseTelematicsCost(detailsString) {
        if (!detailsString) return 0;
        const parts = detailsString.split('/');
        const costPart = parts[parts.length - 1].trim();
        const cost = parseFloat(costPart);
        return isNaN(cost) ? 0 : cost;
    }

    function calculateBasePremium() {
        let basePremium = 0;
        const annualCash = parseFloat(annualCashPriceInput.value) || 0;
        const downPayment = parseFloat(downPaymentInput.value) || 0;
        const instalmentAmount = parseFloat(instalmentAmountInput.value) || 0;
        const numInstalments = parseInt(numberOfInstalmentsInput.value) || 0;
        let calculatedDDTotal = 0;

        if (numInstalments > 0 && instalmentAmount > 0) {
            calculatedDDTotal = downPayment + (instalmentAmount * numInstalments);
        } else if (downPayment > 0) {
             calculatedDDTotal = downPayment;
        }
        ddAnnualTotalValue.textContent = `£${calculatedDDTotal.toFixed(2)}`;

        if (annualCash > 0) {
            basePremium = annualCash;
        } else {
            basePremium = calculatedDDTotal;
        }
        return basePremium;
    }

    function calculateAddonsTotal() {
        let addonsTotal = 0;
        if (telematicsPolicyToggle.checked) {
            addonsTotal += parseTelematicsCost(telematicsDetailsInput.value);
        }
        currentlySelectedAddons.forEach(addon => {
            addonsTotal += addon.price;
            if (addon.selectedSubOptions && addon.subOptionsConfig) {
                addon.selectedSubOptions.forEach(subOptId => {
                    const subOptionData = addon.subOptionsConfig.options.find(so => so.id === subOptId);
                    if (subOptionData && subOptionData.price) {
                        addonsTotal += subOptionData.price;
                    }
                });
            }
        });
        return addonsTotal;
    }

    function calculateAllTotals() {
        const basePremium = calculateBasePremium();
        const addonsTotal = calculateAddonsTotal();
        const finalTotal = basePremium + addonsTotal;
        finalTotalPaymentValue.textContent = `£${finalTotal.toFixed(2)}`;
    }

    function handleAddonSearchInput() {
        if (currentInputState === 'product') {
            const query = addonSearchInput.value.toLowerCase();
            addonSuggestionsList.innerHTML = '';
            if (query.length === 0) {
                addonSuggestionsList.style.display = 'none';
                return;
            }
            const filteredAddons = AVAILABLE_ADDONS_DATA.filter(addonData => 
                addonData.name.toLowerCase().includes(query) &&
                !currentlySelectedAddons.some(sa => sa.name === addonData.name)
            );
            if (filteredAddons.length > 0) {
                filteredAddons.forEach(addonData => {
                    const div = document.createElement('div');
                    div.textContent = addonData.name;
                    div.addEventListener('click', () => selectAddonProduct(addonData));
                    addonSuggestionsList.appendChild(div);
                });
                addonSuggestionsList.style.display = 'block';
            } else {
                addonSuggestionsList.style.display = 'none';
            }
            activeSuggestionIndex = -1;
        }
    }

    function handleAddonSearchKeydown(event) {
        const suggestions = Array.from(addonSuggestionsList.children);
        if (currentInputState === 'product' && suggestions.length === 0 && event.key !== 'Enter' && event.key !== 'Escape') return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (suggestions.length > 0) {
                activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
                updateSuggestionHighlight(suggestions);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (suggestions.length > 0) {
                activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
                updateSuggestionHighlight(suggestions);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (currentInputState === 'product') {
                if (activeSuggestionIndex > -1 && suggestions[activeSuggestionIndex]) {
                    const addonName = suggestions[activeSuggestionIndex].textContent;
                    const addonData = AVAILABLE_ADDONS_DATA.find(ad => ad.name === addonName);
                    if (addonData) selectAddonProduct(addonData);
                } else if (suggestions.length > 0) {
                     const addonName = suggestions[0].textContent;
                     const addonData = AVAILABLE_ADDONS_DATA.find(ad => ad.name === addonName);
                     if (addonData) selectAddonProduct(addonData);
                }
            } else if (currentInputState === 'price') {
                confirmAddonPrice();
            }
        } else if (event.key === 'Escape') {
            resetAddonInput();
        }
    }
    
    function updateSuggestionHighlight(suggestions) {
        suggestions.forEach((div, index) => {
            div.classList.toggle('selected', index === activeSuggestionIndex);
        });
    }

    function selectAddonProduct(productData) {
        selectedProductData = productData;
        currentInputState = 'price';
        addonSearchInput.value = '';
        addonSearchInput.placeholder = `Enter price for ${productData.name} (£):`;
        addonSearchInput.type = productData.priceEditable ? 'number' : 'text';
        addonSearchInput.readOnly = !productData.priceEditable;
        if (productData.priceEditable) {
            addonSearchInput.min = "0";
            addonSearchInput.step = "0.01";
        } else {
            addonSearchInput.value = productData.price !== undefined ? productData.price.toFixed(2) : "0.00";
        }
        addonSuggestionsList.innerHTML = '';
        addonSuggestionsList.style.display = 'none';
        addonSearchInput.focus();
    }

    function confirmAddonPrice() {
        const price = parseFloat(addonSearchInput.value);
        if (selectedProductData && !isNaN(price) && price >= 0) {
            const newAddon = {
                name: selectedProductData.name,
                price: price,
                subOptionsConfig: selectedProductData.subOptionsConfig,
                selectedSubOptions: [] 
            };
            addAddonBubble(newAddon);
            currentlySelectedAddons.push(newAddon);
            resetAddonInput();
            saveData();
            calculateAllTotals();
        } else {
            alert('Please enter a valid price for the selected product.');
            addonSearchInput.focus();
        }
    }
    
    function resetAddonInput() {
        selectedProductData = null;
        currentInputState = 'product';
        addonSearchInput.value = '';
        addonSearchInput.placeholder = 'Start typing product name...';
        addonSearchInput.type = 'text';
        addonSearchInput.readOnly = false;
        addonSearchInput.min = "";
        addonSearchInput.step = "";
        addonSuggestionsList.innerHTML = '';
        addonSuggestionsList.style.display = 'none';
        activeSuggestionIndex = -1;
        addonSearchInput.focus();
    }

    function addAddonBubble(addonData) {
        const bubble = document.createElement('div');
        bubble.classList.add('addon-bubble');
        bubble.dataset.addonName = addonData.name;

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('addon-bubble-content');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('addon-bubble-name');
        nameSpan.textContent = `${addonData.name}: £${addonData.price.toFixed(2)}`;
        contentWrapper.appendChild(nameSpan);

        // Create a container for selected sub-options
        const selectedOptionsDisplay = document.createElement('div');
        selectedOptionsDisplay.classList.add('selected-sub-options');
        selectedOptionsDisplay.id = `selected-options-${addonData.name.replace(/\s+/g, '-').toLowerCase()}`;
        contentWrapper.appendChild(selectedOptionsDisplay);

        let subOptionsPanel; // Declare here to access in bubble click

        if (addonData.subOptionsConfig) {
            const subOptionsTrigger = document.createElement('button');
            subOptionsTrigger.classList.add('sub-options-trigger');
            subOptionsTrigger.innerHTML = '&#9662;'; 
            subOptionsTrigger.title = "Configure sub-options";
            
            subOptionsPanel = document.createElement('div'); // Assign here
            subOptionsPanel.classList.add('addon-sub-options-panel', 'collapsed');
            
            addonData.subOptionsConfig.options.forEach(subOpt => {
                const subOptLabel = document.createElement('label');
                subOptLabel.classList.add('sub-option-label');
                const subOptCheckbox = document.createElement('input');
                subOptCheckbox.type = 'checkbox';
                subOptCheckbox.value = subOpt.id;
                subOptCheckbox.checked = addonData.selectedSubOptions && addonData.selectedSubOptions.includes(subOpt.id);
                subOptCheckbox.onchange = () => {
                    updateSelectedSubOptions(addonData.name, subOpt.id, subOptCheckbox.checked);
                };
                subOptLabel.appendChild(subOptCheckbox);
                subOptLabel.appendChild(document.createTextNode(` ${subOpt.label}`)); // Price removed from label
                subOptionsPanel.appendChild(subOptLabel);
            });
            
            const togglePanel = (e) => {
                e.stopPropagation();
                
                // Close any other open panels first
                document.querySelectorAll('.addon-sub-options-panel.expanded').forEach(panel => {
                    if (panel !== subOptionsPanel) {
                        panel.classList.remove('expanded');
                        panel.classList.add('collapsed');
                        const otherTrigger = panel.closest('.addon-bubble').querySelector('.sub-options-trigger');
                        if(otherTrigger) otherTrigger.classList.remove('active');
                    }
                });
                
                // Toggle this panel
                subOptionsPanel.classList.toggle('expanded');
                subOptionsPanel.classList.toggle('collapsed');
                subOptionsTrigger.classList.toggle('active', subOptionsPanel.classList.contains('expanded'));
            };

            subOptionsTrigger.onclick = togglePanel;
            contentWrapper.appendChild(subOptionsTrigger);
            bubble.appendChild(subOptionsPanel);
            
            // Make the entire bubble (excluding remove button) toggle the panel
            bubble.addEventListener('click', function(e) {
                if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
                    togglePanel(e);
                }
            });

            // Initially display selected sub-options
            updateSubOptionsDisplay(addonData);
        }
        bubble.insertBefore(contentWrapper, bubble.firstChild);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-addon');
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => { e.stopPropagation(); removeAddonBubble(addonData.name); };
        bubble.appendChild(removeBtn);

        selectedAddonsContainer.appendChild(bubble);
    }
    
    // New function to update the display of selected sub-options in the bubble
    function updateSubOptionsDisplay(addonData) {
        const displayContainer = document.querySelector(`#selected-options-${addonData.name.replace(/\s+/g, '-').toLowerCase()}`);
        if (!displayContainer) return;
        
        displayContainer.innerHTML = '';
        
        if (addonData.selectedSubOptions && addonData.selectedSubOptions.length > 0 && addonData.subOptionsConfig) {
            const selectedLabels = addonData.selectedSubOptions.map(id => {
                const option = addonData.subOptionsConfig.options.find(opt => opt.id === id);
                return option ? option.label : id;
            });
            
            selectedLabels.forEach(label => {
                const chip = document.createElement('span');
                chip.classList.add('sub-option-chip');
                chip.textContent = label;
                displayContainer.appendChild(chip);
            });
        }
    }
    
    function updateSelectedSubOptions(mainAddonName, subOptionId, isChecked) {
        const mainAddon = currentlySelectedAddons.find(a => a.name === mainAddonName);
        if (mainAddon) {
            if (!mainAddon.selectedSubOptions) {
                mainAddon.selectedSubOptions = [];
            }
            if (isChecked) {
                if (!mainAddon.selectedSubOptions.includes(subOptionId)) {
                    mainAddon.selectedSubOptions.push(subOptionId);
                }
            } else {
                mainAddon.selectedSubOptions = mainAddon.selectedSubOptions.filter(id => id !== subOptionId);
            }
            
            // Update the visual display of selected options
            updateSubOptionsDisplay(mainAddon);
            
            saveData();
            calculateAllTotals();
        }
    }

    function removeAddonBubble(nameToRemove) {
        currentlySelectedAddons = currentlySelectedAddons.filter(addon => addon.name !== nameToRemove);
        const bubbleToRemove = selectedAddonsContainer.querySelector(`.addon-bubble[data-addon-name="${nameToRemove}"]`);
        if (bubbleToRemove) {
            selectedAddonsContainer.removeChild(bubbleToRemove);
        }
        saveData();
        calculateAllTotals();
    }

    function saveData() {
        const data = {
            competitorName: competitorNameInput.value,
            annualCashPrice: annualCashPriceInput.value,
            downPayment: downPaymentInput.value,
            instalmentAmount: instalmentAmountInput.value,
            numberOfInstalments: numberOfInstalmentsInput.value,
            totalExcess: totalExcessInput.value,
            telematicsPolicy: telematicsPolicyToggle.checked,
            telematicsDetails: telematicsDetailsInput.value,
            selectedAddons: currentlySelectedAddons
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        console.log('Data saved:', data);
    }

    function loadData(isPrefill = true) {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            competitorNameInput.value = data.competitorName || '';
            annualCashPriceInput.value = data.annualCashPrice || '';
            downPaymentInput.value = data.downPayment || '';
            instalmentAmountInput.value = data.instalmentAmount || '';
            numberOfInstalmentsInput.value = data.numberOfInstalments || '';
            totalExcessInput.value = data.totalExcess || '';
            telematicsPolicyToggle.checked = data.telematicsPolicy || false;
            telematicsDetailsInput.value = data.telematicsDetails || '';
            toggleConditionalInput(telematicsPolicyToggle, telematicsDetailsContainer);
            selectedAddonsContainer.innerHTML = '';
            currentlySelectedAddons = [];
            if (data.selectedAddons && Array.isArray(data.selectedAddons)) {
                data.selectedAddons.forEach(addonData => {
                    const fullAddonDef = AVAILABLE_ADDONS_DATA.find(a => a.name === addonData.name);
                    const hydratedAddonData = {
                        ...addonData,
                        subOptionsConfig: fullAddonDef ? fullAddonDef.subOptionsConfig : undefined
                    };
                    addAddonBubble(hydratedAddonData);
                    currentlySelectedAddons.push(hydratedAddonData);
                });
            }
            resetAddonInput();
            calculateAllTotals();
            if (isPrefill) {
                showTemporaryMessage(prefillButton, 'Data Loaded!', 1500);
            }
            console.log('Data loaded:', data);
        } else {
            if (isPrefill) {
                showTemporaryMessage(prefillButton, 'No saved data found.', 1500, true);
            }
            console.log('No data found in local storage.');
        }
    }

    function clearForm() {
        competitorNameInput.value = '';
        annualCashPriceInput.value = '';
        downPaymentInput.value = '';
        instalmentAmountInput.value = '';
        numberOfInstalmentsInput.value = '';
        totalExcessInput.value = '';
        telematicsPolicyToggle.checked = false;
        telematicsDetailsInput.value = '';
        toggleConditionalInput(telematicsPolicyToggle, telematicsDetailsContainer);
        currentlySelectedAddons = [];
        selectedAddonsContainer.innerHTML = '';
        resetAddonInput();
        calculateAllTotals();
        saveData();
        showTemporaryMessage(clearButton, 'Form Cleared!', 1500);
        competitorNameInput.focus();
    }

    function handleSaveAnimation() {
        saveData();
        calculateAllTotals();
        saveButtonText.style.display = 'none';
        saveButtonIcon.style.display = 'inline';
        saveButton.classList.add('success');
        setTimeout(() => {
            saveButtonText.style.display = 'inline';
            saveButtonIcon.style.display = 'none';
            saveButton.classList.remove('success');
        }, 2000);
    }

    function copySummary() {
        const cName = competitorNameInput.value || 'N/A';
        const totalExc = totalExcessInput.value ? `£${parseFloat(totalExcessInput.value).toFixed(2)}` : 'N/A';
        const finalTotalText = finalTotalPaymentValue.textContent;
        let paymentDetails = "";
        const annualCash = annualCashPriceInput.value ? `£${parseFloat(annualCashPriceInput.value).toFixed(2)}` : 'N/A';
        paymentDetails += `Total Annual Cash Price: ${annualCash}\n`;
        const downP = downPaymentInput.value ? `£${parseFloat(downPaymentInput.value).toFixed(2)}` : 'N/A';
        const instAmt = instalmentAmountInput.value ? `£${parseFloat(instalmentAmountInput.value).toFixed(2)}` : 'N/A';
        const numInst = numberOfInstalmentsInput.value || 'N/A';
        const ddTotal = ddAnnualTotalValue.textContent;
        paymentDetails += `Calculated Direct Debit Annual Total: ${ddTotal}\n` +
                         `  Down Payment: ${downP}\n` +
                         `  Monthly Instalment: ${instAmt} (for ${numInst} instalments)\n`;
        paymentDetails += `Total Policy Excess: ${totalExc}\n`;

        let summary = `Competitor Quote Summary:
-----------------------------
Competitor: ${cName}
-----------------------------
Payment Breakdown:
${paymentDetails}-----------------------------`;
        let addonsSummaryText = "Add-ons & Optional Extras:\n";
        let hasAddons = false;
        if (telematicsPolicyToggle.checked) {
            const teleDetails = telematicsDetailsInput.value || "Details N/A";
            const teleCost = parseTelematicsCost(teleDetails);
            addonsSummaryText += `Telematics/Essentials Policy: Yes\n - Details/Cost: ${teleDetails} (Parsed Cost: £${teleCost.toFixed(2)})\n`;
            hasAddons = true;
        }
        if (currentlySelectedAddons.length > 0) {
            currentlySelectedAddons.forEach(addon => {
                let addonLine = `${addon.name}: Yes (£${addon.price.toFixed(2)})`;
                if (addon.selectedSubOptions && addon.selectedSubOptions.length > 0 && addon.subOptionsConfig) {
                    const subOptionLabels = addon.selectedSubOptions.map(soId => {
                        const subOpt = addon.subOptionsConfig.options.find(s => s.id === soId);
                        let subOptText = subOpt ? subOpt.label : soId;
                        // Price for sub-options is not displayed in summary label per feedback
                        // if (subOpt && subOpt.price > 0) {
                        //     subOptText += ` (+£${subOpt.price.toFixed(2)})`;
                        // }
                        return subOptText;
                    });
                    addonLine += ` (Includes: ${subOptionLabels.join(', ')})`;
                }
                addonsSummaryText += addonLine + '\n';
            });
            hasAddons = true;
        }
        if (hasAddons) {
            summary += addonsSummaryText;
        } else {
            summary += "No additional products or telematics selected.\n";
        }
        summary += `-----------------------------\nOverall Quoted Price (with Add-ons): ${finalTotalText}\n-----------------------------`;
        navigator.clipboard.writeText(summary.trim())
            .then(() => showTemporaryMessage(copySummaryButton, 'Summary Copied!', 1500))
            .catch(err => {
                showTemporaryMessage(copySummaryButton, 'Copy Failed!', 1500, true);
                console.error('Failed to copy summary: ', err);
                alert('Failed to copy. Please try again or copy manually.');
            });
    }

    function showTemporaryMessage(buttonElement, message, duration, isError = false) {
        const textElement = buttonElement.querySelector('.btn-text') || buttonElement;
        const originalText = textElement.textContent;
        textElement.textContent = message;
        if(isError) buttonElement.classList.add('error-temp'); else buttonElement.classList.add('success-temp');
        if (buttonElement === saveButton) saveButtonIcon.style.display = 'none';
        setTimeout(() => {
            textElement.textContent = originalText;
            if(isError) buttonElement.classList.remove('error-temp'); else buttonElement.classList.remove('success-temp');
            if (buttonElement === saveButton && !saveButton.classList.contains('success')) {
                 saveButtonIcon.style.display = 'none';
            }
        }, duration);
    }

    // --- Initialisation ---
    loadData(false);
    
    /**
     * Sets up autocomplete for insurance company names
     * @param {HTMLInputElement} inputElement - The input element to add autocomplete to
     */
    function setupInsuranceCompanyAutocomplete(inputElement) {
        // Create suggestion container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'insurance-suggestions';
        suggestionsContainer.style.display = 'none';
        
        // Make sure parent container is position relative
        inputElement.parentNode.style.position = 'relative';
        
        // Add the suggestions container to the DOM
        inputElement.parentNode.appendChild(suggestionsContainer);
        
        let currentFocusedIndex = -1;
        
        // Input event handler
        inputElement.addEventListener('input', async function() {
            const query = this.value.trim();
            const debugElement = document.getElementById('api-debug');
            
            // Debug info
            console.log('Input event fired with query:', query);
            console.log('Insurance service exists:', !!window.InsuranceCompaniesService);
            
            if (debugElement) {
                debugElement.innerHTML = `Searching for: "${query}"... (API: ${!!window.InsuranceCompaniesService ? 'Available' : 'Not available'})`;
                debugElement.style.color = !!window.InsuranceCompaniesService ? '#28a745' : '#dc3545';
            }
            
            if (query.length < 2) {
                suggestionsContainer.style.display = 'none';
                console.log('Query too short, hiding suggestions');
                if (debugElement) debugElement.innerHTML = 'Type at least 2 characters to search';
                return;
            }
            
            try {
                // Get matching companies
                console.log('Calling search with query:', query);
                const debugElement = document.getElementById('api-debug');
                
                if (!window.InsuranceCompaniesService) {
                    if (debugElement) {
                        debugElement.innerHTML = 'Insurance service not initialized';
                        debugElement.style.color = '#dc3545';
                    }
                    throw new Error('Insurance service not initialized');
                }
                
                const matches = await window.InsuranceCompaniesService.search(query, 5);
                console.log('Search results:', matches);
                
                if (debugElement) {
                    debugElement.innerHTML = `Found ${matches ? matches.length : 0} results for "${query}"`;
                    debugElement.style.color = '#28a745';
                }
                
                // Display matches
                if (matches && matches.length > 0) {
                    suggestionsContainer.innerHTML = '';
                    matches.forEach((match, index) => {
                        const div = document.createElement('div');
                        // Highlight the matching part
                        const matchIndex = match.toLowerCase().indexOf(query.toLowerCase());
                        const beforeMatch = match.substring(0, matchIndex);
                        const matchPart = match.substring(matchIndex, matchIndex + query.length);
                        const afterMatch = match.substring(matchIndex + query.length);
                        
                        div.innerHTML = `${beforeMatch}<strong>${matchPart}</strong>${afterMatch}`;
                        
                        // Add click handler
                        div.addEventListener('click', function() {
                            inputElement.value = match;
                            suggestionsContainer.style.display = 'none';
                            // Trigger input event to update any dependent elements
                            inputElement.dispatchEvent(new Event('input'));
                            inputElement.dispatchEvent(new Event('change'));
                        });
                        
                        // Add mouseover handler for highlight
                        div.addEventListener('mouseover', function() {
                            // Remove focused class from all items
                            Array.from(suggestionsContainer.children).forEach(child => {
                                child.classList.remove('focused');
                            });
                            // Add focused class to this item
                            this.classList.add('focused');
                            currentFocusedIndex = index;
                        });
                        
                        suggestionsContainer.appendChild(div);
                    });
                    
                    suggestionsContainer.style.display = 'block';
                    currentFocusedIndex = -1; // Reset focus when showing new suggestions
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            } catch (error) {
                console.error('Error in autocomplete:', error);
                suggestionsContainer.style.display = 'none';
            }
        });
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target !== inputElement && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
        
        // Keyboard navigation
        inputElement.addEventListener('keydown', function(e) {
            if (suggestionsContainer.style.display === 'none') return;
            
            const suggestions = suggestionsContainer.querySelectorAll('div');
            if (suggestions.length === 0) return;
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentFocusedIndex++;
                    if (currentFocusedIndex >= suggestions.length) {
                        currentFocusedIndex = 0; // Loop back to top
                    }
                    updateFocus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    currentFocusedIndex--;
                    if (currentFocusedIndex < 0) {
                        currentFocusedIndex = suggestions.length - 1; // Loop to bottom
                    }
                    updateFocus();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (currentFocusedIndex >= 0) {
                        suggestions[currentFocusedIndex].click();
                    }
                    break;
                case 'Escape':
                    suggestionsContainer.style.display = 'none';
                    break;
            }
            
            function updateFocus() {
                suggestions.forEach((item, index) => {
                    if (index === currentFocusedIndex) {
                        item.classList.add('focused');
                        // Scroll item into view if needed
                        item.scrollIntoView({ block: 'nearest' });
                    } else {
                        item.classList.remove('focused');
                    }
                });
            }
        });
        
        // Initialize the insurance company service in the background
        window.InsuranceCompaniesService.init().catch(error => {
            console.error('Failed to initialize insurance companies service:', error);
        });
    }
});
