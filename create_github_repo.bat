@echo off
echo ========================================
echo GitHub Repository Creation Guide
echo ========================================
echo.
echo Please follow these steps:
echo.
echo 1. Open your browser and go to:
echo    https://github.com/new
echo.
echo 2. Login with username: manwonyori
echo.
echo 3. Create repository with these settings:
echo    - Repository name: manwonyori-detail-generator
echo    - Description: AI-powered product detail page generator
echo    - Select: Private (or Public if you prefer)
echo    - IMPORTANT: Do NOT check any initialization options:
echo      [ ] Add a README file - LEAVE UNCHECKED
echo      [ ] Add .gitignore - LEAVE UNCHECKED  
echo      [ ] Choose a license - LEAVE UNCHECKED
echo.
echo 4. Click "Create repository"
echo.
echo 5. After creating, come back here and press any key
echo.
pause

echo.
echo ========================================
echo Now pushing your code to GitHub...
echo ========================================
echo.

git remote remove origin 2>nul
git remote add origin https://github.com/manwonyori/manwonyori-detail-generator.git
git branch -M main
git push -u origin main

echo.
echo ========================================
echo Push Complete!
echo ========================================
echo.
echo Your code is now on GitHub at:
echo https://github.com/manwonyori/manwonyori-detail-generator
echo.
pause