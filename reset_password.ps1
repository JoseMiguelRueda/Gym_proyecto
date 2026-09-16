$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

Write-Host "1. Leyendo pg_hba.conf..." -ForegroundColor Cyan
$originalContent = Get-Content $hbaPath

# Reemplazar autenticación por 'trust' temporalmente
$trustedContent = $originalContent -replace 'scram-sha-256', 'trust' -replace 'md5', 'trust'
Set-Content -Path $hbaPath -Value $trustedContent

Write-Host "2. Reiniciando servicio PostgreSQL con autenticación de confianza..." -ForegroundColor Yellow
Restart-Service -Name postgresql-x64-18 -Force
Start-Sleep -Seconds 2

Write-Host "3. Cambiando la contraseña del usuario postgres a 'postgres'..." -ForegroundColor Yellow
& $psqlPath -U postgres -h localhost -p 5432 -c "ALTER USER postgres WITH PASSWORD 'postgres';"

Write-Host "4. Restaurando pg_hba.conf a scram-sha-256..." -ForegroundColor Cyan
$finalContent = $trustedContent -replace 'trust', 'scram-sha-256'
Set-Content -Path $hbaPath -Value $finalContent

Write-Host "5. Reiniciando servicio PostgreSQL..." -ForegroundColor Yellow
Restart-Service -Name postgresql-x64-18 -Force
Start-Sleep -Seconds 2

Write-Host "6. Verificando conexión con la nueva contraseña..." -ForegroundColor Cyan
$env:PGPASSWORD = "postgres"
& $psqlPath -U postgres -h localhost -p 5432 -c "SELECT 'CONEXION_EXITOSA' AS estado, current_user, version();"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 ¡Contraseña restablecida exitosamente a: postgres!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Hubo un problema al verificar la nueva contraseña." -ForegroundColor Red
}
