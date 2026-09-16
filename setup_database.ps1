param (
    [string]$DbPassword = "admin"
)

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    Write-Host "⚠️ No se encontró psql en la ruta estándar de PostgreSQL 18. Puedes ejecutar el script manualmente en pgAdmin 4." -ForegroundColor Yellow
    exit
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Configurando Base de Datos 'gym_db' en PostgreSQL 18" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:PGPASSWORD = $DbPassword

Write-Host "`n1. Creando base de datos 'gym_db' (si no existe)..." -ForegroundColor Yellow
& $psqlPath -U postgres -h localhost -p 5432 -c "CREATE DATABASE gym_db;" 2>$null

Write-Host "`n2. Ejecutando schema_pgadmin4.sql..." -ForegroundColor Yellow
& $psqlPath -U postgres -h localhost -p 5432 -d gym_db -f "$PSScriptRoot\database\schema_pgadmin4.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ ¡Base de datos gym_db y tablas creadas exitosamente!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Si la contraseña no era '$DbPassword', puedes abrir pgAdmin 4 y ejecutar el archivo database\schema_pgadmin4.sql directamente en la Query Tool." -ForegroundColor Yellow
}
