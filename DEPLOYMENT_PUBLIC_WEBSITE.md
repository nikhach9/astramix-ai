# AstraMix AI v0.1 - Public Website Deployment Guide

This guide details instructions for deploying the public website showcase of **AstraMix AI** onto Vercel with your custom domain.

---

## 🚀 Public Website Deployment Target
* **Hosting Platform**: Vercel (https://vercel.com)
* **Custom Domain**: `astramix-ai.com`

---

## ⚙️ Recommended Vercel Settings
Configure your Vercel project with the following properties during setup:

1. **Root Directory**: `frontend`
2. **Install Command**: `npm ci`
3. **Build Command**: `npm run build`
4. **Output Directory**: *Leave default (Next.js default `.next` folder)*

---

## 🌐 Public Routes to Test
Verify that the following public routes render successfully after deployment is live:
* 🏠 Homepage: `https://astramix-ai.com/` (featuring primary button pointing to showcase)
* 📊 Showcase: `https://astramix-ai.com/projects/astramix` (fully operational showcase)
* 📄 Technical Report: `https://astramix-ai.com/docs/PROJECT_REPORT_v0_1.md` (viewable and downloadable)

---

## 🔧 DNS / Custom Domain Setup
To connect your purchased domain `astramix-ai.com` to the Vercel project:

1. Go to your Vercel Project Dashboard.
2. Select **Settings** > **Domains**.
3. Enter `astramix-ai.com` and click **Add**.
4. Vercel will generate the DNS values to add. Log in to your domain registrar (e.g., Namecheap, GoDaddy) and add these records:

* **For Apex Domain (`astramix-ai.com`)**:
  * **Type**: `A`
  * **Name**: `@`
  * **Value**: `76.76.21.21`

* **For Subdomain (`www.astramix-ai.com`)**:
  * **Type**: `CNAME`
  * **Name**: `www`
  * **Value**: `cname.vercel-dns.com.`

---

## ⚠️ Important Note
This release is a public showcase website. The backend API is not required for the showcase page (`/projects/astramix`) to load or render properly, as it uses polished mockup fallbacks for screenshot panels and static content presentation.
