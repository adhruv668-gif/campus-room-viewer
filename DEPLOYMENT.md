# GitHub Pages Deployment Guide
> **Campus Room & Lab Availability Viewer**  
> **LPU CSE326 — CA1 Problem Statement-Based Project**  
> **Team SOUL** (Angel Seth, Kartik, Dhruv Anand)

---

## 1. Prerequisites
- A free account on [GitHub](https://github.com).
- Git installed on your computer ([Download Git](https://git-scm.com/)).
- The project folder containing `index.html`, `css/`, and `js/`.

---

## 2. Step-by-Step Terminal Commands

Open terminal (PowerShell, Command Prompt, or Git Bash) inside the project folder:
`c:\Users\anand\Downloads\campus room`

### Step 2.1: Initialize Git Repository
```bash
git init
```

### Step 2.2: Stage All Project Files
```bash
git add .
```

### Step 2.3: Create Initial Commit
```bash
git commit -m "Initial commit: Campus Room & Lab Availability Viewer (LPU CSE326 Team SOUL)"
```

### Step 2.4: Set Main Branch
```bash
git branch -M main
```

### Step 2.5: Link Remote GitHub Repository
```bash
git remote add origin https://github.com/adhruv668-gif/campus-room-viewer.git
```

### Step 2.6: Push Code to GitHub
```bash
git push -u origin main
```

---

## 3. Enable GitHub Pages in Repository Settings

1. Open your repository on GitHub: `https://github.com/adhruv668-gif/campus-room-viewer`.
2. Click the **Settings** tab at the top.
3. In the left navigation menu, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` from the dropdown.
   - **Folder**: Select `/(root)` from the folder dropdown.
5. Click **Save**.
6. Wait 60 to 90 seconds for GitHub Actions to complete the deployment.
7. Refresh the page. You will see a banner:  
   **"Your site is live at `https://adhruv668-gif.github.io/campus-room-viewer/`"**

---

## 4. Why This Codebase Works Flawlessly on GitHub Pages

1. **Relative Paths Only**:
   - All assets in `index.html` use relative paths (`css/base.css`, `js/app.js`) rather than root-relative paths (`/css/base.css`).
   - GitHub Pages serves repositories from a sub-directory (`/<repo-name>/`). Root-relative paths fail with HTTP 404, but relative paths resolve correctly.
2. **Client-Side Hash Routing**:
   - The application routes using `#/...` (e.g. `#/availability`, `#/requests`).
   - When a user refreshes the page on GitHub Pages, standard path routing (`/availability`) returns a 404 error because no backend server exists. Hash routing always reloads `index.html`, and `App.navigate()` immediately renders the correct view.
3. **No Build Step Required**:
   - No `package.json`, Webpack, Vite, or npm build command needed. The repository files are served directly as static HTML, CSS, and JS.

---

## 5. Submission Pre-Flight Checklist

Before submitting the project URL on the LPU portal or GitHub:

- [ ] Repository is set to **Public**.
- [ ] Live GitHub Pages URL opens properly in an Incognito window: `https://adhruv668-gif.github.io/campus-room-viewer/`.
- [ ] Default route `#dashboard` displays KPI cards and live clock.
- [ ] Switching routes (`#/availability`, `#/find`, `#/request`, `#/requests`, `#/help`) works without 404 errors.
- [ ] Switching role to `Admin` with PIN `1234` unlocks the Admin Portal.
- [ ] Theme toggle switches between Dark and Light mode.
- [ ] All team credits (Angel Seth, Kartik, Dhruv Anand) appear in the footer and `README.md`.
