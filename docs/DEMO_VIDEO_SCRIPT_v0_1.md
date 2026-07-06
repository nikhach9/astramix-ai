# Demo Video Script — AstraMix AI v0.1

A professional, 2–3 minute video presentation script formatted in a clean dual-column layout (Visual + Audio) suitable for project submissions and LinkedIn showcases.

- **Presenter Style**: Confident, technical student-founder.
- **Visual Context**: Screen capture of Next.js frontend browser window running locally at `http://localhost:3000`.

---

| Visual | Audio / Narration |
| :--- | :--- |
| **0:00 - 0:30**<br>Show AstraMix AI homepage. Scroll through the feature overview card deck. | *"Hello everyone. Today I'm excited to present AstraMix AI, an intelligent design platform targeting sustainable concrete formulation. Concrete production accounts for roughly eight percent of global carbon dioxide emissions. Civil engineers are constantly struggling to design mix recipes that satisfy target structural strengths while reducing environmental impacts and raw material costs. AstraMix AI v0.1 bridges this gap by merging machine learning prediction with multi-objective constraint optimization."* |
| **0:30 - 1:00**<br>Click **Predict Strength** tab. Leave the default mix values unchanged and click **Run prediction**. | *"Let's see it in action. In the Predict Strength interface, we can enter concrete mix proportions. When I submit the mix, our FastAPI backend evaluates the ingredients. In real-time, the app returns a predicted compressive strength of fifty-two point eight MPa alongside total carbon and cost footprints. We've built this prediction on a real XGBoost model trained on the UCI Concrete Strength dataset."* |
| **1:00 - 1:30**<br>Point cursor at the **Validation Error Estimate** block under the strength card. Then, increase **Cement** to `600 kg/m³` and submit. | *"To bridge the gap between AI outputs and engineering safety, we've integrated a scientific trust layer. We display validation errors—our RMSE is four point six MPa—so designers understand the accuracy bounds. Additionally, if I input an out-of-envelope value like six hundred kilograms of cement, the trust layer flags an explicit warning. Because tree-based models cannot extrapolate outside their training limits, this warning alerts the engineer that the prediction is less reliable."* |
| **1:30 - 2:15**<br>Click **Optimize Mix** tab. Enter a target strength of `40 MPa`, set max W/C ratio to `0.5`, and click **Optimize**. Point to the warnings list. | *"Now let's find the most sustainable mix under constraints. Moving to the Optimize Mix tab, I set a target strength of forty MPa and a maximum water-to-cement ratio of zero point five. The backend executes a Sequential Least Squares Programming solver. It returns an optimized recipe, displaying the objective value and trade-off caveats—highlighting the non-smooth boundaries of tree-based models."* |
| **2:15 - 2:30**<br>Return to homepage. Highlight the engineering disclaimer at the bottom. | *"As a final safety note: all predictions serve as preliminary design candidates and must be validated through physical cylinder breaks in a certified laboratory before structural use. AstraMix AI v0.1 represents the first step toward transparent, carbon-aware material design. Thank you!"* |
