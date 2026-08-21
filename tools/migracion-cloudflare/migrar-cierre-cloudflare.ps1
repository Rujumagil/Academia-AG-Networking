# Academia AG - Utah Driver Success Program V2
# Cierre oficial: CIERRE-01
# Google Drive -> PC temporal -> Cloudflare Stream -> SQL Supabase

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001'
$LessonCode = 'CIERRE-01'
$DriveId = '1408tWymNOg2wFDJC6K-MTqnwd8d3SvoY'
$FileName = 'CIERRE-01.mov'
$MimeType = 'video/quicktime'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'cierre-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-cierre-cloudflare-map.sql'
$TempDir = Join-Path $env:TEMP 'academia-ag-cierre-cloudflare'

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Sql-Lit([string]$Value) {
  if ($null -eq $Value) { return 'null' }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Save-Checkpoint([string]$Uid,[int]$DurationSeconds=0) {
  [ordered]@{
    code = $LessonCode
    uid = $Uid
    driveId = $DriveId
    sourceName = $FileName
    durationSeconds = $DurationSeconds
    updatedUtc = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Load-Uid {
  if (-not (Test-Path -LiteralPath $CheckpointPath)) { return $null }
  try {
    $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
    return [string]$raw.uid
  } catch { return $null }
}

function Download-DriveFile([string]$TargetPath) {
  $url = "https://drive.usercontent.google.com/download?id=$DriveId&export=download&confirm=t"
  if (Test-Path -LiteralPath $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force }
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $TargetPath -MaximumRedirection 10
  if (-not (Test-Path -LiteralPath $TargetPath)) { throw 'No se genero el archivo temporal.' }
  $file = Get-Item -LiteralPath $TargetPath
  if ($file.Length -le 0) { throw 'El archivo descargado esta vacio.' }
  $stream = [System.IO.File]::OpenRead($TargetPath)
  try {
    $buffer = New-Object byte[] 512
    $read = $stream.Read($buffer,0,$buffer.Length)
    $head = [System.Text.Encoding]::UTF8.GetString($buffer,0,$read).ToLowerInvariant()
    if ($head.Contains('<html') -or $head.Contains('<!doctype')) { throw 'Google Drive devolvio HTML en lugar del video.' }
  } finally { $stream.Dispose() }
  return [int64]$file.Length
}

function Upload-CloudflareFile([string]$Path,[string]$Token) {
  Add-Type -AssemblyName System.Net.Http
  $client = [System.Net.Http.HttpClient]::new()
  $client.Timeout = [TimeSpan]::FromMinutes(20)
  $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$Token)
  $multipart = [System.Net.Http.MultipartFormDataContent]::new()
  $fileStream = [System.IO.File]::OpenRead($Path)
  try {
    $streamContent = [System.Net.Http.StreamContent]::new($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new($MimeType)
    $multipart.Add($streamContent,'file',$FileName)
    $response = $client.PostAsync($ApiBase,$multipart).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) { throw ("Cloudflare rechazo la subida. HTTP {0}. {1}" -f [int]$response.StatusCode,$text) }
    $json = $text | ConvertFrom-Json
    if (-not $json.success -or -not $json.result.uid) { throw 'Cloudflare no devolvio UID.' }
    return [string]$json.result.uid
  } finally {
    if ($fileStream) { $fileStream.Dispose() }
    if ($multipart) { $multipart.Dispose() }
    if ($client) { $client.Dispose() }
  }
}

function Get-CloudflareVideo([string]$Uid,$Headers) {
  return Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$Uid" -Headers $Headers
}

function Generate-Sql([string]$Uid,[int]$DurationSeconds) {
  $hls = "https://videodelivery.net/$Uid/manifest/video.m3u8"
  $dash = "https://videodelivery.net/$Uid/manifest/video.mpd"
  $thumb = "https://videodelivery.net/$Uid/thumbnails/thumbnail.jpg?time=1s&height=720"
  $sql = @"
-- ACADEMIA AG · Utah Driver Success Program V2 · CIERRE OFICIAL
begin;
update public.lessons
set stream_provider='cloudflare',
    stream_uid=$(Sql-Lit $Uid),
    stream_hls_url=$(Sql-Lit $hls),
    stream_dash_url=$(Sql-Lit $dash),
    stream_thumbnail_url=$(Sql-Lit $thumb),
    stream_duration_seconds=$DurationSeconds,
    video_url=null,
    updated_at=now()
where module_id='$ModuleId'::uuid
  and lesson_code='$LessonCode';
commit;

select lesson_code,title,lesson_kind,stream_provider,stream_uid,stream_duration_seconds
from public.lessons
where module_id='$ModuleId'::uuid
  and lesson_code='$LessonCode';
"@
  $sql | Set-Content -LiteralPath $SqlPath -Encoding UTF8
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - CLOUDFLARE STREAM - CIERRE OFICIAL' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Migra el mensaje final del programa a CIERRE-01.' -ForegroundColor Green
Write-Host 'El checkpoint evita volver a subirlo si ya tiene UID.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept='application/json' }

try {
  if (-not (Test-Path -LiteralPath $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

  Write-Host '1/4 Validando Cloudflare Stream...' -ForegroundColor Cyan
  $probe = Invoke-RestMethod -Method Get -Uri "$($ApiBase)?limit=1" -Headers $Headers
  if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
  Write-Host '    Token valido.' -ForegroundColor Green

  $Uid = Load-Uid
  if ([string]::IsNullOrWhiteSpace($Uid)) {
    Write-Host '2/4 Descargando el mensaje final desde Drive...' -ForegroundColor Cyan
    $tempPath = Join-Path $TempDir $FileName
    $size = Download-DriveFile $tempPath
    Write-Host ("    Descargado: {0} MB" -f [math]::Round($size/1MB,2)) -ForegroundColor Green
    if ($size -ge 200MB) { throw 'El archivo supera 200 MB.' }

    Write-Host '    Subiendo a Cloudflare Stream...' -ForegroundColor Cyan
    $Uid = Upload-CloudflareFile $tempPath $Token
    Save-Checkpoint $Uid 0
    Write-Host ("    UID: {0}" -f $Uid) -ForegroundColor Green
    Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
  } else {
    Write-Host ("2/4 CIERRE-01 ya tiene UID {0}. No se vuelve a subir." -f $Uid) -ForegroundColor DarkGray
  }

  Write-Host '3/4 Esperando a que el video quede READY...' -ForegroundColor Cyan
  $deadline = [DateTime]::UtcNow.AddMinutes(20)
  $duration = 0
  do {
    $video = Get-CloudflareVideo $Uid $Headers
    if (-not $video.success) { throw 'No se pudo consultar el video en Cloudflare.' }
    $state = [string]$video.result.status.state
    $pct = 0
    try { $pct = [int][math]::Round([double]$video.result.status.pctComplete) } catch {}
    Write-Host ("    Estado: {0} ({1}%)" -f $state,$pct) -ForegroundColor DarkGray
    if ($state -eq 'ready') {
      try { $duration = [int][math]::Round([double]$video.result.duration) } catch { $duration = 0 }
      break
    }
    if ($state -eq 'error') { throw 'Cloudflare reporto error al procesar el video.' }
    if ([DateTime]::UtcNow -gt $deadline) { throw 'Tiempo agotado esperando a que el video quede READY.' }
    Start-Sleep -Seconds 5
  } while ($true)

  Save-Checkpoint $Uid $duration

  Write-Host '4/4 Generando SQL FINAL para Supabase...' -ForegroundColor Cyan
  Generate-Sql $Uid $duration
  Write-Host ''
  Write-Host 'CIERRE-01 READY' -ForegroundColor Green
  Write-Host ("Duracion: {0} s" -f $duration) -ForegroundColor Green
  Write-Host ("SQL: {0}" -f $SqlPath) -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'SIGUIENTE PASO: ejecuta utah-cierre-cloudflare-map.sql en Supabase.' -ForegroundColor Yellow
  exit 0
} catch {
  Write-Host ''
  Write-Host 'ERROR GENERAL:' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'No borres cierre-cloudflare-checkpoint.json.' -ForegroundColor Yellow
  exit 1
}
