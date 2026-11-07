@echo off
setlocal
cd /d "%~dp0\..\.." || exit /b 1
git pull --ff-only || exit /b 1
node --test adapters/pstack/test/generate.test.mjs || exit /b 1
node adapters/pstack/generate.mjs || exit /b 1
node adapters/pstack/generate.mjs --check || exit /b 1
echo Packages rebuilt. Refresh installed pstack-local plugins and restart the clients.
