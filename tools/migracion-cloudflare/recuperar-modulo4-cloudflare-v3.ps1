# Academia AG - Utah Driver Success Program V2
# RECUPERACION MODULO 4 v3
# NO sube videos. Recupera C4-01..C4-21 + C4-PROMO ya existentes en Cloudflare.
# Esta version evita operaciones += y no usa el checkpoint anterior para identificar videos.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlPath = Join-Path $ScriptDir 'utah-c4-cloudflare-map.sql'
$RecoveryPath = Join-Path $ScriptDir 'utah-c4-cloudflare-recovery-v3.json'
$MissingPath = Join-Path $ScriptDir 'utah-c4-cloudflare-missing-v3.json'
$DiagnosticPath = Join-Path $ScriptDir 'utah-c4-cloudflare-diagnostic-v3.csv'

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

function Created-Date($Video) {
  try { if ($Video.created) { return [datetime]$Video.created } } catch {}
  try { if ($Video.createdAt) { return [datetime]$Video.createdAt } } catch {}
  return [datetime]::MinValue
}

function Video-SearchText($Video) {
  $parts = [System.Collections.Generic.List[string]]::new()
  try { if ($Video.meta.name) { [void]$parts.Add([string]$Video.meta.name) } } catch {}
  try { if ($Video.meta.filename) { [void]$parts.Add([string]$Video.meta.filename) } } catch {}
  try { if ($Video.name) { [void]$parts.Add([string]$Video.name) } } catch {}
  try { if ($Video.input.name) { [void]$parts.Add([string]$Video.input.name) } } catch {}
  try { [void]$parts.Add(($Video | ConvertTo-Json -Depth 12 -Compress)) } catch {}
  return [string]::Join(' ', $parts.ToArray())
}

function Get-VideoSize($Video) {
  try { if ($null -ne $Video.size) { return [int64]$Video.size } } catch {}
  try { if ($null -ne $Video.input.size) { return [int64]$Video.input.size } } catch {}
  return [int64]0
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - RECUPERAR CLOUDFLARE - MODULO 4 v3' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Esta herramienta NO vuelve a subir videos.' -ForegroundColor Yellow
Write-Host 'Ignora el checkpoint anterior y recupera directamente desde Cloudflare.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }

try {
  Write-Host '1/4 Leyendo videos recientes de Cloudflare Stream...' -ForegroundColor Cyan
  $ListUri = "$($ApiBase)?limit=100"
  $listResponse = Invoke-RestMethod -Method Get -Uri $ListUri -Headers $Headers
  if (-not $listResponse.success) { throw 'Cloudflare rechazo la consulta de videos.' }

  $Videos = [System.Collections.Generic.List[object]]::new()
  foreach ($v in @($listResponse.result)) { [void]$Videos.Add($v) }
  Write-Host ("    Videos inspeccionados: {0}" -f $Videos.Count) -ForegroundColor Green

  $diag = [System.Collections.Generic.List[object]]::new()
  foreach ($v in $Videos) {
    $metaName = ''
    try { $metaName = [string]$v.meta.name } catch {}
    [void]$diag.Add([pscustomobject]@{
      uid=[string]$v.uid
      name=$metaName
      size=(Get-VideoSize $v)
      created=(Created-Date $v)
      state=[string]$v.status.state
    })
  }
  $diag | Export-Csv -LiteralPath $DiagnosticPath -NoTypeInformation -Encoding UTF8

  $Recovered = [System.Collections.Generic.List[object]]::new()
  $Missing = [System.Collections.Generic.List[object]]::new()
  $UsedUids = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

  Write-Host ''
  Write-Host '2/4 Recuperando UID de cada C4...' -ForegroundColor Cyan

  foreach ($item in $Items) {
    $CandidatesByName = [System.Collections.Generic.List[object]]::new()
    foreach ($video in $Videos) {
      $uidCandidate = [string]$video.uid
      if ([string]::IsNullOrWhiteSpace($uidCandidate) -or $UsedUids.Contains($uidCandidate)) { continue }
      $text = Video-SearchText $video
      if ($text.IndexOf($item.FileName, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
          $text.IndexOf($item.Code, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        [void]$CandidatesByName.Add($video)
      }
    }

    $selected = $null
    $source = ''
    if ($CandidatesByName.Count -gt 0) {
      $selected = @($CandidatesByName.ToArray() | Sort-Object -Property @{Expression={ Created-Date $_ };Descending=$true})[0]
      $source = 'name-or-code'
    }

    if ($null -eq $selected) {
      $CandidatesBySize = [System.Collections.Generic.List[object]]::new()
      foreach ($video in $Videos) {
        $uidCandidate = [string]$video.uid
        if ([string]::IsNullOrWhiteSpace($uidCandidate) -or $UsedUids.Contains($uidCandidate)) { continue }
        if ((Get-VideoSize $video) -eq [int64]$item.Size) { [void]$CandidatesBySize.Add($video) }
      }
      if ($CandidatesBySize.Count -gt 0) {
        $selected = @($CandidatesBySize.ToArray() | Sort-Object -Property @{Expression={ Created-Date $_ };Descending=$true})[0]
        $source = 'exact-size'
      }
    }

    if ($null -ne $selected -and -not [string]::IsNullOrWhiteSpace([string]$selected.uid)) {
      $uid = [string]$selected.uid
      [void]$UsedUids.Add($uid)
      [void]$Recovered.Add([pscustomobject]@{
        code=$item.Code
        file=$item.FileName
        uid=$uid
        source=$source
      })
      Write-Host ("    {0} -> UID {1} [{2}]" -f $item.Code,$uid,$source) -ForegroundColor Green
    } else {
      [void]$Missing.Add([pscustomobject]@{
        code=$item.Code
        file=$item.FileName
        expected_size=[int64]$item.Size
      })
      Write-Host ("    {0} -> NO ENCONTRADO" -f $item.Code) -ForegroundColor Red
    }
  }

  $Recovered | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RecoveryPath -Encoding UTF8
  $Missing | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $MissingPath -Encoding UTF8

  Write-Host ''
  Write-Host ("    Recuperados: {0}/22" -f $Recovered.Count) -ForegroundColor $(if($Recovered.Count -eq 22){'Green'}else{'Yellow'})

  if ($Missing.Count -gt 0) {
    Write-Host ''
    Write-Host 'No se subio ningun archivo.' -ForegroundColor Yellow
    Write-Host ('Faltan: ' + [string]::Join(', ', @($Missing | ForEach-Object { $_.code }))) -ForegroundColor Yellow
    Write-Host "Diagnostico: $DiagnosticPath" -ForegroundColor Yellow
    Write-Host "Faltantes: $MissingPath" -ForegroundColor Yellow
    exit 2
  }

  $UidByCode = @{}
  foreach ($r in $Recovered) { $UidByCode[[string]$r.code] = [string]$r.uid }

  Write-Host ''
  Write-Host '3/4 Verificando que los 22 videos esten READY...' -ForegroundColor Cyan
  $Rows = [System.Collections.Generic.List[object]]::new()
  $deadline = (Get-Date).AddMinutes(35)
  foreach ($item in $Items) {
    $uid = [string]$UidByCode[$item.Code]
    while ($true) {
      if ((Get-Date) -gt $deadline) { throw "Timeout esperando READY para $($item.Code)" }
      $response = Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$uid" -Headers $Headers
      if (-not $response.success) { throw "No se pudo consultar $($item.Code)" }
      $video = $response.result
      if ($video.status.state -eq 'error') { throw "Cloudflare marco error en $($item.Code): $($video.status.errorReasonText)" }
      if ($video.readyToStream -eq $true -or $video.status.state -eq 'ready') {
        $duration = 0
        if ($null -ne $video.duration) { $duration = [math]::Ceiling([double]$video.duration) }
        [void]$Rows.Add([pscustomobject]@{
          lesson_code=$item.Code
          uid=[string]$video.uid
          hls=[string]$video.playback.hls
          dash=[string]$video.playback.dash
          thumbnail=[string]$video.thumbnail
          duration_seconds=[int]$duration
        })
        Write-Host ("    {0} READY ({1} s)" -f $item.Code,$duration) -ForegroundColor Green
        break
      }
      Start-Sleep -Seconds 5
    }
  }

  Write-Host ''
  Write-Host '4/4 Generando SQL FINAL para Supabase...' -ForegroundColor Cyan
  $sql = [System.Collections.Generic.List[string]]::new()
  [void]$sql.Add('-- Academia AG · Utah Driver V2 · Modulo 4 · Cloudflare Stream')
  [void]$sql.Add('-- Recuperacion v3: no vuelve a subir videos.')
  [void]$sql.Add('begin;')
  [void]$sql.Add('')
  foreach ($row in ($Rows.ToArray() | Sort-Object lesson_code)) {
    [void]$sql.Add('update public.lessons')
    [void]$sql.Add('set')
    [void]$sql.Add('  video_url = null,')
    [void]$sql.Add("  stream_provider = 'cloudflare',")
    [void]$sql.Add("  stream_uid = $(Sql-Lit $row.uid),")
    [void]$sql.Add("  stream_hls_url = $(Sql-Lit $row.hls),")
    [void]$sql.Add("  stream_dash_url = $(Sql-Lit $row.dash),")
    [void]$sql.Add("  stream_thumbnail_url = $(Sql-Lit $row.thumbnail),")
    [void]$sql.Add("  stream_duration_seconds = $($row.duration_seconds),")
    [void]$sql.Add('  updated_at = now()')
    [void]$sql.Add("where module_id = '$ModuleId'::uuid")
    [void]$sql.Add("  and lesson_code = '$($row.lesson_code)';")
    [void]$sql.Add('')
  }
  [void]$sql.Add('commit;')
  [void]$sql.Add('')
  [void]$sql.Add('-- VERIFICACION: debe regresar 21 / 1 / 0.')
  [void]$sql.Add('select')
  [void]$sql.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and stream_uid is not null) as c4_con_stream,")
  [void]$sql.Add("  count(*) filter (where lesson_code = 'C4-PROMO' and stream_uid is not null) as promo_con_stream,")
  [void]$sql.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and video_url is not null) as legacy_restante")
  [void]$sql.Add('from public.lessons')
  [void]$sql.Add("where module_id = '$ModuleId'::uuid;")
  $sql.ToArray() | Set-Content -LiteralPath $SqlPath -Encoding UTF8

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
