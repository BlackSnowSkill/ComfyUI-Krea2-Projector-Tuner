# ComfyUI-Krea2-Projector-Tuner (BSS)

🇺🇸 English | 🇷🇺 [Читать на русском языке](README_RU.md)

**ComfyUI-Krea2-Projector-Tuner (BSS)** is a specialized custom node for ComfyUI that allows you to patch and tune the `txtfusion.projector` layers of **Krea2** models in-memory. It provides real-time sliders and highly optimized presets (including the ultimate **Strongx3_wl7** configuration) to control filter bypass (decensoring), anatomy quality, and prompt-following without writing permanent files to disk.

> [!IMPORTANT]
> **Author and Developer:** **blacksnowskill (BSS)**  
> **© 2026 blacksnowskill (BSS). All rights reserved.**  
> This project is protected by copyright. Any unauthorized copying, modification without attribution, or representing this code as your own product is strictly prohibited.

---

## ⚡ Key Features

* **In-Memory Dynamic Patching:** Uses ComfyUI's native weight patching system. Modifies model weights temporarily in RAM during generation, ensuring 100% safety with no risk of model file corruption on your storage.
* **Premium Built-In Presets:**
  * **`Strongx3_wl7` (Default):** The most advanced bypass patch. Applies a 3.0x multiplier on safety layers 8–10 and a targeted `-0.7` adjustment on layer 7 to lock down the last safety peak, delivering the cleanest possible bypass.
  * **`Strong 2.5`:** The standard, popular decensoring patch.
  * **`Anatomy Opt`:** Designed to fix anatomy and structural defects by boosting middle layers (proportions/anatomy) and keeping safety layers suppressed.
  * **`Clean Bypass`:** Standard clean safety bypass.
* **12 Multi-Level Sliders (`knob_0` to `knob_11`):** Direct mapping to the 12 layers of the CLIP text encoder, acting as individual semantic controllers (style, details, layout, and censorship).

---

## 📥 Installation

### Method 1: Via ComfyUI Manager (Recommended)
1. Open ComfyUI and click on the **Manager** button.
2. Click **Install via Git URL**.
3. Paste this repository URL: `https://github.com/BlackSnowSkill/ComfyUI-Krea2-Projector-Tuner`
4. Click **Install**, wait for the process to complete, and restart ComfyUI.

### Method 2: Manual Installation (Git Clone)
1. Open your terminal and navigate to your ComfyUI custom nodes directory:
   ```bash
   cd ComfyUI/custom_nodes
   ```
2. Clone this repository:
   ```bash
   git clone https://github.com/BlackSnowSkill/ComfyUI-Krea2-Projector-Tuner.git
   ```
3. Restart ComfyUI.

---

## 🧩 Node Specifications

### 🎛️ Krea2 Projector Tuner (BSS) (class `Krea2ProjectorTuner`)
Registered under the `BSS/Krea2` category.

* **Inputs:**
  * **`model`:** The loaded Krea2 model.
  * **`preset`:** Select from `Strongx3_wl7`, `Strong 2.5`, `Anatomy Opt`, `Clean Bypass`, or `custom` (enables manual sliders).
  * **`knob_0` to `knob_11`:** Fine-tune multipliers (-5.0 to +5.0) for each of the 12 layers of the CLIP projector.

---

## 📋 Understanding the Sliders (Knobs)

The 12 sliders correspond to the hidden states of the CLIP text encoder, processing different levels of representation:
* **Knobs 0 to 1 (Early Layers):** Control syntax, text tokenization, and direct prompt-following.
* **Knobs 2 to 6 (Mid Layers):** Control spatial geometry, objects, composition, and human proportions (anatomy). Adjusting these acts as an **anatomy slider** to fix structural glitches.
* **Knobs 7 to 10 (Deep Layers):** Control abstract themes, styles, and negative alignment (safety filter / censorship). Suppressing these (moving negative values further down) bypasses the censorship.
* **Knob 11 (Final Layer):** Represents the output layer of the CLIP text encoder.

---

## 📋 Recommended Workflow

Connect the node directly in the model output path:
```
[ Loader (Model) ] ──> [ Krea2 Projector Tuner (BSS) ] (Preset: Strongx3_wl7) ──> [ KSampler (model) ]
```

---

## ☕ Support and Development

If you like my optimization tools and want to support the development of new projects, nodes, and models, you can support me here:
* **Boosty:** [Support & Exclusive Releases](https://boosty.to/blacksnowskill)

---

## 📄 License & Terms of Use

© 2026 blacksnowskill (BSS). All rights reserved.  
Any unauthorized mirroring, redistribution, merging with other projects, or re-uploading without explicit written permission from the author is strictly prohibited.
