# Employee Offboarding Portal - Backend Setup Script
# PowerShell

Write-Host "
╔════════════════════════════════════════════════════════════╗
║   Employee Offboarding Portal - Backend Setup             ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "."
Set-Location $backendPath

# Install dependencies
Write-Host "`n📥 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Run setup script
Write-Host "`n⚙️  Running configuration setup..." -ForegroundColor Yellow
node setup.js

# Check if .env was created
if (Test-Path ".env") {
    Write-Host "`n✅ Backend setup complete!" -ForegroundColor Green
    Write-Host "`n🚀 To start the server, run:" -ForegroundColor Cyan
    Write-Host "   npm run dev    (development with auto-restart)" -ForegroundColor White
    Write-Host "   npm start      (production)" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Setup was cancelled or incomplete" -ForegroundColor Yellow
}
