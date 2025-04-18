@echo off
echo Running facility data import...
echo.

REM Stop any running Encore services
echo Stopping Encore services...
taskkill /f /im encore.exe >nul 2>&1
taskkill /f /im encored.exe >nul 2>&1
timeout /t 2 >nul

REM Connect to the Encore database
echo Running SQL import...
encore db shell < facilities\data\direct_import.sql

echo.
echo Import complete! You can now run 'encore run' to start the application. 