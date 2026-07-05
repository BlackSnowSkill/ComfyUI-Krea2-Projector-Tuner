import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Krea2Tuner.Extension",
    nodeCreated(node) {
        if (node.comfyClass === "Krea2ProjectorTuner") {
            const presetWidget = node.widgets.find(w => w.name === "preset");
            
            if (presetWidget) {
                // Keep track of whether we are programmatically updating widgets to avoid loops
                let isUpdating = false;

                // Force dynamic high display precision (max 6 decimals, no trailing zeros)
                // for all knob widgets, while keeping the step set in Python (0.1) for dragging.
                for (let i = 0; i < 12; i++) {
                    const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
                    if (knobWidget) {
                        if (!knobWidget.options) knobWidget.options = {};
                        knobWidget.options.precision = 6;
                        knobWidget.options.format = function(value) {
                            if (value === undefined || value === null || isNaN(value)) return "";
                            // Round to max 6 decimals and convert to string to strip trailing zeros
                            return Number(parseFloat(value.toFixed(6))).toString();
                        };
                    }
                }

                const originalCallback = presetWidget.callback;
                presetWidget.callback = function (value) {
                    if (originalCallback) {
                        originalCallback.apply(this, arguments);
                    }
                    
                    if (value !== "custom" && !isUpdating) {
                        isUpdating = true;
                        // Fetch the latest presets dynamically from the server
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
                                    node.setSize(node.size); // Redraw
                                }
                                isUpdating = false;
                            })
                            .catch(err => {
                                console.error("[Krea2Tuner] Failed to load preset values:", err);
                                isUpdating = false;
                            });
                    }
                };

                // Watch all knob widgets to switch preset to "custom" on manual adjust
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
        }
    }
});
