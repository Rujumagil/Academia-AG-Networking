# Academia AG - Utah Driver Success Program V2
# Modulo 5: C5-01 a C5-20 + C5-PROMO
# Google Drive -> PC temporal -> Cloudflare Stream -> SQL Supabase
# Nota: "Clase 5 - Video completo.mp4" se conserva en Drive como master y NO forma parte de los 21 slots V2.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c5-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-c5-cloudflare-map.sql'
$PartialSqlPath = Join-Path $ScriptDir 'utah-c5-cloudflare-map-PARCIAL.sql'
$ErrorsPath = Join-Path $ScriptDir 'utah-c5-cloudflare-errors.json'
$TempDir = Join-Path $env:TEMP 'academia-ag-c5-cloudflare'

$Items = @(
  [pscustomobject]@{Code='C5-01';Title='Introduccion: Alcohol, drogas y retos al manejar';DriveId='1CQ21x29PRn0djt4DPtCI94hOvKPT5r6t';FileName='C5-01.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-02';Title='El Deterioro Comienza Desde la Primera Bebida';DriveId='1Nc8P9avPEx8O8-m5R0LEDMzlxD8ci3gH';FileName='C5-02.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-03';Title='No Todas las Drogas Son Ilegales';DriveId='1TBMWJXZ-X1kmnflggo1O92GV2ehq3IUd';FileName='C5-03.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-04';Title='Tus Emociones Tambien Influyen';DriveId='1NS_ElunYwqGyMnXYvTJuDxefSfhU5qsc';FileName='C5-04.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-05';Title='Utah: BAC de 0.05%';DriveId='1MbthxQpRAOS87-Dym2cOXbkLcwnmAjBk';FileName='C5-05.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-06';Title='Not-A-Drop: Menores de 21 Anos';DriveId='1tGyA87MyHXKLaHHORlU-dh98LetufoK6';FileName='C5-06.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-07';Title='DUI: Las Consecuencias Pueden Durar Anos';DriveId='1PnxiKIzdIOY7Ap5Ru-aNi_sGttreyIPl';FileName='C5-07.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-08';Title='Una Distraccion Puede Cambiarlo Todo';DriveId='1QGHTb86OlrsQCtsB0JBVBaPfsatBA72u';FileName='C5-08.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-09';Title='Celular y Manejo: Evita el Uso Manual';DriveId='10HOJqNBEx4gY2DNtXlFEMXGZTrK9mXmb';FileName='C5-09.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-10';Title='Aggressive Driving y Road Rage';DriveId='15aMP7f4VCkbPAz2ivFmux_HwL5Z2iYaR';FileName='C5-10.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-11';Title='Fatiga: No Confies en tu Fuerza de Voluntad';DriveId='19YLCYuSU5dneEU8kkOe58yyJN6DhkWvt';FileName='C5-11.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-12';Title='Antes de un Road Trip';DriveId='1cA6PDMsGIXNe8foM3rsYQwug9qQxL8lW';FileName='C5-12.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-13';Title='Zonas de Construccion';DriveId='1Io71pUFS3JulO_-DjJNe3CSzdi_4jhw9';FileName='C5-13.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-14';Title='Manejo Nocturno';DriveId='10IsNZh77U_p2AWYlasrJ10PdNQScIycy';FileName='C5-14.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-15';Title='Caminos Rurales y Grava';DriveId='1AhwHeBCq6cX52a2alyY3i1MFoefMR4-s';FileName='C5-15.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-16';Title='Derrapes e Hidroplaneo';DriveId='1PAnn_LCdeaA5s1F2z4uiNk4HreyX1qPG';FileName='C5-16.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-17';Title='Actividad: Tu Plan Personal de Prevencion';DriveId='1SIzVukxD162_qyOPp7q-iET46ajsyP4M';FileName='C5-17.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-18';Title='Caso Practico: Manejar o Esperar';DriveId='1ISgaVQk6PNDlejlKMFJEqi-bb131v-qs';FileName='C5-18.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-19';Title='Resumen: La Seguridad Comienza Antes de Manejar';DriveId='1OQDRtlqNpKReBGd6G42cuA4cRRcsfHI7';FileName='C5-19.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-20';Title='Extra';DriveId='1U_SYS3UppMssbx0hJtc-5lJrP_IVE5uW';FileName='C5-20.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C5-PROMO';Title='Contenido especial del modulo';DriveId='1sswfUOe0qwU6R3nhqetgkWS81fC6U2es';FileName='C5-PROMO.mov';MimeType='video/quicktime'}
)

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-SqlLiteral([string]$Value) {
  if ($null -eq $Value) { return 'null' }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Get-ErrorDetail($ErrorRecord) {
  $parts = New-Object System.Collections.Generic.List[string]
  try {
    if ($ErrorRecord.ErrorDetails -and -not [string]::IsNullOrWhiteSpace([string]$ErrorRecord.ErrorDetails.Message)) {
      $parts.Add([string]$ErrorRecord.ErrorDetails.Message)
    }
  } catch {}
  try {
    if (-not [string]::IsNullOrWhiteSpace([string]$ErrorRecord.Exception.Message)) {
      $parts.Add([string]$ErrorRecord.Exception.Message)
    }
  } catch {}
  if ($parts.Count -eq 0) { return 'Error sin detalle adicional.' }
  return (@($parts | Select-Object -Unique) -join ' | ')
}

function New-CheckpointMap {
  return [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase)
}

function Load-Checkpoint {
  $map = New-CheckpointMap
  if (Test-Path -LiteralPath $CheckpointPath) {
    try {
      $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
    } catch {
      Write-Warning 'No se pudo leer el checkpoint anterior. Se iniciara uno nuevo.'
    }
  }
  return $map
}

function Save-Checkpoint($Map) {
  $out = [ordered]@{}
  foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
  $out | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Put-Checkpoint($Map, $Item, [string]$Uid, [int]$DurationSeconds = 0, [string]$LastError = $null) {
  $Map[$Item.Code] = [pscustomobject]@{
    code = $Item.Code
    title = $Item.Title
    uid = $Uid
    driveId = $Item.DriveId
    sourceName = $Item.FileName
    durationSeconds = $DurationSeconds
    lastError = $LastError
    lastAttemptUtc = [DateTime]::UtcNow.ToString('o')
  }
  Save-Checkpoint $Map
}

function Test-DownloadedVideo([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw 'No se genero el archivo temporal.' }
  $file = Get-Item -LiteralPath $Path
  if ($file.Length -le 0) { throw 'El archivo descargado esta vacio.' }
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $buffer = New-Object byte[] 512
    $read = $stream.Read($buffer, 0, $buffer.Length)
    $head = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read).ToLowerInvariant()
    if ($head.Contains('<html') -or $head.Contains('<!doctype')) {
      throw 'Google Drive devolvio HTML en lugar del video. Verifica el acceso del archivo.'
    }
  } finally { $stream.Dispose() }
  return [int64]$file.Length
}

function Download-DriveFile($Item, [string]$TargetPath) {
  $downloadUrl = "https://drive.usercontent.google.com/download?id=$($Item.DriveId)&export=download&confirm=t"
  if (Test-Path -LiteralPath $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force }
  Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $TargetPath -MaximumRedirection 10
  return Test-DownloadedVideo $TargetPath
}

function Upload-CloudflareFile([string]$Path, $Item, [string]$Token) {
  Add-Type -AssemblyName System.Net.Http
  $client = [System.Net.Http.HttpClient]::new()
  $client.Timeout = [TimeSpan]::FromMinutes(20)
  $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
  $multipart = [System.Net.Http.MultipartFormDataContent]::new()
  $fileStream = [System.IO.File]::OpenRead($Path)
  try {
    $streamContent = [System.Net.Http.StreamContent]::new($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new($Item.MimeType)
    $multipart.Add($streamContent, 'file', $Item.FileName)
    $response = $client.PostAsync($ApiBase, $multipart).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
      throw ("Cloudflare rechazo la subida. HTTP {0}. {1}" -f [int]$response.StatusCode, $text)
    }
    $json = $text | ConvertFrom-Json
    if (-not $json.success -or -not $json.result.uid) {
      $message = @($json.errors | ForEach-Object { $_.message }) -join '; '
      throw ("Cloudflare no devolvio UID. {0}" -f $message)
    }
    return [string]$json.result.uid
  } finally {
    if ($fileStream) { $fileStream.Dispose() }
    if ($multipart) { $multipart.Dispose() }
    if ($client) { $client.Dispose() }
  }
}

function Get-CloudflareVideo([string]$Uid, $Headers) {
  return Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$Uid" -Headers $Headers
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - CLOUDFLARE STREAM - MODULO 5' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Incluye C5-01 a C5-20 + C5-PROMO (21 videos).' -ForegroundColor Green
Write-Host 'El archivo Clase 5 - Video completo.mp4 NO se migra porque no es un slot V2.' -ForegroundColor Yellow
Write-Host 'El checkpoint evita volver a subir un video que ya tenga UID.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
$ExitCode = 0

try {
  if (-not (Test-Path -LiteralPath $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

  Write-Host '1/4 Validando token y acceso a Cloudflare Stream...' -ForegroundColor Cyan
  $listUri = "$($ApiBase)?limit=1"
  $probe = Invoke-RestMethod -Method Get -Uri $listUri -Headers $Headers
  if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
  Write-Host '    Token valido. Acceso confirmado.' -ForegroundColor Green

  $Map = Load-Checkpoint
  $Failures = New-Object System.Collections.Generic.List[object]

  Write-Host ''
  Write-Host '2/4 Descargando desde Drive y subiendo a Cloudflare...' -ForegroundColor Cyan
  $i = 0
  foreach ($item in $Items) {
    $i++
    $existingUid = $null
    if ($Map.ContainsKey($item.Code)) {
      try { $existingUid = [string]$Map[$item.Code].uid } catch {}
    }
    if (-not [string]::IsNullOrWhiteSpace($existingUid)) {
      Write-Host ("    [{0}/{1}] {2} ya tiene UID {3}. Se omite." -f $i,$Items.Count,$item.Code,$existingUid) -ForegroundColor DarkGray
      continue
    }

    $tempPath = Join-Path $TempDir $item.FileName
    try {
      Write-Host ("    [{0}/{1}] {2} descargando..." -f $i,$Items.Count,$item.Code) -NoNewline
      $size = Download-DriveFile $item $tempPath
      Write-Host (" {0} MB" -f [math]::Round($size / 1MB, 2)) -ForegroundColor DarkGray
      if ($size -ge 200MB) { throw 'El archivo supera 200 MB y requiere otro metodo de carga.' }

      Write-Host '             subiendo a Cloudflare...' -NoNewline
      $uid = Upload-CloudflareFile $tempPath $item $Token
      Put-Checkpoint $Map $item $uid 0 $null
      Write-Host (" UID {0}" -f $uid) -ForegroundColor Green
    } catch {
      $detail = Get-ErrorDetail $_
      Write-Host ' ERROR' -ForegroundColor Red
      Write-Host ("        {0}" -f $detail) -ForegroundColor Red
      Put-Checkpoint $Map $item $null 0 $detail
      $Failures.Add([pscustomobject]@{ lesson_code=$item.Code; stage='upload'; error=$detail })
    } finally {
      if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue }
    }
  }

  Write-Host ''
  Write-Host '3/4 Esperando a que los videos queden READY...' -ForegroundColor Cyan
  $Rows = New-Object System.Collections.Generic.List[object]
  $deadline = (Get-Date).AddMinutes(35)

  foreach ($item in $Items) {
    $uid = $null
    if ($Map.ContainsKey($item.Code)) {
      try { $uid = [string]$Map[$item.Code].uid } catch {}
    }
    if ([string]::IsNullOrWhiteSpace($uid)) { continue }

    while ($true) {
      if ((Get-Date) -gt $deadline) {
        $Failures.Add([pscustomobject]@{ lesson_code=$item.Code; stage='ready'; error='Timeout esperando READY' })
        break
      }
      try {
        $response = Get-CloudflareVideo $uid $Headers
        if (-not $response.success) { throw 'Cloudflare rechazo la consulta del video.' }
        $video = $response.result
        if ($video.status.state -eq 'error') {
          $reason = [string]$video.status.errorReasonText
          if ([string]::IsNullOrWhiteSpace($reason)) { $reason = 'Cloudflare marco el video como error.' }
          $Failures.Add([pscustomobject]@{ lesson_code=$item.Code; stage='ready'; error=$reason })
          break
        }
        if ($video.readyToStream -eq $true -or $video.status.state -eq 'ready') {
          $duration = 0
          if ($null -ne $video.duration) { $duration = [math]::Ceiling([double]$video.duration) }
          Put-Checkpoint $Map $item $uid ([int]$duration) $null
          $Rows.Add([pscustomobject]@{
            lesson_code = $item.Code
            uid = [string]$video.uid
            hls = [string]$video.playback.hls
            dash = [string]$video.playback.dash
            thumbnail = [string]$video.thumbnail
            duration_seconds = [int]$duration
          })
          Write-Host ("    {0} READY ({1} s)" -f $item.Code,$duration) -ForegroundColor Green
          break
        }
      } catch {
        $detail = Get-ErrorDetail $_
        $Failures.Add([pscustomobject]@{ lesson_code=$item.Code; stage='ready'; error=$detail })
        break
      }
      Start-Sleep -Seconds 5
    }
  }

  Write-Host ''
  Write-Host '4/4 Generando SQL para Supabase...' -ForegroundColor Cyan
  $readyCodes = @($Rows | ForEach-Object { $_.lesson_code })
  $missing = @($Items | Where-Object { $readyCodes -notcontains $_.Code } | ForEach-Object { $_.Code })
  $complete = ($missing.Count -eq 0)
  $outputPath = if ($complete) { $SqlPath } else { $PartialSqlPath }

  $sql = New-Object System.Collections.Generic.List[string]
  $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 5 · Cloudflare Stream')
  if (-not $complete) { $sql.Add('-- PARCIAL. Faltan: ' + ($missing -join ', ')) }
  $sql.Add('begin;')
  $sql.Add('')
  foreach ($row in ($Rows | Sort-Object lesson_code)) {
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
  $sql.Add('-- VERIFICACION: debe regresar 20 / 1 / 0.')
  $sql.Add('select')
  $sql.Add("  count(*) filter (where lesson_code ~ '^C5-[0-9]{2}$' and stream_uid is not null) as c5_con_stream,")
  $sql.Add("  count(*) filter (where lesson_code = 'C5-PROMO' and stream_uid is not null) as promo_con_stream,")
  $sql.Add("  count(*) filter (where lesson_code ~ '^C5-[0-9]{2}$' and video_url is not null) as legacy_restante")
  $sql.Add('from public.lessons')
  $sql.Add("where module_id = '$ModuleId'::uuid;")
  $sql | Set-Content -LiteralPath $outputPath -Encoding UTF8

  if ($Failures.Count -gt 0) {
    $Failures | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8
  } elseif (Test-Path -LiteralPath $ErrorsPath) {
    Remove-Item -LiteralPath $ErrorsPath -Force -ErrorAction SilentlyContinue
  }

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor DarkGreen
  if ($complete) {
    Write-Host ' MODULO 5 MIGRADO CORRECTAMENTE' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor DarkGreen
    Write-Host 'Videos listos: 21/21' -ForegroundColor Green
    Write-Host 'Lecciones: 20/20' -ForegroundColor Green
    Write-Host 'Contenido especial: 1/1' -ForegroundColor Green
    Write-Host "SQL FINAL: $SqlPath" -ForegroundColor Cyan
    $ExitCode = 0
  } else {
    Write-Host ' MIGRACION PARCIAL - NO DUPLIQUES LOS QUE YA QUEDARON' -ForegroundColor Yellow
    Write-Host '============================================================' -ForegroundColor DarkGreen
    Write-Host ("Videos listos: {0}/21" -f $Rows.Count) -ForegroundColor Yellow
    Write-Host ('Faltan: ' + ($missing -join ', ')) -ForegroundColor Yellow
    Write-Host "SQL PARCIAL: $PartialSqlPath" -ForegroundColor Cyan
    Write-Host "Errores: $ErrorsPath" -ForegroundColor Cyan
    $ExitCode = 2
  }
}
catch {
  Write-Host ''
  Write-Host 'ERROR GENERAL:' -ForegroundColor Red
  Write-Host (Get-ErrorDetail $_) -ForegroundColor Red
  Write-Host 'NO borres c5-cloudflare-checkpoint.json. Puedes volver a ejecutar el lanzador.' -ForegroundColor Yellow
  $ExitCode = 1
}
finally {
  if (Test-Path -LiteralPath $TempDir) {
    Get-ChildItem -LiteralPath $TempDir -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  }
  $Token = $null
}

exit $ExitCode
