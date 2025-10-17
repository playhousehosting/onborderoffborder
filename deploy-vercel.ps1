# Vercel Deployment Script
# Run this script to deploy to Vercel

Write-Host "🚀 Employee Offboarding Portal - Vercel Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "❌ Git not initialized. Initializing now..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit for Vercel deployment"
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check if Vercel CLI is installed
Write-Host ""
Write-Host "Checking Vercel CLI..." -ForegroundColor Cyan
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found" -ForegroundColor Red
    Write-Host ""
    $install = Read-Host "Would you like to install Vercel CLI globally? (y/n)"
    
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
        npm install -g vercel
        Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
    } else {
        Write-Host "Please install Vercel CLI manually: npm install -g vercel" -ForegroundColor Yellow
        exit
    }
} else {
    Write-Host "✅ Vercel CLI is installed" -ForegroundColor Green
}

# Menu
Write-Host ""
Write-Host "Choose deployment option:" -ForegroundColor Cyan
Write-Host "1. Deploy to Vercel (Preview)" -ForegroundColor White
Write-Host "2. Deploy to Vercel (Production)" -ForegroundColor White
Write-Host "3. Login to Vercel" -ForegroundColor White
Write-Host "4. Set Environment Variables" -ForegroundColor White
Write-Host "5. Build locally (test)" -ForegroundColor White
Write-Host "6. Open Deployment Guide" -ForegroundColor White
Write-Host "7. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Deploying to Vercel (Preview)..." -ForegroundColor Cyan
        vercel
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Deploying to Vercel (Production)..." -ForegroundColor Cyan
        vercel --prod
    }
    "3" {
        Write-Host ""
        Write-Host "🔐 Logging into Vercel..." -ForegroundColor Cyan
        vercel login
    }
    "4" {
        Write-Host ""
        Write-Host "⚙️  Environment Variable Setup" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Choose configuration type:" -ForegroundColor White
        Write-Host "1. Demo Mode (No Azure AD required)" -ForegroundColor Green
        Write-Host "2. Production (Azure AD configuration)" -ForegroundColor Yellow
        Write-Host ""
        
        $envChoice = Read-Host "Enter your choice (1-2)"
        
        if ($envChoice -eq "1") {
            Write-Host ""
            Write-Host "Setting up Demo Mode..." -ForegroundColor Green
            vercel env add REACT_APP_DEMO_MODE production
            Write-Host "Enter 'true' when prompted" -ForegroundColor Yellow
        } elseif ($envChoice -eq "2") {
            Write-Host ""
            Write-Host "Setting up Azure AD configuration..." -ForegroundColor Yellow
            Write-Host "You'll need your Azure AD app registration details" -ForegroundColor White
            Write-Host ""
            
            Write-Host "Adding REACT_APP_CLIENT_ID..." -ForegroundColor Cyan
            vercel env add REACT_APP_CLIENT_ID production
            
            Write-Host ""
            Write-Host "Adding REACT_APP_AUTHORITY..." -ForegroundColor Cyan
            vercel env add REACT_APP_AUTHORITY production
            
            Write-Host ""
            Write-Host "Adding REACT_APP_REDIRECT_URI..." -ForegroundColor Cyan
            vercel env add REACT_APP_REDIRECT_URI production
            
            Write-Host ""
            Write-Host "✅ Environment variables configured" -ForegroundColor Green
            Write-Host "⚠️  Remember to update Azure AD Redirect URIs with your Vercel URL" -ForegroundColor Yellow
        }
    }
    "5" {
        Write-Host ""
        Write-Host "🔨 Building production bundle locally..." -ForegroundColor Cyan
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Build successful! Check the /build directory" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Build failed. Check the errors above" -ForegroundColor Red
        }
    }
    "6" {
        Write-Host ""
        Write-Host "📖 Opening Deployment Guide..." -ForegroundColor Cyan
        Start-Process "DEPLOYMENT_GUIDE.md"
    }
    "7" {
        Write-Host ""
        Write-Host "👋 Goodbye!" -ForegroundColor Cyan
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "🌐 Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
