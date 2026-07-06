# AstraMix AI v0.1 Demo Script (2–3 Minutes)

This script outlines a professional 3-minute demo path for university projects, team reviews, or client presentations.

---

## 1. Introduction (0:00 - 0:45)
**Visual**: Open the homepage of AstraMix AI (`http://localhost:3000`).
- **Narrative**: "Welcome to AstraMix AI. Concrete is the most consumed material on Earth after water, and its production is responsible for roughly 8% of global CO₂ emissions. Designers face a complex three-way trade-off: they must achieve a target structural compressive strength, minimize greenhouse gas emissions, and control raw material costs. AstraMix AI v0.1 solves this by combining machine learning strength prediction with multi-objective optimization."

---

## 2. Running a Mix Prediction (0:45 - 1:30)
**Action**: Click the **Predict Strength** tab. Leave the default values or adjust slightly.
- **Narrative**: "Let's test an initial concrete recipe. We've populated standard material values: cement, slag, fly ash, water, aggregates, and superplasticizer for a 28-day curing cycle. Clicking **Run prediction** sends this mix to our FastAPI backend.
- "We instantly receive:
  1. **Predicted Compressive Strength**: Evaluated using a trained XGBoost regressor.
  2. **Estimated Validation Error**: We show a scientific trust layer with RMSE (4.62 MPa) and MAE (3.03 MPa) so engineers understand the model's accuracy bounds.
  3. **Carbon and Cost Footprints**: Total CO₂ emissions and material costs computed from physical base factor datasets."

---

## 3. Training-Envelope Warnings (1:30 - 2:00)
**Action**: Change the **Cement** input to `600 kg/m³` (an out-of-envelope value) and click **Run prediction**.
- **Visual**: Point to the orange warning banner that appears.
- **Narrative**: "Notice this warning banner. Our scientific trust layer checks inputs against the training boundary. Because cement is 600 kg/m³—which exceeds our model's training range limit of 540 kg/m³—AstraMix alerts the engineer that tree-based predictions cannot extrapolate and are less reliable. The request is processed, but warnings are flagged explicitly."

---

## 4. Multi-Objective Optimization (2:00 - 2:45)
**Action**: Click the **Optimize Mix** tab. Enter a target strength of `40 MPa`, set max W/C ratio to `0.5`, and click **Optimize**.
- **Narrative**: "Now let's find the best mix using the optimizer. The solver uses a bounded SLSQP (Sequential Least Squares Programming) algorithm to search for candidate recipe mixes that meet our target strength while minimizing weighted cost and CO₂.
- "The optimizer outputs an optimized mix recipe with the resulting objective score and warnings highlighting solver characteristics:
  - SLSQP non-smooth tree-model warning.
  - Weighted-sum caveated scaling warning."

---

## 5. Summary & Disclaimers (2:45 - 3:00)
- **Narrative**: "AstraMix v0.1 bridges the gap between machine learning capabilities and engineering trust. As a final note, all predictions serve as preliminary design suggestions. Concrete is highly sensitive to material chemistry, curing conditions, and humidity. These candidate recipes **must** be verified by physical cylinder trial breaks in a certified laboratory before field placement. Thank you."
