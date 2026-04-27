@echo off
setlocal
cd /d "%~dp0"
start "" http://127.0.0.1:8080
node server.js
