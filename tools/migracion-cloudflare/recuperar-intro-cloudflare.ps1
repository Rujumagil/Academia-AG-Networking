# Academia AG - Recuperar INTRO-01 existente en Cloudflare Stream
# NO sube videos nuevos. Busca INTRO-01 y genera SQL para Supabase.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$AccountId='53e711d2cbb587bea151a270722f8f60'
$ModuleId='7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'
$ApiBase="https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlPath=Join-Path $ScriptDir 'utah-intro-cloudflare-reparacion.sql'
$DiagPath=Join-Path $ScriptDir 'utah-intro-cloudflare-diagnostico.csv'

function ConvertTo-PlainText([Security.SecureString]$SecureString){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString);try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
function Sql-Lit([string]$Value){if($null -eq $Value){return 'null'};return "'"+$Value.Replace("'","''")+"'"}
function Created-Date($Video){try{if($Video.created){return [datetime]$Video.created}}catch{};try{if($Video.createdAt){return [datetime]$Video.createdAt}}catch{};return [datetime]::MinValue}
function Search-Text($Video){$p=[System.Collections.Generic.List[string]]::new();try{if($Video.meta.name){[void]$p.Add([string]$Video.meta.name)}}catch{};try{if($Video.meta.filename){[void]$p.Add([string]$Video.meta.filename)}}catch{};try{if($Video.name){[void]$p.Add([string]$Video.name)}}catch{};try{[void]$p.Add(($Video|ConvertTo-Json -Depth 10 -Compress))}catch{};return [string]::Join(' ',$p.ToArray())}

Clear-Host
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - RECUPERAR VIDEO DE INTRODUCCION' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host 'NO se subira ningun video nuevo.' -ForegroundColor Yellow
$secureToken=Read-Host 'Pega tu API Token de Cloudflare (no se mostrara)' -AsSecureString
$Token=ConvertTo-PlainText $secureToken
if([string]::IsNullOrWhiteSpace($Token)){throw 'No se recibio un API token.'}
$Headers=@{Authorization="Bearer $Token";Accept='application/json'}

try{
  Write-Host '1/3 Buscando INTRO-01 en Cloudflare Stream...' -ForegroundColor Cyan
  $resp=Invoke-RestMethod -Method Get -Uri "$($ApiBase)?limit=100" -Headers $Headers
  if(-not $resp.success){throw 'Cloudflare rechazo la consulta.'}
  $videos=@($resp.result)
  $videos|ForEach-Object{[pscustomobject]@{uid=[string]$_.uid;name=[string]$_.meta.name;created=(Created-Date $_);state=[string]$_.status.state}}|Export-Csv -LiteralPath $DiagPath -NoTypeInformation -Encoding UTF8
  $matches=@($videos|Where-Object{(Search-Text $_).IndexOf('INTRO-01',[System.StringComparison]::OrdinalIgnoreCase)-ge 0}|Sort-Object -Property @{Expression={Created-Date $_};Descending=$true})
  if(-not $matches.Count){
    Write-Host 'No se encontro por nombre INTRO-01.' -ForegroundColor Yellow
    $manual=Read-Host 'Si conoces el UID del video de introduccion, pegalo ahora; si no, presiona ENTER'
    if([string]::IsNullOrWhiteSpace($manual)){Write-Host "Diagnostico guardado en: $DiagPath" -ForegroundColor Yellow;exit 2}
    $uid=$manual.Trim()
  } else {
    $uid=[string]$matches[0].uid
    Write-Host ("INTRO-01 encontrado: {0}" -f $uid) -ForegroundColor Green
  }

  Write-Host '2/3 Verificando video...' -ForegroundColor Cyan
  $detail=Invoke-RestMethod -Method Get -Uri "$($ApiBase)/$uid" -Headers $Headers
  if(-not $detail.success){throw 'No se pudo consultar el UID.'}
  $v=$detail.result
  if($v.status.state -eq 'error'){throw ('Cloudflare marco error: '+[string]$v.status.errorReasonText)}
  if(-not ($v.readyToStream -eq $true -or $v.status.state -eq 'ready')){throw 'El video todavia no esta READY.'}
  $duration=0;if($null -ne $v.duration){$duration=[math]::Ceiling([double]$v.duration)}

  Write-Host '3/3 Generando SQL para Supabase...' -ForegroundColor Cyan
  $sql=@(
    '-- Academia AG · Reparacion INTRO-01 · Cloudflare Stream',
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
}catch{Write-Host '';Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red;exit 1}
