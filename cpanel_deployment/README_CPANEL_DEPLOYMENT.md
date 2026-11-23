> Historical deployment notes. Use [the current packaging instructions](../README_CPANEL_DEPLOYMENT.md) for the active model and freshly built archives.

# AstraMix AI — cPanel Deployment & Fix Guide

## 1. Problem Diagnosis & Root Cause

### Why was `/_next/static/css/7d0aca516d1e6650.css` empty on cPanel?
1. **Windows Path Separators in ZIP Entries**:
   When files are archived on Windows using default archiving tools (such as PowerShell `Compress-Archive`), directory paths are stored with Windows backslashes (`_next\static\css\7d0aca516d1e6650.css`). When unzipped on Linux/cPanel File Manager, Linux does not recognize backslashes as directory separators. Instead, it creates a single literal file named `_next\static\css\7d0aca516d1e6650.css` in the root directory or fails to extract into the folder, leaving the actual `/_next/static/css/` directory empty.
2. **Missing Prerendered Static Export**:
   Next.js was previously configured for Node server mode rather than a dedicated static export. We enabled `output: 'export'` with `images: { unoptimized: true }` so that Next.js produces standalone HTML, CSS, and JS files.

---

## 2. Verification of Build Output

The frontend build has been executed with `output: 'export'`.
Every referenced CSS and JavaScript asset was verified against all 13 HTML pages:

- **Total HTML pages checked**: 13 (`index.html`, `mix-lab.html`, `predict.html`, `optimize.html`, `materials-market.html`, `about.html`, `beton-kayak.html`, `compare.html`, `report.html`, `404.html`, `mix-lab/optimize.html`, `mix-lab/predict.html`, `projects/astramix.html`)
- **Total asset references found**: 154
- **Unique static assets**: 19
- **Missing assets**: **0** (100% verified present on disk)
- **CSS Hash**: `_next/static/css/7d0aca516d1e6650.css` (verified authentic build hash)
- **POSIX Zip Compliance**: 100% forward slashes (`/`) in all archive entries.
- **Privacy & Security**: Zero Python files, zero model binaries, zero database files, and zero `.env` secrets are present in the frontend package.

---

## 3. The Two Clean Deployment Packages

Old cluttered archives (`Astramix AI.zip`, `backend.zip`, duplicates) have been completely removed.
You now have two clean, separated ZIP files in the repository root:

| Archive Name | Destination on cPanel | Size | Description |
| :--- | :--- | :--- | :--- |
| **`astramix_frontend_public_html.zip`** | `/home/username/public_html/` | ~412 KB | Contains `index.html` at root, `_next/static/css/7d0aca516d1e6650.css`, all JS chunks, pre-rendered pages, `.htaccess`, `api/index.php`, and `preflight.php`. |
| **`astramix_backend_php.zip`** | `/home/username/` (outside `public_html`) | ~6.8 MB | Contains the private pure PHP 8.2+ backend (`astramix_php/`) with native XGBoost inference, SQLite database, and 50-country market directory. |

---

## 4. Step-by-Step cPanel Deployment

### Step 1: Deploy Frontend (`public_html`)
1. Log in to your **cPanel** and open **File Manager**.
2. Navigate to your website's document root (typically `public_html/`).
3. Upload **`astramix_frontend_public_html.zip`**.
4. Right-click the uploaded ZIP and select **Extract** directly into `public_html/`.
5. Verify that `index.html`, `.htaccess`, `preflight.php`, and the `_next/` folder now appear directly in `public_html/`. You can now delete the ZIP file.

### Step 2: Deploy Backend (`astramix_php`)
1. In cPanel File Manager, navigate one level up to your home directory (`/home/yourusername/`).
2. Upload **`astramix_backend_php.zip`**.
3. Right-click the ZIP and select **Extract**.
4. This creates the folder `/home/yourusername/astramix_php/` containing `src/`, `data/`, and `tests/`. You can now delete the ZIP file.

### Step 3: Verify Deployment
1. Ensure your PHP version is set to **PHP 8.2**, **8.3**, or **8.4** in cPanel (**Select PHP Version** or **MultiPHP Manager**).
2. Ensure extensions `pdo`, `pdo_sqlite`, `json`, and `mbstring` are enabled.
3. Open the diagnostic tool in your browser:
   `https://astramix-ai.com/preflight.php`
   - You should see all tests marked **[PASS]**, confirming PHP runtime, SQLite database, and XGBoost inference are working.
4. Open your live website:
   `https://astramix-ai.com/`
   - The site will render with complete styling (`7d0aca516d1e6650.css`), fonts, navigation, Mix Lab, and Materials Market!
