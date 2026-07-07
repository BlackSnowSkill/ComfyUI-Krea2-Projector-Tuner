# ComfyUI-Krea2-Projector-Tuner (BSS)

🇺🇸 English | 🇷🇺 [Читать на русском языке](README_RU.md)

**ComfyUI-Krea2-Projector-Tuner (BSS)** is a specialized custom node package for ComfyUI that allows you to patch and tune the `txtfusion.projector` layers of **Krea2** models in-memory. It provides real-time slider controls and highly optimized presets (including the ultimate **Strongx3_wl7** configuration) to control filter bypass (decensoring), style, and prompt-following without writing permanent files to disk.

> [!IMPORTANT]
> **Author and Developer:** **blacksnowskill (BSS)**  
> **© 2026 blacksnowskill (BSS). All rights reserved.**  
> This project is protected by copyright. Any unauthorized copying, modification without attribution, or representing this code as your own product is strictly prohibited.

---

## ⚡ Key Features (v2.0.0)

* **In-Memory Dynamic Patching:** Uses ComfyUI's native weight patching system. Modifies model weights temporarily in RAM/VRAM during generation, ensuring 100% safety with no risk of model file corruption on your storage.
* **Dynamic Presets System in JSON:** Built-in presets are automatically written as separate `.json` files in the `presets/` folder on the first start (`strongx3_wl7.json`, `strong_2.5.json`, `clean_bypass.json`). You can customize, rename, share, or delete them directly in your file explorer.
* **Interactive On-Node Buttons:** Save, delete, and browse your custom weights configurations directly from the node interface (dynamic UI updates without reloading).
* **Automatic Web UI Sync:** Mapped values update dynamically on your canvas sliders when selecting a preset. Dragging a slider automatically switches the preset dropdown back to `custom`.
* **LoRA-Style Step Increments (0.01):** Smooth manual slider dragging with a standard `0.01` step size (identical to LoRA Loader), while fully preserving high-precision floating point inputs (up to 6 decimals) when typed or loaded from presets.

---

## 📥 Installation

### Method 1: Via ComfyUI Manager (Recommended)
1. Open ComfyUI and click on the **Manager** button.
2. Click **Install Custom Nodes**.
3. Search for **`Krea2 Projector Tuner`**.
4. Click **Install**, wait for the process to complete, and restart ComfyUI.

### Method 2: Via Git URL (If not indexed yet)
1. Open ComfyUI Manager -> click **Install via Git URL**.
2. Paste this repository URL: `https://github.com/BlackSnowSkill/ComfyUI-Krea2-Projector-Tuner`
3. Click **Install** and restart ComfyUI.

### Method 3: Manual Installation (Git Clone)
1. Open your terminal in the `ComfyUI/custom_nodes` folder.
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
  * **`preset`:** Select from the loaded JSON files in `presets/` folder, or `custom` (enables manual sliders).
  * **`multiplier`:** Overall weight multiplier (-10.0 to +10.0) with `0.01` step increments (default is `1.0`). Multiplies all knob values, making it quick and easy to scale the total patch strength (e.g., 3x or 5x).
  * **`knob_0` to `knob_11`:** Fine-tune multipliers (-5.0 to +5.0) with `0.01` step increments.

---

## 🎛️ On-Node Action Buttons

* **`Save Preset`:** Prompt-saves your current manual slider values as a new JSON file in `presets/` folder. The dropdown list refreshes instantly on the screen.
* **`Delete Selected Preset`:** Deletes the currently selected preset file from disk and switches the dropdown back to `custom`.
* **`Open Presets Folder`:** Instantly opens the presets directory in your OS file explorer.

---

## 📋 Understanding the Sliders (Knobs)

The 12 sliders correspond to the hidden states of the CLIP text encoder, processing different levels of representation:
* **Knobs 0 to 1 (Early Layers):** Control syntax, text tokenization, and direct prompt-following.
* **Knobs 2 to 6 (Mid Layers):** Control spatial geometry, objects, composition, and human proportions. Adjusting these acts as an anatomy stabilizer.
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
