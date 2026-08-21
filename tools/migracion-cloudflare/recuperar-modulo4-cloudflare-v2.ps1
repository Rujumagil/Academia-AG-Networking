# Academia AG - Utah Driver Success Program V2
# RECUPERACION MODULO 4 v2
# NO sube videos. Recupera C4-01..C4-21 + C4-PROMO ya existentes en Cloudflare.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c4-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-c4-cloudflare-map.sql'
$RecoveryPath = Join-Path $ScriptDir 'utah-c4-cloudflare-recovery-v2.json'
$MissingPath = Join-Path $ScriptDir 'utah-c4-cloudflare-missing-v2.json'

# Size corresponde al archivo fuente de Google Drive. Sirve como segundo identificador
# si Cloudflare no conserva el nombre original en meta.name.
$Items = @(
  [pscustomobject]@{Code='C4-01';FileName='C4-01.mp4';Size=2149810},
  [pscustomobject]@{Code='C4-02';FileName='C4-02.mp4';Size=2056351},
  [pscustomobject]@{Code='C4-03';FileName='C4-03.mp4';Size=2378469},
  [pscustomobject]@{Code='C4-04';FileName='C4-04.mp4';Size=2009449},
  [pscustomobject]@{Code='C4-05';FileName='C4-05.mp4';Size=1999562},
  [pscustomobject]@{Code='C4-06';FileName='C4-06.mp4';Size=1658653},
  [pscustomobject]@{Code='C4-07';FileName='C4-07.mp4';Size=2535306},
  [pscustomobject]@{Code='C4-08';FileName='C4-08.mp4';Size=2204385},
  [pscustomobject]@{Code='C4-09';FileName='C4-09.mp4';Size=1961431},
  [pscustomobject]@{Code='C4-10';FileName='C4-10.mp4';Size=2133509},
  [pscustomobject]@{Code='C4-11';FileName='C4-11.mp4';Size=2306431},
  [pscustomobject]@{Code='C4-12';FileName='C4-12.mp4';Size=2212407},
  [pscustomobject]@{Code='C4-13';FileName='C4-13.mp4';Size=2213918},
  [pscustomobject]@{Code='C4-14';FileName='C4-14.mp4';Size=1726605},
  [pscustomobject]@{Code='C4-15';FileName='C4-15.mp4';Size=2646928},
  [pscustomobject]@{Code='C4-16';FileName='C4-16.mp4';Size=2563774},
  [pscustomobject]@{Code='C4-17';FileName='C4-17.mp4';Size=2447393},
  [pscustomobject]@{Code='C4-18';FileName='C4-18.mp4';Size=2430850},
  [pscustomobject]@{Code='C4-19';FileName='C4-19.mp4';Size=2555842},
  [pscustomobject]@{Code='C4-20';FileName='C4-20.mp4';Size=2106275},
  [pscustomobject]@{Code='C4-21';FileName='C4-21.mp4';Size=2342648},
  [pscustomobject]@{Code='C4-PROMO';FileName='C4-PROMO.mp4';Size=2166252}
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

function Video-Json($Video) {
  try { return ($Video | ConvertTo-Json -Depth 15 -Compress) }
  catch { return [string]$Video }
}

function Created-Date($Video) {
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
Write-Host ' ACADEMIA AG - RECUPERAR CLOUDFLARE - MODULO 4 v2' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Esta herramienta NO vuelve a subir videos.' -ForegroundColor Yellow
Write-Host 'Identifica los videos por nombre/codigo y, si hace falta, por tamano exacto.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }

try {
  Write-Host '1/4 Leyendo videos recientes de Cloudflare Stream...' -ForegroundColor Cyan
  # Importante: $($ApiBase) evita que PowerShell interprete ?limit como parte del nombre de variable.
  $ListUri = "$($ApiBase)?limit=100"
  $listResponse = Invoke-RestMethod -Method Get -Uri $ListUri -Headers $Headers
  if (-not $listResponse.success) { throw 'Cloudflare rechazo la consulta de videos.' }
  $Videos = @($listResponse.result)
  Write-Host ("    Videos inspeccionados: {0}" -f $Videos.Count) -ForegroundColor Green

  $Map = Load-Checkpoint
  $Recovered = @()
  $Missing = @()
  $UsedUids = @{}

  Write-Host ''
  Write-Host '2/4 Recuperando UID de cada C4...' -ForegroundColor Cyan
  foreach ($item in $Items) {
    $selected = $null
    $source = $null

    # 1) UID previo valido en checkpoint.
    if ($Map.ContainsKey($item.Code)) {
      $existingUid = $null
      try { $existingUid = [string]$Map[$item.Code].uid } catch {}
      if (-not [string]::IsNullOrWhiteSpace($existingUid)) {
        try {
          $check = Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$existingUid" -Headers $Headers
          if ($check.success -and $check.result.uid) {
            $selected = $check.result
            $source = 'checkpoint'
          }
        } catch {}
      }
    }

    # 2) Coincidencia por nombre o codigo dentro del JSON de Cloudflare.
    if ($null -eq $selected) {
      $matches = @()
      foreach ($video in $Videos) {
        $uidCandidate = [string]$video.uid
        if ($UsedUids.ContainsKey($uidCandidate)) { continue }
        $text = Video-Json $video
        if ($text -match [regex]::Escape($item.FileName) -or $text -match ('(?i)(^|[^0-9A-Z])' + [regex]::Escape($item.Code) + '([^0-9A-Z]|$)')) {
          $matches += $video
        }
      }
      if ($matches.Count -gt 0) {
        $selected = @($matches | Sort-Object @{Expression={ Created-Date $_ };Descending=$true})[0]
        $source = 'name-or-code'
      }
    }

    # 3) Coincidencia por tamano exacto del archivo original.
    if ($null -eq $selected) {
      $sizeMatches = @()
      foreach ($video in $Videos) {
        $uidCandidate = [string]$video.uid
        if ($UsedUids.ContainsKey($uidCandidate)) { continue }
        $videoSize = 0
        try { $videoSize = [int64]$video.size } catch {}
        if ($videoSize -eq [int64]$item.Size) { $sizeMatches += $video }
      }
      if ($sizeMatches.Count -eq 1) {
        $selected = $sizeMatches[0]
        $source = 'exact-size'
      } elseif ($sizeMatches.Count -gt 1) {
        $selected = @($sizeMatches | Sort-Object @{Expression={ Created-Date $_ };Descending=$true})[0]
        $source = 'exact-size-newest'
      }
    }

    if ($null -ne $selected -and -not [string]::IsNullOrWhiteSpace([string]$selected.uid)) {
      $uid = [string]$selected.uid
      $UsedUids[$uid] = $true
      $Map[$item.Code] = [pscustomobject]@{
        code = $item.Code
        uid = $uid
        sourceName = $item.FileName
        expectedSize = [int64]$item.Size
        recoverySource = $source
        recovered = $true
        recoveredUtc = [DateTime]::UtcNow.ToString('o')
      }
      Save-Checkpoint $Map
      $Recovered += [pscustomobject]@{code=$item.Code;uid=$uid;source=$source}
      Write-Host ("    {0} -> UID {1} [{2}]" -f $item.Code,$uid,$source) -ForegroundColor Green
    } else {
      $Missing += [pscustomobject]@{code=$item.Code;file=$item.FileName;expected_size=$item.Size}
      Write-Host ("    {0} -> NO ENCONTRADO" -f $item.Code) -ForegroundColor Red
    }
  }

  $Recovered | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RecoveryPath -Encoding UTF8
  $Missing | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $MissingPath -Encoding UTF8

  Write-Host ''
  Write-Host ("    Recuperados: {0}/22" -f $Recovered.Count) -ForegroundColor $(if($Recovered.Count -eq 22){'Green'}else{'Yellow'})

  if ($Missing.Count -gt 0) {
    Write-Host ''
    Write-Host 'No se subira ningun archivo para evitar duplicados.' -ForegroundColor Yellow
    Write-Host ('Faltan: ' + (($Missing | ForEach-Object {$_.code}) -join ', ')) -ForegroundColor Yellow
    Write-Host "Detalle: $MissingPath" -ForegroundColor Yellow
    exit 2
  }

  Write-Host ''
  Write-Host '3/4 Verificando que los 22 videos esten READY...' -ForegroundColor Cyan
  $Rows = @()
  $deadline = (Get-Date).AddMinutes(35)
  foreach ($item in $Items) {
    $uid = [string]$Map[$item.Code].uid
    while ($true) {
      if ((Get-Date) -gt $deadline) { throw "Timeout esperando READY para $($item.Code)" }
      $response = Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$uid" -Headers $Headers
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
  $sql.Add('-- Recuperacion v2: no vuelve a subir videos.')
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
  Write-Host 'No se subio ningun video durante esta recuperacion.' -ForegroundColor Yellow
  exit 1
}
