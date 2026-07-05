import { app } from "../../scripts/app.js";

console.log("[Krea2Tuner] Loading frontend extension with Save Preset button...");

function initNode(node) {
    if (node.comfyClass !== "Krea2ProjectorTuner") return;
    
    const presetWidget = node.widgets.find(w => w.name === "preset");
    if (!presetWidget) return;

    let isUpdating = false;
    let isProgrammaticCustom = false; // Flag to prevent zero-out reset of knobs when dropdown changes to "custom" programmatically
    let currentPresetValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Track loaded preset values to filter false mouse events

    // Configure all knob widgets to have step 0.01 (like LoRA Loader)
    // but keep round at 0.000001 to prevent rounding of high-precision inputs.
    for (let i = 0; i < 12; i++) {
        const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
        if (knobWidget) {
            if (!knobWidget.options) knobWidget.options = {};
            knobWidget.options.step = 0.01;
            knobWidget.options.round = 0.000001; 
            delete knobWidget.options.precision;
            delete knobWidget.options.format;
        }
    }

    // Add a button widget to save current custom configuration as a preset
    let saveBtn = node.widgets.find(w => w.name === "Save Preset (BSS)");
    if (!saveBtn) {
        node.addWidget("button", "Save Preset (BSS)", "save_preset", () => {
            const name = prompt("Enter a name for the new preset:");
            if (!name || name.trim() === "") return;
            
            // Collect the current values of knob_0 to knob_11
            const knobs = [];
            for (let i = 0; i < 12; i++) {
                const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
                knobs.push(knobWidget ? parseFloat(knobWidget.value) : 0.0);
            }
            
            // Send the new preset to the backend API
            fetch('/krea2_tuner/save_preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), knobs: knobs })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    alert(`Preset "${name}" saved successfully!`);
                    // Fetch the updated presets list from the backend
                    fetch('/krea2_tuner/presets')
                        .then(r2 => r2.json())
                        .then(presets => {
                            if (presetWidget) {
                                // Update options and value dynamically without reload
                                presetWidget.options.values = Object.keys(presets);
                                presetWidget.value = name.trim();
                                if (presetWidget.callback) {
                                    presetWidget.callback(name.trim());
                                }
                            }
                        });
                } else {
                    alert("Error saving preset: " + res.error);
                }
            })
            .catch(err => {
                alert("Error sending request: " + err);
            });
        });
    }

    // Add a button widget to delete the currently selected preset
    let deleteBtn = node.widgets.find(w => w.name === "Delete Selected Preset (BSS)");
    if (!deleteBtn) {
        node.addWidget("button", "Delete Selected Preset (BSS)", "delete_preset", () => {
            const currentPreset = presetWidget.value;
            if (currentPreset === "custom") {
                alert("Cannot delete the 'custom' preset option.");
                return;
            }
            if (!confirm(`Are you sure you want to delete the preset "${currentPreset}"? This will permanently remove its JSON file.`)) {
                return;
            }
            
            fetch('/krea2_tuner/delete_preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentPreset })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    alert(`Preset "${currentPreset}" deleted successfully!`);
                    // Refresh preset choices
                    fetch('/krea2_tuner/presets')
                        .then(r2 => r2.json())
                        .then(presets => {
                            if (presetWidget) {
                                presetWidget.options.values = Object.keys(presets);
                                isProgrammaticCustom = true; // prevent zero-out
                                presetWidget.value = "custom";
                                if (presetWidget.callback) {
                                    presetWidget.callback("custom");
                                }
                                isProgrammaticCustom = false;
                            }
                        });
                } else {
                    alert("Error deleting preset: " + res.error);
                }
            })
            .catch(err => {
                alert("Error sending request: " + err);
            });
        });
    }

    // Add a button widget to open the presets folder in OS file explorer
    let openFolderBtn = node.widgets.find(w => w.name === "Open Presets Folder (BSS)");
    if (!openFolderBtn) {
        node.addWidget("button", "Open Presets Folder (BSS)", "open_folder", () => {
            fetch('/krea2_tuner/open_folder', {
                method: 'POST'
            })
            .then(r => r.json())
            .then(res => {
                if (!res.success) {
                    alert("Error opening folder: " + res.error);
                }
            })
            .catch(err => {
                alert("Error sending request: " + err);
            });
        });
        node.setSize(node.size);
    }

    // Override preset selection callback
    const originalCallback = presetWidget.callback;
    presetWidget.callback = function (value) {
        if (originalCallback) {
            originalCallback.apply(this, arguments);
        }
        
        if (value === "custom") {
            // Zero out sliders ONLY if selected manually by the user (not programmatically)
            if (!isProgrammaticCustom && !isUpdating) {
                isUpdating = true;
                currentPresetValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (let i = 0; i < 12; i++) {
                    const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
                    if (knobWidget) {
                        knobWidget.value = 0.0;
                        if (knobWidget.callback) {
                            knobWidget.callback(0.0);
                        }
                    }
                }
                isUpdating = false;
                if (node.graph) {
                    node.setDirtyCanvas(true, true);
                }
            }
            return;
        }

        if (!isUpdating) {
            isUpdating = true;
            fetch('/krea2_tuner/presets')
                .then(r => r.json())
                .then(presets => {
                    const vals = presets[value];
                    if (vals && vals.length === 12) {
                        currentPresetValues = [...vals]; // update tracked preset values
                        for (let i = 0; i < 12; i++) {
                            const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
                            if (knobWidget) {
                                knobWidget.value = vals[i];
                                if (knobWidget.callback) {
                                    knobWidget.callback(vals[i]);
                                }
                            }
                        }
                        if (node.graph) {
                            node.setDirtyCanvas(true, true); // force instant redraw of the sliders
                        }
                    }
                    isUpdating = false;
                })
                .catch(err => {
                    console.error("[Krea2Tuner] Failed to load preset values:", err);
                    isUpdating = false;
                });
        }
    };

    // Override manual knob adjustment callbacks to switch preset dropdown to "custom"
    for (let i = 0; i < 12; i++) {
        const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
        if (knobWidget) {
            const originalKnobCallback = knobWidget.callback;
            knobWidget.callback = function (val) {
                if (originalKnobCallback) {
                    originalKnobCallback.apply(this, arguments);
                }
                if (!isUpdating) {
                    // Check if value is genuinely different from the loaded preset value
                    // to prevent spurious mouseover triggers from resetting the active preset
                    const presetVal = currentPresetValues[i];
                    if (Math.abs(val - presetVal) > 1e-6) {
                        if (presetWidget.value !== "custom") {
                            isProgrammaticCustom = true; // prevent dynamic zero-out
                            presetWidget.value = "custom";
                            isProgrammaticCustom = false;
                        }
                        // If we modified values manually, the current preset state is no longer tracked
                        currentPresetValues[i] = val;
                    }
                }
            };
        }
    }
}

app.registerExtension({
    name: "Krea2Tuner.Extension",
    async setup() {
        // Apply initialization to all pre-existing nodes when graph setup completes
        setTimeout(() => {
            try {
                const nodes = app.graph.findNodesByType("Krea2ProjectorTuner");
                if (nodes) {
                    for (const node of nodes) {
                        initNode(node);
                    }
                }
            } catch (e) {
                console.error("[Krea2Tuner] Error initializing pre-existing nodes:", e);
            }
        }, 500);
    },
    nodeCreated(node) {
        initNode(node);
    }
});
