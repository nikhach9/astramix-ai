# Website Launch Ready Checklist - AstraMix AI v0.1

This checklist details the verification items for releasing the AstraMix AI v0.1 website public showcase.

## 1. Homepage Polish
- [x] Clear hero section introducing AstraMix AI.
- [x] Founder credit: **Nikolay Khachatryan** visible in header and footer.
- [x] Highlighted list of platform features (ML Prediction, SLSQP Optimization, Sustainability/Economic impacts).
- [x] "View AstraMix Showcase" CTA button clearly visible and pointing to `/projects/astramix`.
- [x] Layout follows drafting-blueprint styling (navy and warm paper paper-aesthetic).

## 2. /projects/astramix Page Polish
- [x] Removed `"use client"` directive to enable SSR static generation.
- [x] Added static SEO and Open Graph metadata inside the router file.
- [x] Visual credit: **Nikolay Khachatryan** present in the hero subtitle and page footer.
- [x] Kept all 10 required showcase sections (Hero, Why I Built It, What AstraMix Does, Model metrics, Stack, Limitations, Roadmap, CTA, etc.).

## 3. SEO & Social Metadata
- [x] Added Title: `AstraMix AI | AI-Assisted Sustainable Concrete Mix Design`.
- [x] Added Description covering machine learning, CO₂ footprint, cost mapping, and SLSQP solvers.
- [x] Injected Keywords mapping civil engineering, machine learning, and compressive strength fields.
- [x] Open Graph headers integrated for Facebook, LinkedIn, and social media sharing.
- [x] Author meta tags pointing to **Nikolay Khachatryan**.

## 4. Standalone HTML Showcase
- [x] Saved as standard CDN-free HTML under `showcase/astramix-showcase.html`.
- [x] Replaced all React-style `className` attributes with standard `class` attributes.
- [x] Included Nikolay Khachatryan credit in the footer and headers.
- [x] Runs offline by double-clicking it on any system.

## 5. Buttons and Call to Actions
- [x] Placeholder links created for GitHub Repository (`#github`).
- [x] Placeholder links created for Demo Video (`#demo`).
- [x] Placeholder links created for Technical Report (`#report`).

## 6. Pre-Launch Configuration
- [ ] Connect custom domain inside Vercel Dashboard (DNS setup pending final review).
- [x] Frontend successfully validated with local static build compilation check.
