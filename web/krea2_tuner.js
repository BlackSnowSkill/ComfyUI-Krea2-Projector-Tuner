import { app } from "../../scripts/app.js";

console.log("[Krea2Tuner] Loading frontend extension with Save Preset button...");

function initNode(node) {
    if (node.comfyClass !== "Krea2ProjectorTuner") return;
    
    const presetWidget = node.widgets.find(w => w.name === "preset");
    if (!presetWidget) return;

    let isUpdating = false;

    // Configure all knob widgets to have step 0.01 (like LoRA Loader)
    // but keep round at 0.000001 to prevent rounding of high-precision inputs.
    for (let i = 0; i < 12; i++) {
        const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
        if (knobWidget) {
            if (!knobWidget.options) knobWidget.options = {};
            knobWidget.options.step = 0.01;
            knobWidget.options.round = 0.000001; 
            // Clear custom precision and format to let ComfyUI render it standard
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
        node.setSize(node.size);
    }

    // Override preset selection callback
    const originalCallback = presetWidget.callback;
    presetWidget.callback = function (value) {
        if (originalCallback) {
            originalCallback.apply(this, arguments);
        }
        
        if (value !== "custom" && !isUpdating) {
            isUpdating = true;
            fetch('/krea2_tuner/presets')
                .then(r => r.json())
                .then(presets => {
                    const vals = presets[value];
                    if (vals && vals.length === 12) {
                        for (let i = 0; i < 12; i++) {
                            const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
                            if (knobWidget) {
                                knobWidget.value = vals[i];
                                if (knobWidget.callback) {
                                    knobWidget.callback(vals[i]);
                                }
                            }
                        }
                        node.setSize(node.size);
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
                if (!isUpdating && presetWidget.value !== "custom") {
                    presetWidget.value = "custom";
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
