"""
© 2026 blacksnowskill (BSS). All rights reserved.
Developed by: blacksnowskill (BSS)

KREA2_TUNER — ComfyUI custom node package
In-memory tuning of txtfusion.projector layers for Krea2 models.
"""

from .krea2_tuner_node import Krea2ProjectorTuner

NODE_CLASS_MAPPINGS = {
    "Krea2ProjectorTuner": Krea2ProjectorTuner
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Krea2ProjectorTuner": "Krea2 Projector Tuner (BSS)"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
