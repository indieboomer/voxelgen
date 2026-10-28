@echo off
setlocal
set "workshopExe=%~dp0release\Voxel Generator Workshop-win32-x64\VoxelGeneratorWorkshop.exe"
if not exist "%workshopExe%" (
  echo Build the desktop app first with npm run desktop:package
  pause
  exit /b 1
)
start "" "%workshopExe%"
