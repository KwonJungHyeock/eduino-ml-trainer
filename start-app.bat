@echo off
chcp 65001 >nul
title Eduino AI Lab
cd /d "%~dp0"
echo Eduino AI Lab 앱을 실행합니다... (이 창은 앱과 함께 켜져 있어야 합니다)
call npm run app
