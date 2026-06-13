@echo off
echo.
echo  Stream Save SL - Build Tool
echo  ============================
echo  [1] Build
echo  [2] Clean source
echo  [3] Clean + Build
echo  [4] Exit
echo.
set /p choice="Choose an option: "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto clean
if "%choice%"=="3" goto cleanbuild
if "%choice%"=="4" exit
goto end

:clean
echo Cleaning...
cd /d "%~dp0src"
if exist "build\bin\StreamSaveSL.exe" del /f /q "build\bin\StreamSaveSL.exe"
if exist "build\bin" rmdir "build\bin"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
echo Done!
pause
exit /b 0

:cleanbuild
echo Cleaning...
cd /d "%~dp0src"
if exist "build\bin\StreamSaveSL.exe" del /f /q "build\bin\StreamSaveSL.exe"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"

:build
cd /d "%~dp0src"
echo Building Stream Save SL...
wails build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.
echo Build complete! StreamSaveSL.exe is in src\build\bin\
pause
exit /b 0

:end