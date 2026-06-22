@echo off
chcp 65001 >nul
setlocal

echo ============================================================
echo  Serve — Iniciando backend
echo ============================================================

:: Verifica se a porta 8080 já está em uso
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [AVISO] A porta 8080 ja esta em uso. O servidor pode ja estar rodando.
    echo Encerrando...
    pause
    exit /b 1
)

:: Verifica se o MySQL está respondendo (tenta conexão TCP simples)
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 3306); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] MySQL nao detectado na porta 3306.
    echo Certifique-se de que o MySQL esta rodando antes de iniciar o backend.
    pause
    exit /b 1
)

echo [OK] MySQL detectado.
echo [OK] Porta 8080 disponivel.
echo.
echo Iniciando Spring Boot com timezone America/Sao_Paulo...
echo.

:: JWT_SECRET para desenvolvimento local (não usar em produção).
:: Em produção, defina JWT_SECRET como variável de ambiente do sistema/container.
if not defined JWT_SECRET (
    set JWT_SECRET=serve-local-dev-secret-nao-usar-em-producao-troque-antes-do-deploy
    echo [DEV] JWT_SECRET nao definida. Usando chave local de desenvolvimento.
)

cd /d "%~dp0escala-backend"
call mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=America/Sao_Paulo"

pause
