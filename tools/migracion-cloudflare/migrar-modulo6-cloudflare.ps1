# Academia AG - Utah Driver Success Program V2
# Modulo 6: C6-01 a C6-25
# Google Drive -> PC temporal -> Cloudflare Stream -> SQL Supabase
# Los dos videos completos y el MOV sin codigo se conservan como material maestro y NO se migran en este paso.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c6-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-c6-cloudflare-map.sql'
$PartialSqlPath = Join-Path $ScriptDir 'utah-c6-cloudflare-map-PARCIAL.sql'
$ErrorsPath = Join-Path $ScriptDir 'utah-c6-cloudflare-errors.json'
$TempDir = Join-Path $env:TEMP 'academia-ag-c6-cloudflare'

$Items = @(
  [pscustomobject]@{Code='C6-01';DriveId='1COp7JQWnPwkwNvEpcv4cNqZnHisI35TD';FileName='C6-01.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-02';DriveId='1xdsumLtB3FzYF1HXQ-xmtDZZ3k2Sb4Ic';FileName='C6-02.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-03';DriveId='1JmiUMG8WbuVi3RTIQ0EOXnwGCB28EHvr';FileName='C6-03.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-04';DriveId='1EifS6Y4I2oc6qWptgHJIDzi1GOfdl711';FileName='C6-04.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-05';DriveId='1grRNQMr015MIss5L8sktlTZj979TW9yq';FileName='C6-05.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-06';DriveId='1SO2LW9_dQhgB2dQbcEasQRdIiKNWmlza';FileName='C6-06.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-07';DriveId='1usc1iCvqAXR0A3_yratXoFjfhnlHK1Gk';FileName='C6-07.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-08';DriveId='1AFvNXARUGw7AzvOh4CgkWbPq3KcX8TE3';FileName='C6-08.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-09';DriveId='1eq-ITCO9TmvWsP9d1HfzNM_5plGirZZ-';FileName='C6-09.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-10';DriveId='1qR-IIdZGlssCDukbEcHH9cxGNlnWbOP6';FileName='C6-10.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-11';DriveId='1HgzUCZW4M5Gg8t0t3JuW6fajuiFvRjpU';FileName='C6-11.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-12';DriveId='16fcxuRUGpoVdQ-NVx3V6xnxSYAsGdSre';FileName='C6-12.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-13';DriveId='1Ta93RKc_orMyU7TZMOyh3NA-3yEh7KQl';FileName='C6-13.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-14';DriveId='1gC2DWY1_r-2PwEk7Vf0ejAyFP7Z9ts_m';FileName='C6-14.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-15';DriveId='19Un28liNDfgNGPxWUcO4C1WLnwr2nR_Q';FileName='C6-15.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-16';DriveId='1LMNIxtl3pjH0l69W1yLSxSefDRVhAmGe';FileName='C6-16.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-17';DriveId='1JensgVt-T0iTuH5KvDZODWp8LfulMicQ';FileName='C6-17.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-18';DriveId='1ZBJmHULjTL49R416R5BWibFhtJgg_nUg';FileName='C6-18.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-19';DriveId='1D_1xYVy5DAMjnrkstjz8whx87yoQXIGN';FileName='C6-19.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-20';DriveId='1ocghQRnF6G4A6DQH04rtXvPoJwz7IsVH';FileName='C6-20.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-21';DriveId='1oOciK5zNe_43BIHGSpqVqNJB6MqL5Nxi';FileName='C6-21.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-22';DriveId='1MzYHetDbVb6aHPn7Ngt5BuaLob73YTEx';FileName='C6-22.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-23';DriveId='1SbqgtpQK-0MKd6Is2Sa4X4tvncM_Arbk';FileName='C6-23.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-24';DriveId='1wIQgPLgURjivvMVhO6G6xNTioHCfSAHj';FileName='C6-24.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C6-25';DriveId='1sT1Ll9avuLVIeVtpjQB2qQbHkyWUz5C5';FileName='C6-25.mp4';MimeType='video/mp4'}
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

function New-Map { return [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase) }

function Load-Checkpoint {
  $map = New-Map
  if (Test-Path -LiteralPath $CheckpointPath) {
    try {
      $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
      foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
    } catch { Write-Warning 'No se pudo leer el checkpoint anterior; se continuara con uno nuevo.' }
  }
  return $map
}

function Save-Checkpoint($Map) {
  $out = [ordered]@{}
  foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
  $out | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Put-Checkpoint($Map,$Item,[string]$Uid,[int]$DurationSeconds=0,[string]$LastError=$null) {
  $Map[$Item.Code] = [pscustomobject]@{
    code=$Item.Code; uid=$Uid; driveId=$Item.DriveId; sourceName=$Item.FileName;
    durationSeconds=$DurationSeconds; lastError=$LastError; lastAttemptUtc=[DateTime]::UtcNow.ToString('o')
  }
  Save-Checkpoint $Map
}

function Download-DriveFile($Item,[string]$TargetPath) {
  $url = "https://drive.usercontent.google.com/download?id=$($Item.DriveId)&export=download&confirm=t"
  if (Test-Path -LiteralPath $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force }
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $TargetPath -MaximumRedirection 10
  if (-not (Test-Path -LiteralPath $TargetPath)) { throw 'No se genero el archivo temporal.' }
  $file = Get-Item -LiteralPath $TargetPath
  if ($file.Length -le 0) { throw 'El archivo descargado esta vacio.' }
  $stream=[System.IO.File]::OpenRead($TargetPath)
  try {
    $buffer=New-Object byte[] 512
    $read=$stream.Read($buffer,0,$buffer.Length)
    $head=[Text.Encoding]::UTF8.GetString($buffer,0,$read).ToLowerInvariant()
    if ($head.Contains('<html') -or $head.Contains('<!doctype')) { throw 'Google Drive devolvio HTML en lugar del video.' }
  } finally { $stream.Dispose() }
  return [int64]$file.Length
}

function Upload-CloudflareFile([string]$Path,$Item,[string]$Token) {
  Add-Type -AssemblyName System.Net.Http
  $client=[Net.Http.HttpClient]::new()
  $client.Timeout=[TimeSpan]::FromMinutes(20)
  $client.DefaultRequestHeaders.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$Token)
  $multipart=[Net.Http.MultipartFormDataContent]::new()
  $fileStream=[IO.File]::OpenRead($Path)
  try {
    $streamContent=[Net.Http.StreamContent]::new($fileStream)
    $streamContent.Headers.ContentType=[Net.Http.Headers.MediaTypeHeaderValue]::new($Item.MimeType)
    $multipart.Add($streamContent,'file',$Item.FileName)
    $response=$client.PostAsync($ApiBase,$multipart).GetAwaiter().GetResult()
    $text=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) { throw ("Cloudflare rechazo la subida. HTTP {0}. {1}" -f [int]$response.StatusCode,$text) }
    $json=$text | ConvertFrom-Json
    if (-not $json.success -or -not $json.result.uid) { throw 'Cloudflare no devolvio UID.' }
    return [string]$json.result.uid
  } finally {
    if ($fileStream) { $fileStream.Dispose() }
    if ($multipart) { $multipart.Dispose() }
    if ($client) { $client.Dispose() }
  }
}

function Write-Sql($Rows,[string]$Path) {
  $sql=[Collections.Generic.List[string]]::new()
  $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 6 · Cloudflare Stream')
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
  $sql.Add('-- VERIFICACION: debe regresar 25 / 0.')
  $sql.Add('select')
  $sql.Add("  count(*) filter (where lesson_code ~ '^C6-[0-9]{2}$' and stream_uid is not null) as c6_con_stream,")
  $sql.Add("  count(*) filter (where lesson_code ~ '^C6-[0-9]{2}$' and video_url is not null) as legacy_restante")
  $sql.Add('from public.lessons')
  $sql.Add("where module_id = '$ModuleId'::uuid;")
  $sql | Set-Content -LiteralPath $Path -Encoding UTF8
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - CLOUDFLARE STREAM - MODULO 6' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Incluye C6-01 a C6-25 (25 videos).' -ForegroundColor Green
Write-Host 'Los videos completos y el MOV sin codigo se conservan en Drive como material maestro.' -ForegroundColor Yellow
Write-Host 'El checkpoint evita volver a subir videos que ya tengan UID.' -ForegroundColor Yellow
Write-Host ''

$secureToken=Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token=ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers=@{Authorization="Bearer $Token";Accept='application/json'}

try {
  if (-not (Test-Path -LiteralPath $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

  Write-Host '1/4 Validando token y acceso a Cloudflare Stream...' -ForegroundColor Cyan
  $probe=Invoke-RestMethod -Method Get -Uri "$($ApiBase)?limit=1" -Headers $Headers
  if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
  Write-Host '    Token valido. Acceso confirmado.' -ForegroundColor Green

  $Map=Load-Checkpoint
  $Failures=[Collections.Generic.List[object]]::new()

  Write-Host ''
  Write-Host '2/4 Descargando desde Drive y subiendo a Cloudflare...' -ForegroundColor Cyan
  $i=0
  foreach ($item in $Items) {
    $i++
    $existingUid=$null
    if ($Map.ContainsKey($item.Code)) { try { $existingUid=[string]$Map[$item.Code].uid } catch {} }
    if (-not [string]::IsNullOrWhiteSpace($existingUid)) {
      Write-Host ("    [{0}/25] {1} ya tiene UID {2}. Se omite." -f $i,$item.Code,$existingUid) -ForegroundColor DarkGray
      continue
    }

    $tempPath=Join-Path $TempDir $item.FileName
    try {
      Write-Host ("    [{0}/25] {1} descargando..." -f $i,$item.Code) -NoNewline
      $size=Download-DriveFile $item $tempPath
      Write-Host (" {0} MB" -f [math]::Round($size/1MB,2)) -ForegroundColor DarkGray
      Write-Host '             subiendo a Cloudflare...' -NoNewline
      $uid=Upload-CloudflareFile $tempPath $item $Token
      Put-Checkpoint $Map $item $uid
      Write-Host (" UID {0}" -f $uid) -ForegroundColor Green
    } catch {
      $message=$_.Exception.Message
      $Failures.Add([pscustomobject]@{code=$item.Code;error=$message})
      Put-Checkpoint $Map $item '' 0 $message
      Write-Host ' ERROR' -ForegroundColor Red
      Write-Host ("             {0}" -f $message) -ForegroundColor Red
    } finally {
      if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue }
    }
  }

  if ($Failures.Count -gt 0) {
    $Failures | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8
    Write-Host ''
    Write-Host ("Migracion parcial: {0} archivo(s) fallaron. Reejecuta este mismo lanzador; los UID guardados no se duplican." -f $Failures.Count) -ForegroundColor Yellow
    exit 2
  }

  Write-Host ''
  Write-Host '3/4 Esperando a que los 25 videos queden READY...' -ForegroundColor Cyan
  $Rows=[Collections.Generic.List[object]]::new()
  foreach ($item in $Items) {
    $uid=[string]$Map[$item.Code].uid
    if ([string]::IsNullOrWhiteSpace($uid)) { throw "Falta UID para $($item.Code)." }
    $deadline=(Get-Date).AddMinutes(35)
    while ($true) {
      if ((Get-Date) -gt $deadline) { throw "Timeout esperando READY para $($item.Code)." }
      $response=Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$uid" -Headers $Headers
      if (-not $response.success) { throw "No se pudo consultar $($item.Code)." }
      $video=$response.result
      if ($video.status.state -eq 'error') { throw "Cloudflare marco error en $($item.Code): $($video.status.errorReasonText)" }
      if ($video.readyToStream -eq $true -or $video.status.state -eq 'ready') {
        $duration=0
        if ($null -ne $video.duration) { $duration=[math]::Ceiling([double]$video.duration) }
        Put-Checkpoint $Map $item $uid ([int]$duration)
        $Rows.Add([pscustomobject]@{
          lesson_code=$item.Code;uid=[string]$video.uid;hls=[string]$video.playback.hls;
          dash=[string]$video.playback.dash;thumbnail=[string]$video.thumbnail;duration_seconds=[int]$duration
        })
        Write-Host ("    {0} READY ({1} s)" -f $item.Code,$duration) -ForegroundColor Green
        break
      }
      Start-Sleep -Seconds 5
    }
  }

  Write-Host ''
  Write-Host '4/4 Generando SQL FINAL para Supabase...' -ForegroundColor Cyan
  Write-Sql $Rows $SqlPath

  Write-Host ''
  Write-Host '============================================================' -ForegroundColor DarkGreen
  Write-Host ' MODULO 6 MIGRADO CORRECTAMENTE' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor DarkGreen
  Write-Host 'Videos listos: 25/25' -ForegroundColor Green
  Write-Host 'Lecciones: 25/25' -ForegroundColor Green
  Write-Host "SQL FINAL: $SqlPath" -ForegroundColor Cyan
  exit 0
}
catch {
  Write-Host ''
  Write-Host 'ERROR GENERAL:' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'NO borres c6-cloudflare-checkpoint.json; puedes volver a ejecutar este lanzador.' -ForegroundColor Yellow
  exit 1
}
