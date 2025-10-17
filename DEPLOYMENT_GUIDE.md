# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

This guide will help you deploy the Employee Offboarding Portal to Vercel.

---

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **Azure AD App Registration** (optional - can use demo mode)

---

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Create React App

3. **Configure Environment Variables:**
   In the Vercel project settings, add these environment variables:
   
   | Variable Name | Value | Description |
   |---------------|-------|-------------|
   | `REACT_APP_CLIENT_ID` | `your-client-id` | Azure AD Application (client) ID |
   | `REACT_APP_AUTHORITY` | `https://login.microsoftonline.com/your-tenant-id` | Azure AD Authority URL |
   | `REACT_APP_REDIRECT_URI` | `https://your-app.vercel.app` | Your Vercel app URL |

   **OR** for Demo Mode:
   
   | Variable Name | Value |
   |---------------|-------|
   | `REACT_APP_DEMO_MODE` | `true` |

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Your app will be live at `https://your-app.vercel.app`

---

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```powershell
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```powershell
   vercel login
   ```

3. **Deploy:**
   ```powershell
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (for first deployment)
   - What's your project's name? **employee-offboarding-portal**
   - In which directory is your code located? **./**
   - Want to override settings? **N**

4. **Add Environment Variables:**
   ```powershell
   # For Azure AD Configuration
   vercel env add REACT_APP_CLIENT_ID
   vercel env add REACT_APP_AUTHORITY
   vercel env add REACT_APP_REDIRECT_URI
   
   # OR for Demo Mode
   vercel env add REACT_APP_DEMO_MODE
   ```

5. **Deploy to Production:**
   ```powershell
   vercel --prod
   ```

---

## Azure AD Configuration for Vercel

### Update Redirect URI in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app registration
4. Go to **Authentication**
5. Add your Vercel URL to **Redirect URIs**:
   - Type: **Single-page application (SPA)**
   - URI: `https://your-app.vercel.app`
   - Also add: `https://your-app-git-main-yourname.vercel.app` (for preview deployments)
6. Click **Save**

### CORS Configuration

If you experience CORS issues:
1. In Azure AD app registration, go to **Expose an API**
2. Ensure your Vercel domain is whitelisted
3. Check **API permissions** are correctly set

---

## Environment Variables Explained

### Production (Azure AD)
```env
REACT_APP_CLIENT_ID=12345678-1234-1234-1234-123456789abc
REACT_APP_AUTHORITY=https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321
REACT_APP_REDIRECT_URI=https://your-app.vercel.app
```

### Demo Mode (No Azure AD Required)
```env
REACT_APP_DEMO_MODE=true
```

---

## Vercel Project Settings

### Build & Development Settings

These are auto-configured but you can verify:

- **Framework Preset**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`
- **Development Command**: `npm start`

### Domains

Vercel provides:
- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch-yourname.vercel.app`

You can also add custom domains in Vercel project settings.

---

## Continuous Deployment

Once connected to Git:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Automatic preview deployments

Every git push triggers a new deployment!

---

## Post-Deployment Checklist

- [ ] App loads at your Vercel URL
- [ ] Configuration page is accessible
- [ ] Demo mode works (if enabled)
- [ ] Azure AD login works (if configured)
- [ ] All routes are accessible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] HTTPS is enabled (automatic on Vercel)

---

## Troubleshooting

### Build Fails

**Check build logs in Vercel dashboard:**
```
Settings → Deployments → Click on failed deployment → View logs
```

**Common issues:**
- Missing dependencies: Run `npm install` locally first
- Environment variables not set
- Syntax errors in code

### White Screen After Deployment

**Solutions:**
1. Check browser console for errors (F12)
2. Verify environment variables are set
3. Check `vercel.json` rewrites configuration
4. Ensure `public/index.html` exists

### Azure AD Login Fails

**Solutions:**
1. Verify Redirect URI in Azure AD matches Vercel URL exactly
2. Check `REACT_APP_REDIRECT_URI` environment variable
3. Ensure app permissions are granted in Azure AD
4. Check browser console for MSAL errors

### Environment Variables Not Working

**Solutions:**
1. Redeploy after adding environment variables
2. Check variable names start with `REACT_APP_`
3. Verify values don't have quotes or spaces
4. Check they're set for production environment

---

## Monitoring & Analytics

### Vercel Analytics (Optional)

Enable in Vercel dashboard:
1. Go to your project
2. Click **Analytics**
3. Enable **Web Analytics**

This provides:
- Page views
- Performance metrics
- User demographics
- Core Web Vitals

---

## Updating Your Deployment

### Via Git Push
```powershell
git add .
git commit -m "Update description"
git push
```
Vercel automatically deploys!

### Via Vercel CLI
```powershell
vercel --prod
```

### Manual Redeploy (Same Code)
In Vercel dashboard:
1. Go to **Deployments**
2. Click **⋯** on latest deployment
3. Click **Redeploy**

---

## Custom Domain Setup (Optional)

1. **In Vercel Dashboard:**
   - Go to **Settings** > **Domains**
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Azure AD:**
   - Add custom domain to Redirect URIs
   - Update `REACT_APP_REDIRECT_URI` environment variable

3. **Redeploy:**
   ```powershell
   vercel --prod
   ```

---

## Security Best Practices

1. **Never commit `.env` files** - They're gitignored
2. **Use Vercel environment variables** for secrets
3. **Enable HTTPS** - Automatic on Vercel
4. **Rotate credentials** regularly
5. **Use different Azure AD apps** for dev/staging/prod
6. **Review Vercel access logs** regularly

---

## Cost & Limits

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ HTTPS/SSL certificates
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ✅ Preview deployments
- ✅ Custom domains

### Limits:
- 100GB bandwidth/month
- 6,000 build minutes/month
- 10s serverless function timeout

For higher limits, upgrade to Pro: $20/month

---

## Support Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord**: [vercel.com/discord](https://vercel.com/discord)
- **Azure AD Docs**: [docs.microsoft.com/azure/active-directory](https://docs.microsoft.com/azure/active-directory)
- **Project Issues**: Check GitHub issues or console logs

---

## Example Deployment Commands

```powershell
# First-time setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List all deployments
vercel ls

# Check environment variables
vercel env ls
```

---

## Next Steps

After successful deployment:

1. ✅ Test all functionality
2. ✅ Set up custom domain (optional)
3. ✅ Enable Vercel Analytics
4. ✅ Configure CI/CD workflows
5. ✅ Add team members to Vercel project
6. ✅ Set up monitoring/alerts
7. ✅ Document your deployment process

---

## Demo Mode vs Production

| Feature | Demo Mode | Production (Azure AD) |
|---------|-----------|----------------------|
| Authentication | Simulated | Real Azure AD |
| User Data | Mock data | Real Microsoft Graph |
| Deployment Speed | Fast | Fast |
| Setup Required | None | Azure AD app registration |
| Best For | Testing, demos | Production use |
| Cost | Free | Free (Azure AD free tier) |

---

**🎉 Congratulations! Your app is now deployed on Vercel!**

Visit your app at: `https://your-app.vercel.app`
