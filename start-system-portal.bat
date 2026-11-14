@echo off
setlocal
cd /d "%~dp0"
echo Starting System Portal at http://localhost:8091 (also try http://systemportal.local:8091 if configured in hosts)
echo If port 8091 is busy, edit this file to use another port.
start "" "http://localhost:8091/login.html"
python -m http.server 8091 --bind 127.0.0.1
pause
