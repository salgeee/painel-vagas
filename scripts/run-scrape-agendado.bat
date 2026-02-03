@echo off
REM Script para o Agendador de Tarefas do Windows
REM Roda o scrape local (vagas SEE/MG) e opcionalmente dispara o geocode na API.
REM Garante que o diretório de trabalho seja a raiz do projeto (env é carregado pelo caminho do script).

cd /d "%~dp0.."
call npm run scrape:local >> "%~dp0scrape-log.txt" 2>&1
