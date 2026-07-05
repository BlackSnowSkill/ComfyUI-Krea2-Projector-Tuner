"""
© 2026 blacksnowskill (BSS). All rights reserved.
Developed by: blacksnowskill (BSS)

krea2_tuner_node.py
Custom node for Krea2 Projector Tuning in ComfyUI.
Patches the txtfusion.projector layer in-memory using sliders or presets.
Includes community presets JSON folder scanning and high-precision controls.
"""

import os
import json
import logging
import torch
from server import PromptServer
from aiohttp import web

logger = logging.getLogger("KREA2_TUNER")

# Path to community presets folder
presets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "presets")
os.makedirs(presets_dir, exist_ok=True)

# Create template JSON in presets folder if it is empty
template_path = os.path.join(presets_dir, "template_preset.json.example")
if not os.path.exists(template_path):
    try:
        with open(template_path, "w", encoding="utf-8") as f:
            json.dump({
                "name": "Community_Bypass_Example",
                "knobs": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.7, -1.023438, -1.78125, -1.21875, 0.0]
            }, f, indent=4)
    except Exception as e:
        logger.error(f"[Krea2Tuner] Failed to create template preset: {e}")

# Built-in presets
BUILTIN_PRESETS = {
    "custom": None
}

DEFAULT_PRESETS = {
    "Strongx3_wl7": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -0.700000,           # Knob 7 (minor decensor)
        -1.023438,           # Knob 8 (3x multiplier = diff is 2x)
        -1.781250,           # Knob 9 (3x multiplier = diff is 2x)
        -1.218750,           # Knob 10 (3x multiplier = diff is 2x)
        0.0
    ],
    "Strong 2.5": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -0.767579,           # Knob 8
        -1.335938,           # Knob 9
        -0.914063,           # Knob 10
        0.0
    ],
    "Clean Bypass": [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        -0.862500,           # Knob 7
        -0.307031,           # Knob 8
        -0.534375,           # Knob 9
        -0.365625,           # Knob 10
        0.0
    ]
}

# Auto-initialize presets folder with default preset files if not initialized yet
initialized_marker = os.path.join(presets_dir, ".initialized")
if not os.path.exists(initialized_marker):
    try:
        # Create default preset files
        for name, knobs in DEFAULT_PRESETS.items():
            filename = name.lower().replace(" ", "_") + ".json"
            preset_path = os.path.join(presets_dir, filename)
            with open(preset_path, "w", encoding="utf-8") as f:
                json.dump({
                    "name": name,
                    "knobs": knobs
                }, f, indent=4)
        
        # Create initialized marker
        with open(initialized_marker, "w", encoding="utf-8") as f:
            f.write("initialized")
        logger.info("[Krea2Tuner] Successfully initialized presets folder with default files.")
    except Exception as e:
        logger.error(f"[Krea2Tuner] Failed to initialize default presets: {e}")

def load_all_presets():
    """Loads built-in and community presets from presets/ directory."""
    loaded = dict(BUILTIN_PRESETS)
    if os.path.exists(presets_dir):
        for f in os.listdir(presets_dir):
            if f.endswith(".json"):
                path = os.path.join(presets_dir, f)
                try:
                    with open(path, "r", encoding="utf-8") as file:
                        data = json.load(file)
                        if isinstance(data, dict) and "name" in data and "knobs" in data:
                            name = data["name"]
                            knobs = data["knobs"]
                            if isinstance(knobs, list) and len(knobs) == 12:
                                loaded[name] = [float(x) for x in knobs]
                                logger.info(f"[Krea2Tuner] Loaded community preset: {name}")
                except Exception as e:
                    logger.error(f"[Krea2Tuner] Failed to load preset file {f}: {e}")
    return loaded

# Register API Routes for frontend preset value retrieval and saving
if hasattr(PromptServer, "instance") and PromptServer.instance is not None:
    @PromptServer.instance.routes.get("/krea2_tuner/presets")
    async def get_presets_api(request):
        current_presets = load_all_presets()
        serializable = {}
        for k, v in current_presets.items():
            serializable[k] = v if v is not None else [0.0] * 12
        return web.json_response(serializable)

    @PromptServer.instance.routes.post("/krea2_tuner/save_preset")
    async def save_preset_api(request):
        try:
            data = await request.json()
            name = data.get("name")
            knobs = data.get("knobs")
            
            if not name or not isinstance(knobs, list) or len(knobs) != 12:
                return web.json_response({"success": False, "error": "Invalid data"}, status=400)
                
            safe_name = "".join([c for c in name if c.isalnum() or c in " _-"]).strip()
            if not safe_name:
                return web.json_response({"success": False, "error": "Invalid name"}, status=400)
                
            filename = safe_name.lower().replace(" ", "_") + ".json"
            path = os.path.join(presets_dir, filename)
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "name": name,
                    "knobs": [float(x) for x in knobs]
                }, f, indent=4)
                
            logger.info(f"[Krea2Tuner] Saved preset: {name} to {path}")
            return web.json_response({"success": True, "name": name})
        except Exception as e:
            logger.error(f"[Krea2Tuner] Error saving preset: {e}")
            return web.json_response({"success": False, "error": str(e)}, status=500)


class Krea2ProjectorTuner:
    """
    In-memory Krea2 Projector Tuner by blacksnowskill (BSS).
    Patches the txtfusion.projector layers directly in memory using sliders or presets.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        # Dynamically fetch presets list at startup
        presets_dict = load_all_presets()
        preset_list = list(presets_dict.keys())
        default_preset = "Strongx3_wl7" if "Strongx3_wl7" in preset_list else "custom"
        return {
            "required": {
                "model": ("MODEL",),
                "preset": (preset_list, {"default": default_preset}),
                # Precision step set to 0.01 as requested (users can still type high precision values)
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
        
        # 2. Reload presets dynamically in case community ones changed
        presets_dict = load_all_presets()

        # 3. Select values from preset or sliders
        if preset != "custom":
            diff_list = presets_dict.get(preset, DEFAULT_PRESETS["Strongx3_wl7"])
            logger.info(f"[Krea2Tuner] Applying preset: {preset}")
        else:
            diff_list = [
                knob_0, knob_1, knob_2, knob_3, knob_4, knob_5,
                knob_6, knob_7, knob_8, knob_9, knob_10, knob_11
            ]
            logger.info(f"[Krea2Tuner] Applying custom manual slider values: {diff_list}")

        # 4. Locate the parameter key inside the model's state dict
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

        # 5. Construct the difference tensor matching the target parameter shape
        diff_tensor = torch.tensor(diff_list, device=device, dtype=dtype)
        
        # Reshape to match the parameter's shape (usually [1, 12] or [12])
        try:
            diff_tensor = diff_tensor.view(shape)
        except Exception as e:
            logger.warning(f"[Krea2Tuner] Reshape failed: {e}. Trying to match shape directly.")
            diff_tensor = diff_tensor.reshape(shape)

        # 6. Inject the patch into ComfyUI's model patcher
        m.add_patches({target_key: (diff_tensor,)}, 1.0, 1.0)
        logger.info(f"[Krea2Tuner] In-memory patch successfully applied to '{target_key}'")

        return (m,)
