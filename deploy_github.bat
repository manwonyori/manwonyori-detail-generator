@echo off
echo ========================================
echo GitHub Deployment Script
echo Manwonyori Detail Page Generator
echo ========================================
echo.

echo Step 1: Initializing Git repository...
git init

echo.
echo Step 2: Adding files to Git...
git add .

echo.
echo Step 3: Creating initial commit...
git commit -m "Initial commit - Manwonyori detail page generator system"

echo.
echo Step 4: GitHub repository setup required
echo.
echo Please follow these steps:
echo.
echo 1. Go to https://github.com/new
echo 2. Create a new repository named: manwonyori-detail-generator
echo 3. Make it private (for security)
echo 4. DO NOT initialize with README
echo.
echo 5. After creating, run these commands:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/manwonyori-detail-generator.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo ========================================
echo IMPORTANT: .env file will NOT be uploaded
echo Make sure to set environment variables in Render
echo ========================================
echo.
pause