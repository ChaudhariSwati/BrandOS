@echo off
cd /d c:\Users\kumar\OneDrive\Desktop\BrandOS\server
npm install --legacy-peer-deps 2>&1
echo EXIT_CODE=%ERRORLEVEL%
