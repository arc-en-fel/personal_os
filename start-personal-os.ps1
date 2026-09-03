$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$container = 'personal-os-statement-parser'
$image = 'personal-os-statement-parser'
$token = 'local-secret'
$stdout = Join-Path $env:TEMP 'personal-os-cloudflared.out.log'
$stderr = Join-Path $env:TEMP 'personal-os-cloudflared.err.log'

Write-Host 'Starting statement parser...' -ForegroundColor Cyan
if (-not (docker image inspect $image 2>$null)) { docker build -t $image services/statement-parser }
$existing = docker ps -aq --filter "name=^/$container$"
if ($existing) { docker start $container 2>$null | Out-Null }
else { docker run -d --name $container -p 8080:8080 -e "STATEMENT_PARSER_TOKEN=$token" $image | Out-Null }
Start-Sleep -Seconds 2
$health = curl.exe --fail --silent http://127.0.0.1:8080/health
if ($health -notmatch '"status":"ok"') { throw 'Statement parser did not become healthy.' }

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue
Start-Process cloudflared -ArgumentList 'tunnel','--url','http://localhost:8080','--no-autoupdate' -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden | Out-Null
$url = $null
for ($attempt = 0; $attempt -lt 30 -and -not $url; $attempt++) {
  Start-Sleep -Seconds 1
  foreach ($file in @($stdout, $stderr)) {
    if (Test-Path $file) { $match = Select-String -Path $file -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -Last 1; if ($match) { $url = [regex]::Match($match.Line, 'https://[a-z0-9-]+\.trycloudflare\.com').Value } }
  }
}
if (-not $url) { throw "Cloudflare tunnel URL was not found. Check $stdout and $stderr" }
Write-Host "Updating Supabase parser URL: $url" -ForegroundColor Cyan
npm.cmd exec supabase -- secrets set "STATEMENT_PARSER_URL=$url" "STATEMENT_PARSER_TOKEN=$token"
Write-Host 'Parser and tunnel are ready. Starting Expo...' -ForegroundColor Green
npm.cmd exec expo start -- --clear
