# Upload to GitHub - Quick Guide

## Step 1: Create Repository on GitHub

1. Go to https://github.com/tzion-gvili
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository name: `mechanical-engineering-formulas` (or any name you prefer)
4. Description: "Comprehensive Mechanical Engineering Formulas Reference with Interactive Variable Definitions"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/tzion-gvili/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_REPO_NAME` with the actual repository name you created.

## Step 3: Enable GitHub Pages (Optional - to view on phone)

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**
5. Your site will be available at: `https://tzion-gvili.github.io/YOUR_REPO_NAME/mechanical_engineering_formulas.html`

## Alternative: Use GitHub Desktop

If you prefer a GUI:
1. Download GitHub Desktop
2. File → Add Local Repository
3. Select `c:\Coffeebar\Formula3`
4. Publish repository to GitHub

---

**Note:** Make sure you're logged into GitHub in your browser before creating the repository!
























