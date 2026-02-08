# How to View on Your Phone - GitHub Pages Setup

## Quick Setup (5 minutes)

### Step 1: Upload to GitHub

1. Create a new repository on GitHub (if you haven't already)
2. Upload your files using Git or GitHub Desktop

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
5. Click **Save**

### Step 3: Access on Your Phone

1. Wait 1-2 minutes for GitHub to build your site
2. Your site will be available at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/mechanical_engineering_formulas.html
   ```
   Or if you rename the file to `index.html`:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

3. Open this URL on your phone's browser!

---

## Alternative: Rename to index.html (Recommended)

If you rename `mechanical_engineering_formulas.html` to `index.html`, your site will be accessible at the shorter URL:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

**To rename:**
- On GitHub: Click the file → Click the pencil icon → Change filename → Commit
- Or locally: Rename the file and push the change

---

## Quick Access Tips

1. **Bookmark** the URL on your phone for easy access
2. **Add to Home Screen** (iOS/Android) for app-like experience
3. **Share** the link with classmates

---

## Testing Locally on Phone (Before Uploading)

If you want to test on your phone before uploading:

### Option 1: Local Network Server
1. Find your computer's local IP address:
   - Windows: Open Command Prompt, type `ipconfig`, look for IPv4 Address
   - Mac/Linux: Open Terminal, type `ifconfig` or `ip addr`
2. Start a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or use VS Code Live Server extension
   ```
3. On your phone, open: `http://YOUR_IP_ADDRESS:8000/mechanical_engineering_formulas.html`
   (Make sure phone and computer are on same WiFi)

### Option 2: Use GitHub Desktop
- Install GitHub Desktop
- Push your changes
- Enable GitHub Pages as described above

---

## Troubleshooting

**Page not loading?**
- Wait a few minutes after enabling GitHub Pages
- Check that the file is in the root of your repository
- Verify the filename is correct

**Mobile layout looks off?**
- Clear your browser cache
- Try refreshing the page
- The page is optimized for mobile, but some older browsers may have issues

---

Enjoy studying on the go! 📱📚



