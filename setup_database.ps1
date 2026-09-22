param (
    [string]$DbPassword = "0205",
    [string]$DbName = "db_gimnsaio"
)

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    # Buscar versiones alternativas de PostgreSQL si no está en la 18
    $altPaths = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Sort-Object Name -Descending
    if ($altPaths) {
        $psqlPath = Join-Path $altPaths[0].FullName "bin\psql.exe"
    }
}

if (-not (Test-Path $psqlPath)) {
    Write-Host "⚠️ No se encontró psql en la ruta estándar de PostgreSQL. Puedes ejecutar el script manualmente en pgAdmin 4." -ForegroundColor Yellow
    exit
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Configurando Base de Datos '$DbName' en PostgreSQL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:PGPASSWORD = $DbPassword

Write-Host "`n1. Creando base de datos '$DbName' (si no existe)..." -ForegroundColor Yellow
& $psqlPath -U postgres -h localhost -p 5432 -c "CREATE DATABASE $DbName;" 2>$null

Write-Host "`n2. Ejecutando schema_pgadmin4.sql..." -ForegroundColor Yellow
& $psqlPath -U postgres -h localhost -p 5432 -d $DbName -f "$PSScriptRoot\database\schema_pgadmin4.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ ¡Base de datos $DbName, triggers, funciones, procedimientos, vistas e índices creados exitosamente!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Si la contraseña no era '$DbPassword', puedes abrir pgAdmin 4 y ejecutar el archivo database\schema_pgadmin4.sql directamente en la Query Tool." -ForegroundColor Yellow
}
