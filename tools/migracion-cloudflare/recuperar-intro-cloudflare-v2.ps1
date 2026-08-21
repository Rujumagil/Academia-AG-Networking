# Academia AG - Recuperar INTRO-01 existente en Cloudflare Stream
# V2: NO sube videos. Identifica la introduccion por nombre o por el tamaño exacto del archivo oficial de Drive.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'

$AccountId='53e711d2cbb587bea151a270722f8f60'
$ModuleId='7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'
$ApiBase="https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlPath=Join-Path $ScriptDir 'utah-intro-cloudflare-reparacion.sql'
$DiagPath=Join-Path $ScriptDir 'utah-intro-cloudflare-diagnostico-v2.csv'

# Archivo oficial en Google Drive:
# 00 - Bienvenida y cómo usar el curso.mp4
# Drive ID: 1IyV7cNzBq1TExmTIMU78z4_gOe_t8Kr6
# Tamaño exacto: 22,294,697 bytes
$ExpectedSize=[int64]22294697
$ExpectedNames=@('INTRO-01','00 - Bienvenida y cómo usar el curso.mp4','Bienvenida y cómo usar el curso')

function ConvertTo-PlainText([Security.SecureString]$SecureString){
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
  finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
function Sql-Lit([string]$Value){if($null -eq $Value){return 'null'};return "'"+$Value.Replace("'","''")+"'"}
function Created-Date($Video){
  try{if($Video.created){return [datetime]$Video.created}}catch{}
  try{if($Video.createdAt){return [datetime]$Video.createdAt}}catch{}
  return [datetime]::MinValue
}
function Search-Text($Video){
  $p=[System.Collections.Generic.List[string]]::new()
  try{if($Video.meta.name){[void]$p.Add([string]$Video.meta.name)}}catch{}
  try{if($Video.meta.filename){[void]$p.Add([string]$Video.meta.filename)}}catch{}
  try{if($Video.name){[void]$p.Add([string]$Video.name)}}catch{}
  try{if($Video.input.name){[void]$p.Add([string]$Video.input.name)}}catch{}
  try{[void]$p.Add(($Video|ConvertTo-Json -Depth 12 -Compress))}catch{}
  return [string]::Join(' ',$p.ToArray())
}
function Video-Size($Video){
  try{if($null -ne $Video.size){return [int64]$Video.size}}catch{}
  try{if($null -ne $Video.input.size){return [int64]$Video.input.size}}catch{}
  try{if($null -ne $Video.input.fileSize){return [int64]$Video.input.fileSize}}catch{}
  return [int64]0
}

Clear-Host
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - RECUPERAR VIDEO DE INTRODUCCION V2' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host 'NO se subira ningun video nuevo.' -ForegroundColor Yellow
Write-Host 'Se buscara por nombre y por tamaño exacto del archivo oficial de Drive.' -ForegroundColor Yellow
Write-Host ''

$secureToken=Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token=ConvertTo-PlainText $secureToken
if([string]::IsNullOrWhiteSpace($Token)){throw 'No se recibio un API token.'}
$Headers=@{Authorization="Bearer $Token";Accept='application/json'}

try{
  Write-Host '1/3 Buscando el video oficial de introduccion en Cloudflare Stream...' -ForegroundColor Cyan
  $resp=Invoke-RestMethod -Method Get -Uri "$($ApiBase)?limit=100" -Headers $Headers
  if(-not $resp.success){throw 'Cloudflare rechazo la consulta.'}
  $videos=@($resp.result)

  $diagnostic=@()
  foreach($video in $videos){
    $diagnostic += [pscustomobject]@{
      uid=[string]$video.uid
      name=[string]$video.meta.name
      size=(Video-Size $video)
      created=(Created-Date $video)
      state=[string]$video.status.state
      duration=[string]$video.duration
    }
  }
  $diagnostic | Export-Csv -LiteralPath $DiagPath -NoTypeInformation -Encoding UTF8

  $nameMatches=@()
  foreach($video in $videos){
    $text=Search-Text $video
    foreach($needle in $ExpectedNames){
      if($text.IndexOf($needle,[System.StringComparison]::OrdinalIgnoreCase)-ge 0){$nameMatches += $video;break}
    }
  }
  $nameMatches=@($nameMatches|Sort-Object -Property @{Expression={Created-Date $_};Descending=$true})

  $sizeMatches=@($videos|Where-Object{(Video-Size $_)-eq $ExpectedSize}|Sort-Object -Property @{Expression={Created-Date $_};Descending=$true})

  $selected=$null
  $source=''
  if($nameMatches.Count -gt 0){$selected=$nameMatches[0];$source='nombre/codigo'}
  elseif($sizeMatches.Count -gt 0){$selected=$sizeMatches[0];$source='tamaño exacto de Drive'}

  if($null -eq $selected){
    Write-Host ''
    Write-Host 'No se encontro automaticamente el video.' -ForegroundColor Yellow
    Write-Host ("Tamaño esperado: {0} bytes" -f $ExpectedSize) -ForegroundColor Yellow
    Write-Host ("Diagnostico guardado en: {0}" -f $DiagPath) -ForegroundColor Yellow
    exit 2
  }

  $uid=[string]$selected.uid
  Write-Host ("Video identificado por {0}: {1}" -f $source,$uid) -ForegroundColor Green

  Write-Host '2/3 Verificando video...' -ForegroundColor Cyan
  $detail=Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$uid" -Headers $Headers
  if(-not $detail.success){throw 'No se pudo consultar el UID.'}
  $v=$detail.result
  if($v.status.state -eq 'error'){throw ('Cloudflare marco error: '+[string]$v.status.errorReasonText)}
  if(-not ($v.readyToStream -eq $true -or $v.status.state -eq 'ready')){throw 'El video todavia no esta READY.'}
  $duration=0;if($null -ne $v.duration){$duration=[math]::Ceiling([double]$v.duration)}

  Write-Host '3/3 Generando SQL para Supabase...' -ForegroundColor Cyan
  $sql=@(
    '-- Academia AG · Reparacion INTRO-01 · Cloudflare Stream · V2',
    'begin;',
    'update public.lessons',
    'set',
    '  video_url = null,',
    "  stream_provider = 'cloudflare',",
    "  stream_uid = $(Sql-Lit ([string]$v.uid)),",
    "  stream_hls_url = $(Sql-Lit ([string]$v.playback.hls)),",
    "  stream_dash_url = $(Sql-Lit ([string]$v.playback.dash)),",
    "  stream_thumbnail_url = $(Sql-Lit ([string]$v.thumbnail)),",
    "  stream_duration_seconds = $duration,",
    '  updated_at = now()',
    "where module_id = '$ModuleId'::uuid",
    "  and lesson_code = 'INTRO-01';",
    'commit;',
    '',
    "select lesson_code,title,stream_provider,stream_uid,stream_duration_seconds from public.lessons where module_id='$ModuleId'::uuid and lesson_code='INTRO-01';"
  )
  $sql|Set-Content -LiteralPath $SqlPath -Encoding UTF8

  Write-Host ''
  Write-Host 'INTRO-01 RECUPERADO.' -ForegroundColor Green
  Write-Host ("UID: {0}" -f $v.uid) -ForegroundColor Green
  Write-Host ("Duracion: {0} s" -f $duration) -ForegroundColor Green
  Write-Host ("SQL: {0}" -f $SqlPath) -ForegroundColor Green
  exit 0
}catch{
  Write-Host ''
  Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
}
