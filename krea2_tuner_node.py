"""
© 2026 blacksnowskill (BSS). All rights reserved.
Developed by: blacksnowskill (BSS)

krea2_tuner_node.py
Custom node for Krea2 Projector Tuning in ComfyUI.
Patches the txtfusion.projector layer in-memory using sliders or presets.
"""

import logging
import torch

logger = logging.getLogger("KREA2_TUNER")

# Preset difference vectors (12 dimensions corresponding to CLIP layers)
# Calculated directly from the tuner.py math
PRESETS = {
    "custom": None,
    "Strongx3_wl7": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -0.700000,           # Knob 7 (minor decensor)
        -0.511719 * 2.0,     # Knob 8 (3x multiplier = diff is 2x)
        -0.890625 * 2.0,     # Knob 9 (3x multiplier = diff is 2x)
        -0.609375 * 2.0,     # Knob 10 (3x multiplier = diff is 2x)
        0.0
    ],
    "Strong 2.5": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -0.511719 * 1.5,     # Knob 8
        -0.890625 * 1.5,     # Knob 9
        -0.609375 * 1.5,     # Knob 10
        0.0
    ],
    "Anatomy Opt": [
        0.0, 0.0,
        0.371094 * 0.25,     # Knob 2
        0.503906 * 0.25,     # Knob 3
        0.707031 * 0.25,     # Knob 4
        0.394531 * 0.25,     # Knob 5
        0.398438 * 0.25,     # Knob 6
        -1.437500 * 0.3,     # Knob 7
        -0.511719 * 0.3,     # Knob 8
        -0.890625 * 0.3,     # Knob 9
        -0.609375 * 0.3,     # Knob 10
        0.0
    ],
    "Clean Bypass": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -1.437500 * 0.6,     # Knob 7
        -0.511719 * 0.6,     # Knob 8
        -0.890625 * 0.6,     # Knob 9
        -0.609375 * 0.6,     # Knob 10
        0.0
    ]
}


class Krea2ProjectorTuner:
    """
    In-memory Krea2 Projector Tuner by blacksnowskill (BSS).
    Patches the txtfusion.projector layers directly in memory using sliders or presets.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL",),
                "preset": (list(PRESETS.keys()), {"default": "Strongx3_wl7"}),
                "knob_0": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_1": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_2": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_3": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_4": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_5": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_6": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_7": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_8": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_9": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_10": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
                "knob_11": ("FLOAT", {"default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("model",)
    FUNCTION = "tune"
    CATEGORY = "BSS/Krea2"

    def tune(
        self,
        model,
        preset,
        knob_0, knob_1, knob_2, knob_3, knob_4, knob_5,
        knob_6, knob_7, knob_8, knob_9, knob_10, knob_11
    ):
        # 1. Clone the model patcher to avoid mutating original globally
        m = model.clone()
        
        # 2. Select values from preset or sliders
        if preset != "custom":
            diff_list = PRESETS[preset]
            logger.info(f"[Krea2Tuner] Applying preset: {preset}")
        else:
            diff_list = [
                knob_0, knob_1, knob_2, knob_3, knob_4, knob_5,
                knob_6, knob_7, knob_8, knob_9, knob_10, knob_11
            ]
            logger.info(f"[Krea2Tuner] Applying custom manual slider values: {diff_list}")

        # 3. Locate the parameter key inside the model's state dict
        # ComfyUI ModelPatcher expects the key exactly as it appears in m.model.state_dict()
        sd = m.model.state_dict()
        
        target_key = None
        for k in sd.keys():
            if "txtfusion.projector" in k:
                target_key = k
                break
                
        if target_key is None:
            logger.error("[Krea2Tuner] Could not find any parameter matching 'txtfusion.projector' in this model's state dict!")
            return (m,)

        # Fetch original parameter shape and device/dtype
        param = sd[target_key]
        device = param.device
        dtype = param.dtype
        shape = param.shape

        # 4. Construct the difference tensor matching the target parameter shape
        diff_tensor = torch.tensor(diff_list, device=device, dtype=dtype)
        
        # Reshape to match the parameter's shape (usually [1, 12] or [12])
        try:
            diff_tensor = diff_tensor.view(shape)
        except Exception as e:
            logger.warning(f"[Krea2Tuner] Reshape failed: {e}. Trying to match shape directly.")
            diff_tensor = diff_tensor.reshape(shape)

        # 5. Inject the patch into ComfyUI's model patcher
        # Format: {key: (diff_tensor,)}
        m.add_patches({target_key: (diff_tensor,)}, 1.0, 1.0)
        logger.info(f"[Krea2Tuner] In-memory patch successfully applied to '{target_key}'")

        return (m,)
