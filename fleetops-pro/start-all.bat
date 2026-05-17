@echo off
cd /d C:\autobus\fleetops-pro
echo Starting FleetOps API on port 3001...
start /B node server/index.cjs
echo Waiting for API...
ping 127.0.0.1 -n 4 > nul
echo Starting Frontend on port 5173...
start /B C:\Users\equipo\AppData\Roaming\npm\npm.cmd run dev -- --host 0.0.0.0
echo Both servers started.
echo API: http://localhost:3001
echo Frontend: http://localhost:5173
