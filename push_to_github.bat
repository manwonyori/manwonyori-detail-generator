@echo off
echo ========================================
echo GitHub Push Script
echo Manwonyori Detail Page Generator
echo ========================================
echo.

echo Step 1: Create GitHub Repository
echo.
echo Please go to: https://github.com/new
echo.
echo Repository Settings:
echo - Name: manwonyori-detail-generator
echo - Description: AI-powered product detail page generator for Manwonyori
echo - Privacy: Private (recommended for security)
echo - DO NOT initialize with README, .gitignore, or license
echo.
pause

echo.
echo Step 2: Add Remote Repository
echo.
echo Enter your GitHub username:
set /p USERNAME=

git remote add origin https://github.com/%USERNAME%/manwonyori-detail-generator.git

echo.
echo Step 3: Push to GitHub
echo.
git branch -M main
git push -u origin main

echo.
echo ========================================
echo Push Complete!
echo ========================================
echo.
echo Your repository is now available at:
echo https://github.com/%USERNAME%/manwonyori-detail-generator
echo.
echo Next Steps for Render Deployment:
echo 1. Go to https://render.com
echo 2. Connect your GitHub account
echo 3. Create New Web Service
echo 4. Select this repository
echo 5. Add environment variable: CLAUDE_API_KEY
echo ========================================
echo.
pause