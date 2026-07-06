# AstraMix AI v0.1 - Showcase Instructions

This folder contains the public research/portfolio showcase files for **AstraMix AI**, built by **Nikolay Khachatryan**.

---

## Rich UI Mockup Fallbacks
By default, if the screenshot image files are missing, the website showcase pages **automatically display high-quality visual mockup previews** mimicking real application states (mix parameter sliders, strength predictions, SLSQP solver results, and model card validation details).

No broken image icons, gray empty placeholders, or "coming soon" texts are shown. The pages look completely finished and ready for visitors out of the box.

---

## Overriding with Real Screenshots
To replace the mockups with actual screenshot images of your running application, place your files in the following folders:

### 1. For the Next.js Web App:
Place your images in:  
📁 `frontend/public/images/`

### 2. For the Standalone HTML Version:
Place your images in:  
📁 `showcase/assets/`

### Required Image Filenames:
* 📊 `astramix-dashboard.png` — Dash input controls.
* 📈 `astramix-prediction.png` — Compressive strength prediction.
* ⚙️ `astramix-optimization.png` — Constrained optimizer output.
* 📄 `astramix-report.png` — Model card validation report.

*Note: Once these images are added, they will automatically override the mockup fallbacks.*

---

## Updating Public Project Links (GitHub / Demo)
Once you upload your code to GitHub or record the demo video, update the links in the following places:

### 1. In Next.js:
Edit the `links` constant at the top of:  
📄 [frontend/src/app/projects/astramix/page.tsx](frontend/src/app/projects/astramix/page.tsx)
```typescript
const links = {
  github: "https://github.com/yourusername/astramix-ai",
  demo: "https://youtube.com/your-demo-link",
  report: "/docs/PROJECT_REPORT_v0_1.md"
};
```

### 2. In Standalone HTML:
Update the button anchors (`href` targets) inside:  
📄 [showcase/astramix-showcase.html](showcase/astramix-showcase.html)

---

## How to Run & Open Showcases

### Option A — Open standalone HTML:
1. Open the folder `showcase/`.
2. Double-click `showcase/astramix-showcase.html` to load it in any browser. It runs natively offline.

### Option B — Run Next.js locally:
1. Open your terminal in the `frontend/` directory.
2. Run:
   ```bash
   npm install
   npm run dev
   ```
3. Open **[http://localhost:3000/projects/astramix](http://localhost:3000/projects/astramix)**.
4. If Next.js starts on another port (for example, if port 3000 is occupied), open **[http://localhost:3001/projects/astramix](http://localhost:3001/projects/astramix)**.
