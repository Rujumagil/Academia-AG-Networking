# Academia AG - Utah Driver Success Program V2
# Finalizador seguro del Modulo 2: checkpoint -> Cloudflare READY -> SQL Supabase
# No descarga ni vuelve a subir videos.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c2-cloudflare-checkpoint.json'
$CsvPath = Join-Path $ScriptDir 'utah-c2-cloudflare-map.csv'
$SqlPath = Join-Path $ScriptDir 'utah-c2-cloudflare-map.sql'
$ReportPath = Join-Path $ScriptDir 'utah-c2-cloudflare-report.json'
$ErrorsPath = Join-Path $ScriptDir 'utah-c2-cloudflare-errors.json'

$Codes = @(
  'C2-01','C2-02','C2-03','C2-04','C2-05','C2-06','C2-07','C2-08','C2-09',
  'C2-10','C2-11','C2-12','C2-13','C2-14','C2-15','C2-16','C2-17','C2-18','C2-PROMO'
)

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Load-Checkpoint {
    if (-not (Test-Path -LiteralPath $CheckpointPath)) {
        throw "No se encontro c2-cloudflare-checkpoint.json en $ScriptDir"
    }
    $map = @{}
    $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
    return $map
}

function Save-Checkpoint($Map) {
    $out = @{}
    foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
    $out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Get-SqlLiteral([string]$Value) {
    if ($null -eq $Value) { return 'null' }
    return "'" + $Value.Replace("'", "''") + "'"
}

function Get-HttpErrorDetail($ErrorRecord) {
    $parts = @()
    try { if ($ErrorRecord.ErrorDetails.Message) { $parts += [string]$ErrorRecord.ErrorDetails.Message } } catch {}
    try { if ($ErrorRecord.Exception.Message) { $parts += [string]$ErrorRecord.Exception.Message } } catch {}
    $parts = @($parts | Where-Object { $_ } | Select-Object -Unique)
    if ($parts.Count -eq 0) { return 'Error sin detalle adicional.' }
    return ($parts -join ' | ')
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - FINALIZAR MIGRACION CLOUDFLARE - MODULO 2' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Este proceso NO vuelve a subir videos.' -ForegroundColor Yellow
Write-Host 'Usara los 19 UID guardados en c2-cloudflare-checkpoint.json.' -ForegroundColor Cyan
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara en pantalla)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
$ExitCode = 0

try {
    $Checkpoint = Load-Checkpoint
    $missingUid = @($Codes | Where-Object { -not $Checkpoint.ContainsKey($_) -or -not $Checkpoint[$_].uid })
    if ($missingUid.Count -gt 0) {
        throw ("Faltan UID en el checkpoint: {0}" -f ($missingUid -join ', '))
    }

    Write-Host '1/3 Validando token...' -ForegroundColor Cyan
    $probeUid = [string]$Checkpoint['C2-01'].uid
    $probe = Invoke-RestMethod -Method Get -Uri "$ApiBase/$probeUid" -Headers $Headers
    if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
    Write-Host '    Token valido.' -ForegroundColor Green

    Write-Host ''
    Write-Host '2/3 Verificando los 19 videos en Cloudflare...' -ForegroundColor Cyan
    $rows = @()
    $errors = @()
    $deadline = (Get-Date).AddMinutes(20)

    foreach ($code in $Codes) {
        $entry = $Checkpoint[$code]
        $uid = [string]$entry.uid
        while ($true) {
            if ((Get-Date) -gt $deadline) {
                $errors += [pscustomobject]@{ lesson_code=$code; uid=$uid; error='Tiempo de espera agotado antes de READY.' }
                Write-Host ("    {0}: PENDIENTE" -f $code) -ForegroundColor Yellow
                break
            }
            try {
                $response = Invoke-RestMethod -Method Get -Uri "$ApiBase/$uid" -Headers $Headers
                if (-not $response.success) { throw 'Cloudflare devolvio success=false.' }
                $v = $response.result
                $state = [string]$v.status.state
                if ($state -eq 'error') {
                    $reason = [string]$v.status.errorReasonText
                    if ([string]::IsNullOrWhiteSpace($reason)) { $reason = 'Cloudflare marco el video como error.' }
                    throw $reason
                }
                if ($v.readyToStream -eq $true -or $state -eq 'ready') {
                    $duration = 0
                    if ($null -ne $v.duration) { $duration = [math]::Ceiling([double]$v.duration) }
                    $rows += [pscustomobject]@{
                        lesson_code = $code
                        title = [string]$entry.title
                        uid = [string]$v.uid
                        hls = [string]$v.playback.hls
                        dash = [string]$v.playback.dash
                        thumbnail = [string]$v.thumbnail
                        duration_seconds = [int]$duration
                        source_name = [string]$entry.sourceName
                    }
                    $entry | Add-Member -NotePropertyName durationSeconds -NotePropertyValue ([int]$duration) -Force
                    $entry | Add-Member -NotePropertyName lastVerifiedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
                    Save-Checkpoint $Checkpoint
                    Write-Host ("    {0} READY ({1}s)" -f $code,$duration) -ForegroundColor Green
                    break
                }
                $pct = [string]$v.status.pctComplete
                if ([string]::IsNullOrWhiteSpace($pct)) { $pct = '?' }
                Write-Host ("    {0}: {1} {2}%" -f $code,$state,$pct) -ForegroundColor DarkGray
                Start-Sleep -Seconds 5
            }
            catch {
                $detail = Get-HttpErrorDetail $_
                $errors += [pscustomobject]@{ lesson_code=$code; uid=$uid; error=$detail }
                Write-Host ("    {0}: ERROR - {1}" -f $code,$detail) -ForegroundColor Red
                break
            }
        }
    }

    if ($errors.Count -gt 0) {
        $errors | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8
        Write-Host ''
        Write-Host 'Hay videos pendientes o con error. No se genero el SQL final.' -ForegroundColor Yellow
        Write-Host ("Revisa: {0}" -f $ErrorsPath)
        $ExitCode = 2
    }
    elseif ($rows.Count -ne 19) {
        throw ("Se esperaban 19 videos READY y se obtuvieron {0}." -f $rows.Count)
    }
    else {
        Write-Host ''
        Write-Host '3/3 Generando CSV, reporte y SQL final para Supabase...' -ForegroundColor Cyan
        $rows | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8
        $rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
        '[]' | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8

        $sql = New-Object System.Collections.Generic.List[string]
        $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 2 · Cloudflare Stream')
        $sql.Add('-- Generado por finalizar-modulo2-cloudflare.ps1')
        $sql.Add('-- Incluye C2-01 a C2-18 y C2-PROMO.')
        $sql.Add('')
        $sql.Add('begin;')
        $sql.Add('')
        foreach ($row in $rows) {
            $sql.Add('update public.lessons')
            $sql.Add('set')
            $sql.Add('  video_url = null,')
            $sql.Add("  stream_provider = 'cloudflare',")
            $sql.Add("  stream_uid = $(Get-SqlLiteral $row.uid),")
            $sql.Add("  stream_hls_url = $(Get-SqlLiteral $row.hls),")
            $sql.Add("  stream_dash_url = $(Get-SqlLiteral $row.dash),")
            $sql.Add("  stream_thumbnail_url = $(Get-SqlLiteral $row.thumbnail),")
            $sql.Add("  stream_duration_seconds = $($row.duration_seconds),")
            $sql.Add('  updated_at = now()')
            $sql.Add("where module_id = '$ModuleId'::uuid")
            $sql.Add("  and lesson_code = '$($row.lesson_code)';")
            $sql.Add('')
        }
        $sql.Add('commit;')
        $sql.Add('')
        $sql.Add('-- VERIFICACION: debe regresar 18 / 1 / 0.')
        $sql.Add('select')
        $sql.Add("  count(*) filter (where lesson_code ~ '^C2-[0-9]{2}$' and stream_uid is not null) as c2_con_stream,")
        $sql.Add("  count(*) filter (where lesson_code = 'C2-PROMO' and stream_uid is not null) as promo_con_stream,")
        $sql.Add("  count(*) filter (where lesson_code ~ '^C2-[0-9]{2}$' and video_url is not null) as legacy_restante")
        $sql.Add('from public.lessons')
        $sql.Add("where module_id = '$ModuleId'::uuid;")
        $sql.Add('')
        $sql.Add('select lesson_code, title, stream_uid, stream_duration_seconds')
        $sql.Add('from public.lessons')
        $sql.Add("where module_id = '$ModuleId'::uuid")
        $sql.Add("  and (lesson_code ~ '^C2-[0-9]{2}$' or lesson_code = 'C2-PROMO')")
        $sql.Add('order by lesson_code;')
        $sql | Set-Content -LiteralPath $SqlPath -Encoding UTF8

        Write-Host ''
        Write-Host 'MIGRACION COMPLETA.' -ForegroundColor Green
        Write-Host '    Videos listos: 19/19' -ForegroundColor Green
        Write-Host '    Lecciones: 18/18' -ForegroundColor Green
        Write-Host '    Contenido especial: 1/1' -ForegroundColor Green
        Write-Host ("    SQL FINAL: {0}" -f $SqlPath) -ForegroundColor Green
        $ExitCode = 0
    }
}
catch {
    $detail = Get-HttpErrorDetail $_
    Write-Host ''
    Write-Host 'ERROR GENERAL:' -ForegroundColor Red
    Write-Host $detail -ForegroundColor Red
    Write-Host ''
    Write-Host 'No borres c2-cloudflare-checkpoint.json.' -ForegroundColor Yellow
    $ExitCode = 1
}
finally {
    $Token = $null
    if ($secureToken) { $secureToken.Dispose() }
    [GC]::Collect()
}

exit $ExitCode
