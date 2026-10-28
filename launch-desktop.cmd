@echo off
setlocal
set "workshopRelative=release\Voxel Generator Workshop-win32-x64\VoxelGeneratorWorkshop.exe"
if exist "%~dp0release\current-desktop.txt" set /p "workshopRelative="<"%~dp0release\current-desktop.txt"
set "workshopExe=%~dp0%workshopRelative%"
if not exist "%workshopExe%" (
  echo Build the desktop app first with npm run desktop:package
  pause
  exit /b 1
)
start "" "%workshopExe%"
