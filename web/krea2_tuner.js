import { app } from "../../scripts/app.js";

console.log("[Krea2Tuner] Loading frontend extension with dynamic precision...");

function updatePrecision(widget) {
    if (widget && widget.value !== undefined && widget.options) {
        const val = widget.value;
        const parts = val.toString().split('.');
        if (parts.length < 2) {
            widget.options.precision = 1;
        } else {
            const decs = parts[1].replace(/0+$/, '');
            widget.options.precision = Math.min(6, Math.max(1, decs.length));
        }
    }
}

function initNode(node) {
    if (node.comfyClass !== "Krea2ProjectorTuner") return;
    
    const presetWidget = node.widgets.find(w => w.name === "preset");
    if (!presetWidget) return;

    let isUpdating = false;

    // Set initial precision dynamically for all knobs
    for (let i = 0; i < 12; i++) {
        const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
        if (knobWidget) {
            if (!knobWidget.options) knobWidget.options = {};
            // Set step to 0.1 for dragging as requested
            knobWidget.options.step = 0.1;
            knobWidget.options.round = 0.000001; // Allow high precision manual input
            updatePrecision(knobWidget);

            // Wrap format as additional fallback
            knobWidget.options.format = function(value) {
                if (value === undefined || value === null || isNaN(value)) return "";
                return Number(parseFloat(value.toFixed(6))).toString();
            };
        }
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
                                updatePrecision(knobWidget);
                                if (knobWidget.callback) {
                                    knobWidget.callback(vals[i]);
                                }
                            }
                        }
                        node.setSize(node.size); // Redraw node
                    }
                    isUpdating = false;
                })
                .catch(err => {
                    console.error("[Krea2Tuner] Failed to load preset values:", err);
                    isUpdating = false;
                });
        }
    };

    // Override manual knob adjustment callbacks to adjust precision dynamically
    for (let i = 0; i < 12; i++) {
        const knobWidget = node.widgets.find(w => w.name === `knob_${i}`);
        if (knobWidget) {
            const originalKnobCallback = knobWidget.callback;
            knobWidget.callback = function (val) {
                if (originalKnobCallback) {
                    originalKnobCallback.apply(this, arguments);
                }
                updatePrecision(knobWidget);
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
