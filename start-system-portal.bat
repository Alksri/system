@echo off
setlocal
cd /d "%~dp0"
echo Starting System Portal at http://localhost:8090 (also try http://systemportal.local:8090 if configured in hosts)
start "" "http://localhost:8090/login.html"
python -m http.server 8090
pause
