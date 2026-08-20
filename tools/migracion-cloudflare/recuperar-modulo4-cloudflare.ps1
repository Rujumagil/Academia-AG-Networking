# Academia AG - Utah Driver Success Program V2
# RECUPERACION MODULO 4
# Recupera UIDs de C4-01 a C4-21 + C4-PROMO que YA fueron subidos a Cloudflare.
# NO sube videos nuevos. Evita duplicados despues del error de return [string].

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c4-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-c4-cloudflare-map.sql'
$RecoveryPath = Join-Path $ScriptDir 'utah-c4-cloudflare-recovery.json'
$MissingPath = Join-Path $ScriptDir 'utah-c4-cloudflare-missing.json'

$Items = @(
  [pscustomobject]@{Code='C4-01';FileName='C4-01.mp4'},
  [pscustomobject]@{Code='C4-02';FileName='C4-02.mp4'},
  [pscustomobject]@{Code='C4-03';FileName='C4-03.mp4'},
  [pscustomobject]@{Code='C4-04';FileName='C4-04.mp4'},
  [pscustomobject]@{Code='C4-05';FileName='C4-05.mp4'},
  [pscustomobject]@{Code='C4-06';FileName='C4-06.mp4'},
  [pscustomobject]@{Code='C4-07';FileName='C4-07.mp4'},
  [pscustomobject]@{Code='C4-08';FileName='C4-08.mp4'},
  [pscustomobject]@{Code='C4-09';FileName='C4-09.mp4'},
  [pscustomobject]@{Code='C4-10';FileName='C4-10.mp4'},
  [pscustomobject]@{Code='C4-11';FileName='C4-11.mp4'},
  [pscustomobject]@{Code='C4-12';FileName='C4-12.mp4'},
  [pscustomobject]@{Code='C4-13';FileName='C4-13.mp4'},
  [pscustomobject]@{Code='C4-14';FileName='C4-14.mp4'},
  [pscustomobject]@{Code='C4-15';FileName='C4-15.mp4'},
  [pscustomobject]@{Code='C4-16';FileName='C4-16.mp4'},
  [pscustomobject]@{Code='C4-17';FileName='C4-17.mp4'},
  [pscustomobject]@{Code='C4-18';FileName='C4-18.mp4'},
  [pscustomobject]@{Code='C4-19';FileName='C4-19.mp4'},
  [pscustomobject]@{Code='C4-20';FileName='C4-20.mp4'},
  [pscustomobject]@{Code='C4-21';FileName='C4-21.mp4'},
  [pscustomobject]@{Code='C4-PROMO';FileName='C4-PROMO.mp4'}
)

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Sql-Lit([string]$Value) {
  if ($null -eq $Value) { return 'null' }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Get-VideoText($Video) {
  try { return ($Video | ConvertTo-Json -Depth 15 -Compress) }
  catch { return [string]$Video }
}

function Get-CreatedValue($Video) {
  try {
    if ($Video.created) { return [datetime]$Video.created }
    if ($Video.createdAt) { return [datetime]$Video.createdAt }
  } catch {}
  return [datetime]::MinValue
}

function Save-Checkpoint($Map) {
  $out = @{}
  foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
  $out | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Load-Checkpoint {
  $map = @{}
  if (Test-Path -LiteralPath $CheckpointPath) {
    try {
      $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
    } catch {}
  }
  return $map
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - RECUPERAR CLOUDFLARE - MODULO 4' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'IMPORTANTE: esta herramienta NO vuelve a subir videos.' -ForegroundColor Yellow
Write-Host 'Busca los 22 videos que ya subio el proceso anterior y recupera sus UID.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }

try {
  Write-Host '1/4 Leyendo los videos recientes de Cloudflare Stream...' -ForegroundColor Cyan
  $listResponse = Invoke-RestMethod -Method Get -Uri "$ApiBase?limit=100" -Headers $Headers
  if (-not $listResponse.success) { throw 'Cloudflare rechazo la consulta de videos.' }
  $Videos = @($listResponse.result)
  Write-Host ("    Videos inspeccionados: {0}" -f $Videos.Count) -ForegroundColor Green

  $Map = Load-Checkpoint
  $Recovered = @()
  $Missing = @()

  Write-Host ''
  Write-Host '2/4 Recuperando UID por nombre/codigo...' -ForegroundColor Cyan
  foreach ($item in $Items) {
    $existingUid = $null
    if ($Map.ContainsKey($item.Code)) {
      try { $existingUid = [string]$Map[$item.Code].uid } catch {}
    }

    if (-not [string]::IsNullOrWhiteSpace($existingUid)) {
      try {
        $check = Invoke-RestMethod -Method Get -Uri "$ApiBase/$existingUid" -Headers $Headers
        if ($check.success -and $check.result.uid) {
          $Recovered += [pscustomobject]@{ code=$item.Code; uid=[string]$check.result.uid; source='checkpoint' }
          Write-Host ("    {0} -> UID {1} (checkpoint)" -f $item.Code,$existingUid) -ForegroundColor DarkGray
          continue
        }
      } catch {}
    }

    $matches = @()
    foreach ($video in $Videos) {
      $text = Get-VideoText $video
      if ($text -match [regex]::Escape($item.FileName) -or $text -match ('(?i)(^|[^0-9A-Z])' + [regex]::Escape($item.Code) + '([^0-9A-Z]|$)')) {
        $matches += $video
      }
    }

    if ($matches.Count -gt 0) {
      $selected = @($matches | Sort-Object @{Expression={ Get-CreatedValue $_ };Descending=$true})[0]
      $uid = [string]$selected.uid
      if (-not [string]::IsNullOrWhiteSpace($uid)) {
        $Map[$item.Code] = [pscustomobject]@{
          code = $item.Code
          uid = $uid
          sourceName = $item.FileName
          recovered = $true
          recoveredUtc = [DateTime]::UtcNow.ToString('o')
        }
        Save-Checkpoint $Map
        $Recovered += [pscustomobject]@{ code=$item.Code; uid=$uid; source='cloudflare-list' }
        Write-Host ("    {0} -> UID {1} RECUPERADO" -f $item.Code,$uid) -ForegroundColor Green
        continue
      }
    }

    $Missing += [pscustomobject]@{ code=$item.Code; file=$item.FileName }
    Write-Host ("    {0} -> NO ENCONTRADO" -f $item.Code) -ForegroundColor Red
  }

  $Recovered | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RecoveryPath -Encoding UTF8
  $Missing | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $MissingPath -Encoding UTF8

  Write-Host ''
  Write-Host ("    Recuperados: {0}/22" -f $Recovered.Count) -ForegroundColor $(if($Recovered.Count -eq 22){'Green'}else{'Yellow'})

  if ($Missing.Count -gt 0) {
    Write-Host ''
    Write-Host 'SEGURIDAD: no se subira nada automaticamente para evitar duplicados.' -ForegroundColor Yellow
    Write-Host ('Faltan por identificar: ' + (($Missing | ForEach-Object {$_.code}) -join ', ')) -ForegroundColor Yellow
    Write-Host "Archivo de faltantes: $MissingPath" -ForegroundColor Yellow
    exit 2
  }

  Write-Host ''
  Write-Host '3/4 Esperando a que los 22 videos queden READY...' -ForegroundColor Cyan
  $Rows = @()
  $deadline = (Get-Date).AddMinutes(35)
  foreach ($item in $Items) {
    $uid = [string]$Map[$item.Code].uid
    while ($true) {
      if ((Get-Date) -gt $deadline) { throw "Timeout esperando READY para $($item.Code)" }
      $response = Invoke-RestMethod -Method Get -Uri "$ApiBase/$uid" -Headers $Headers
      if (-not $response.success) { throw "No se pudo consultar $($item.Code)" }
      $video = $response.result
      if ($video.status.state -eq 'error') { throw "Cloudflare marco error en $($item.Code): $($video.status.errorReasonText)" }
      if ($video.readyToStream -eq $true -or $video.status.state -eq 'ready') {
        $duration = 0
        if ($null -ne $video.duration) { $duration = [math]::Ceiling([double]$video.duration) }
        $Rows += [pscustomobject]@{
          lesson_code = $item.Code
          uid = [string]$video.uid
          hls = [string]$video.playback.hls
          dash = [string]$video.playback.dash
          thumbnail = [string]$video.thumbnail
          duration_seconds = [int]$duration
        }
        Write-Host ("    {0} READY ({1} s)" -f $item.Code,$duration) -ForegroundColor Green
        break
      }
      Start-Sleep -Seconds 5
    }
  }

  Write-Host ''
  Write-Host '4/4 Generando SQL FINAL para Supabase...' -ForegroundColor Cyan
  $sql = [System.Collections.Generic.List[string]]::new()
  $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 4 · Cloudflare Stream')
  $sql.Add('-- Recuperado sin volver a subir videos.')
  $sql.Add('begin;')
  $sql.Add('')
  foreach ($row in ($Rows | Sort-Object lesson_code)) {
    $sql.Add('update public.lessons')
    $sql.Add('set')
    $sql.Add('  video_url = null,')
    $sql.Add("  stream_provider = 'cloudflare',")
    $sql.Add("  stream_uid = $(Sql-Lit $row.uid),")
    $sql.Add("  stream_hls_url = $(Sql-Lit $row.hls),")
    $sql.Add("  stream_dash_url = $(Sql-Lit $row.dash),")
    $sql.Add("  stream_thumbnail_url = $(Sql-Lit $row.thumbnail),")
    $sql.Add("  stream_duration_seconds = $($row.duration_seconds),")
    $sql.Add('  updated_at = now()')
    $sql.Add("where module_id = '$ModuleId'::uuid")
    $sql.Add("  and lesson_code = '$($row.lesson_code)';")
    $sql.Add('')
  }
  $sql.Add('commit;')
  $sql.Add('')
  $sql.Add('-- VERIFICACION: debe regresar 21 / 1 / 0.')
  $sql.Add('select')
  $sql.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and stream_uid is not null) as c4_con_stream,")
  $sql.Add("  count(*) filter (where lesson_code = 'C4-PROMO' and stream_uid is not null) as promo_con_stream,")
  $sql.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and video_url is not null) as legacy_restante")
  $sql.Add('from public.lessons')
  $sql.Add("where module_id = '$ModuleId'::uuid;")
  $sql | Set-Content -LiteralPath $SqlPath -Encoding UTF8

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor DarkGreen
  Write-Host ' MODULO 4 RECUPERADO CORRECTAMENTE' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor DarkGreen
  Write-Host 'Videos recuperados: 22/22' -ForegroundColor Green
  Write-Host 'Lecciones: 21/21' -ForegroundColor Green
  Write-Host 'Contenido especial: 1/1' -ForegroundColor Green
  Write-Host "SQL FINAL: $SqlPath" -ForegroundColor Cyan
  exit 0
}
catch {
  Write-Host ''
  Write-Host 'ERROR GENERAL:' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'No vuelvas a ejecutar el migrador original por ahora.' -ForegroundColor Yellow
  exit 1
}
