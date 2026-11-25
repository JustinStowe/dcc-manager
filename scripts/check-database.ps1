param(
    [Parameter(Mandatory = $true)][string]$TestDatabase,
    [int]$Port = 55439
)
# Only an isolated local PostgreSQL server. Creates a NEW database; never drops
# or resets an existing database. Auth/realtime below are local test doubles.
$ErrorActionPreference = 'Stop'
if ($TestDatabase -notmatch '^dcc_test_[a-z0-9_]+$') { throw 'Use a new database name starting with dcc_test_.' }
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$connection = @('-h', '127.0.0.1', '-p', "$Port", '-U', 'postgres', '-v', 'ON_ERROR_STOP=1')
$result = & psql @connection -d postgres -c "create database $TestDatabase;" 2>&1
if ($LASTEXITCODE -ne 0) { throw ($result -join "`n") }
function Invoke-TestSql([string]$RelativePath) {
    $filePath = Join-Path $projectRoot $RelativePath
    $output = & psql @connection -d $TestDatabase -f $filePath 2>&1
    if ($LASTEXITCODE -ne 0) { throw (($output | Select-Object -Last 22) -join "`n") }
    Write-Output "PASS $RelativePath"
}
Invoke-TestSql 'scripts/test-database-bootstrap.sql'
foreach ($migration in (Get-ChildItem (Join-Path $projectRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name)) {
    if ($migration.Name -match '0019_') { Invoke-TestSql 'supabase/tests/progression_upgrade_before.sql' }
    Invoke-TestSql "supabase/migrations/$($migration.Name)"
}
Invoke-TestSql 'supabase/tests/progression_upgrade_after.sql'
foreach ($suite in @('progression_rules', 'progression_permissions', 'system_ai_permissions', 'third_floor_permissions', 'level_advancement_permissions', 'effect_templates_permissions', 'effects_live_permissions', 'encounter_permissions', 'sheet_controls_permissions', 'equipment_hotlist_permissions', 'learned_skills_permissions', 'typed_defenses_permissions')) {
    Invoke-TestSql "supabase/tests/$suite.sql"
}
