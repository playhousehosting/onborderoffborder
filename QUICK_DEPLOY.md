# 🚀 Quick Start: Deploy to Vercel

## Fastest Way to Deploy (5 minutes)

### Option 1: Using GitHub + Vercel Dashboard (Recommended)

1. **Create a GitHub repository:**
   ```powershell
   # Initialize git (if not already done)
   git init
   
   # Add all files
   git add .
   
   # Commit
   git commit -m "Ready for Vercel deployment"
   
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Deploy"
   - ✅ Done! Your app is live

3. **Enable Demo Mode** (Optional):
   - In Vercel project → Settings → Environment Variables
   - Add: `REACT_APP_DEMO_MODE` = `true`
   - Redeploy

---

### Option 2: Using Vercel CLI (Fastest)

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Or use our deployment script:**
```powershell
.\deploy-vercel.ps1
```

---

## Configuration Options

### Demo Mode (No Azure AD needed)
Set in Vercel environment variables:
- `REACT_APP_DEMO_MODE` = `true`

### Production Mode (With Azure AD)
Set in Vercel environment variables:
- `REACT_APP_CLIENT_ID` = Your Azure AD client ID
- `REACT_APP_AUTHORITY` = `https://login.microsoftonline.com/YOUR_TENANT_ID`
- `REACT_APP_REDIRECT_URI` = Your Vercel URL (e.g., `https://your-app.vercel.app`)

---

## Important Notes

✅ **Automatic HTTPS** - Vercel provides SSL certificates automatically
✅ **Auto-deploy** - Connected to Git = auto-deploy on push
✅ **Preview URLs** - Each branch gets a unique preview URL
✅ **Environment Variables** - Set securely in Vercel dashboard
✅ **Zero Config** - React apps deploy automatically

---

## Troubleshooting

**Build fails?**
- Run `npm run build` locally first to catch errors
- Check Vercel build logs in dashboard

**White screen?**
- Check browser console (F12)
- Verify environment variables are set
- Enable demo mode to test

**Need help?**
- See full guide: `DEPLOYMENT_GUIDE.md`
- Vercel docs: https://vercel.com/docs

---

## What's Next?

After deployment:
1. Test your live site
2. Add custom domain (optional)
3. Configure Azure AD redirect URIs
4. Enable analytics
5. Share your link! 🎉

---

**Your app will be available at:**
`https://your-project-name.vercel.app`
