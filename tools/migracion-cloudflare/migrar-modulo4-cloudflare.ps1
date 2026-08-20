# Academia AG - Utah Driver Success Program V2
# Modulo 4: C4-01 a C4-21 + C4-PROMO
# Google Drive -> PC temporal -> Cloudflare Stream -> SQL Supabase

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ModuleId = '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c4-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-c4-cloudflare-map.sql'
$PartialSqlPath = Join-Path $ScriptDir 'utah-c4-cloudflare-map-PARCIAL.sql'
$ErrorsPath = Join-Path $ScriptDir 'utah-c4-cloudflare-errors.json'
$TempDir = Join-Path $env:TEMP 'academia-ag-c4-cloudflare'

$Items = @(
  [pscustomobject]@{Code='C4-01';Title='REGLAS DEL CAMINO Y SENALES';DriveId='1UGaY0pnl4oxpkqLEchH2q15L8R9l24u6';FileName='C4-01.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-02';Title='Flex Lanes';DriveId='1foOrYtV-gL8E4hPoiPGVxHwf94FC5jYt';FileName='C4-02.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-03';Title='Freeway: Velocidad, Distancia y Disciplina';DriveId='1VwCSFf7q0ZjoqAwjlsSQ9LPY1emR2F2g';FileName='C4-03.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-04';Title='Carpool y Express Lanes';DriveId='1u1sYqmfkvQcqAX5a-7-jvIIfSQpnMPpH';FileName='C4-04.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-05';Title='Como Entrar y Salir de una Via Rapida';DriveId='1a-ajuCt0dzGYsOHnLFU2pKdNd_jQRl8V';FileName='C4-05.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-06';Title='Ramp Meters';DriveId='1InVFRIa0JZEWHgX5VWuTBmR7-qgRO-EW';FileName='C4-06.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-07';Title='Intersecciones Especiales';DriveId='1vj0Sf3YqkCtfCh60kSmJaIHMrOa6oVEl';FileName='C4-07.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-08';Title='Marcas en el Pavimento';DriveId='1J3xirK9GWkYjbQmr1_lSbyoaGJESAY2c';FileName='C4-08.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-09';Title='Crosswalks y Stop Lines';DriveId='1C0B87MOhr1EmNtt1mctUCQgmu-wYhZMY';FileName='C4-09.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-10';Title='Shared Center Left Turn Lane';DriveId='10ooM66MCGpmwBfOtI22UzNHPZHbVyslV';FileName='C4-10.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-11';Title='Ley Basica de Velocidad';DriveId='1u4rroAFK-3Kdtnbdbbx8W_QJq7R412se';FileName='C4-11.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-12';Title='Cuando Debes Reducir la Velocidad';DriveId='1vcVuuWZ9juSDjG_m1jQs-Bd_mPUhMmkg';FileName='C4-12.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-13';Title='Roundabouts';DriveId='1q580NhWBoeCUaWv67C7qc6eQcVhV-Zin';FileName='C4-13.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-14';Title='Traffic Controls';DriveId='1dPC7pTYYzH9Owzp_TeQqZiCbUxe4aN50';FileName='C4-14.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-15';Title='Semaforos: Verde y Amarillo';DriveId='1JFuavRNM3XH2XIxaXoRIk2lxvI5OaGGL';FileName='C4-15.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-16';Title='Semaforos: Rojo, Rojo Intermitente y Flechas';DriveId='1OezNGJxOv-qqEVzq2yONfeVI-s4Wgjua';FileName='C4-16.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-17';Title='Familias de Senales';DriveId='1D-lmvbzHG1-z_EvKMS5HOZZ52kTAbrtY';FileName='C4-17.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-18';Title='Derecho de Paso';DriveId='1ggLPvLDlzcLJYC28Anjk7UUkma-0jQoe';FileName='C4-18.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-19';Title='Caso Practico: Four-Way Stop';DriveId='1XumGlVrK9ioupSRTVhYAh91uoL_SpOGK';FileName='C4-19.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-20';Title='Practica Real: Ruta de Observacion';DriveId='1PxP-ynAL_6rFa6ofTcz5xSo0sPcwBk_k';FileName='C4-20.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-21';Title='Resumen: Aprende a Leer el Camino';DriveId='1f_krhX23uJO5jQ_8-qR2OR65ysfz8Cb1';FileName='C4-21.mp4';MimeType='video/mp4'},
  [pscustomobject]@{Code='C4-PROMO';Title='Contenido especial del modulo';DriveId='1wqXpzIrTupQ3-54bcShasmbUM3CCpRDD';FileName='C4-PROMO.mp4';MimeType='video/mp4'}
)

function Plain([Security.SecureString]$s){$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}}
function Save-Checkpoint($m){$o=@{};foreach($k in $m.Keys){$o[$k]=$m[$k]};$o|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $CheckpointPath -Encoding UTF8}
function Load-Checkpoint{$m=@{};if(Test-Path $CheckpointPath){try{$r=Get-Content $CheckpointPath -Raw -Encoding UTF8|ConvertFrom-Json;foreach($p in $r.PSObject.Properties){$m[$p.Name]=$p.Value}}catch{}};return $m}
function Cf-Get($uid,$h){Invoke-RestMethod -Method Get -Uri "$ApiBase/$uid" -Headers $h}
function Sql-Lit([string]$v){if($null-eq$v){return'null'};return "'"+$v.Replace("'","''")+"'"}
function Err($e){if($e.ErrorDetails.Message){return [string]$e.ErrorDetails.Message};return [string]$e.Exception.Message}
function Download($item,$path){$u="https://drive.usercontent.google.com/download?id=$($item.DriveId)&export=download&confirm=t";if(Test-Path $path){Remove-Item $path -Force};Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $path -MaximumRedirection 10;$f=Get-Item $path;if($f.Length-le 0){throw'Archivo vacio'};return $f.Length}
function Upload($path,$item,$token){Add-Type -AssemblyName System.Net.Http;$c=[System.Net.Http.HttpClient]::new();$c.DefaultRequestHeaders.Authorization=[System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$token);$m=[System.Net.Http.MultipartFormDataContent]::new();$fs=[IO.File]::OpenRead($path);try{$sc=[System.Net.Http.StreamContent]::new($fs);$sc.Headers.ContentType=[System.Net.Http.Headers.MediaTypeHeaderValue]::new($item.MimeType);$m.Add($sc,'file',$item.FileName);$resp=$c.PostAsync($ApiBase,$m).GetAwaiter().GetResult();$txt=$resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();if(-not$resp.IsSuccessStatusCode){throw "Cloudflare HTTP $([int]$resp.StatusCode): $txt"};$j=$txt|ConvertFrom-Json;if(-not$j.success-or-not$j.result.uid){throw'Cloudflare no devolvio UID'};return[string]$j.result.uid}finally{$fs.Dispose();$m.Dispose();$c.Dispose()}}
function Put-Checkpoint($map,$item,$uid,$duration=0,$lastError=$null){$map[$item.Code]=[pscustomobject]@{code=$item.Code;title=$item.Title;uid=$uid;driveId=$item.DriveId;sourceName=$item.FileName;durationSeconds=[int]$duration;lastError=$lastError;lastAttemptUtc=[DateTime]::UtcNow.ToString('o')};Save-Checkpoint $map}

Clear-Host
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - CLOUDFLARE STREAM - MODULO 4' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host 'Incluye C4-01 a C4-21 + C4-PROMO (22 videos).' -ForegroundColor Green
Write-Host 'El checkpoint evita duplicados.' -ForegroundColor Yellow
$secure=Read-Host 'Pega tu API Token de Cloudflare' -AsSecureString
$Token=Plain $secure
$Headers=@{Authorization="Bearer $Token";Accept='application/json'}
$ExitCode=0
try{
  if(-not(Test-Path $TempDir)){New-Item -ItemType Directory -Path $TempDir|Out-Null}
  Write-Host '';Write-Host '1/4 Validando Cloudflare...' -ForegroundColor Cyan
  $probe=Cf-Get 'fb0e5bf6bb1895fd021d7555d07ba034' $Headers;if(-not$probe.success){throw'Token no valido'}
  Write-Host '    Token valido.' -ForegroundColor Green
  $Map=Load-Checkpoint;$Failures=@()
  Write-Host '';Write-Host '2/4 Subiendo videos...' -ForegroundColor Cyan
  $i=0
  foreach($item in $Items){$i++;if($Map.ContainsKey($item.Code)-and$Map[$item.Code].uid){Write-Host "    [$i/$($Items.Count)] $($item.Code) ya tiene UID. Se omite." -ForegroundColor DarkGray;continue};$tmp=Join-Path $TempDir $item.FileName;try{Write-Host "    [$i/$($Items.Count)] $($item.Code) descargando..." -NoNewline;$size=Download $item $tmp;Write-Host " $([math]::Round($size/1MB,2)) MB" -ForegroundColor DarkGray;if($size-ge 200MB){throw'Archivo mayor a 200 MB'};Write-Host "             subiendo..." -NoNewline;$uid=Upload $tmp $item $Token;Put-Checkpoint $Map $item $uid;Write-Host " UID $uid" -ForegroundColor Green}catch{$d=Err $_;Write-Host ' ERROR' -ForegroundColor Red;Write-Host "        $d" -ForegroundColor Red;Put-Checkpoint $Map $item $null 0 $d;$Failures+=[pscustomobject]@{lesson_code=$item.Code;error=$d}}finally{if(Test-Path $tmp){Remove-Item $tmp -Force -ErrorAction SilentlyContinue}}}
  Write-Host '';Write-Host '3/4 Esperando READY...' -ForegroundColor Cyan
  $Rows=@();$deadline=(Get-Date).AddMinutes(35)
  foreach($item in $Items){if(-not$Map.ContainsKey($item.Code)-or-not$Map[$item.Code].uid){continue};$uid=[string]$Map[$item.Code].uid;while($true){if((Get-Date)-gt$deadline){$Failures+=[pscustomobject]@{lesson_code=$item.Code;error='Timeout READY'};break};$v=(Cf-Get $uid $Headers).result;if($v.status.state-eq'error'){$Failures+=[pscustomobject]@{lesson_code=$item.Code;error=[string]$v.status.errorReasonText};break};if($v.readyToStream-eq$true-or$v.status.state-eq'ready'){$dur=0;if($null-ne$v.duration){$dur=[math]::Ceiling([double]$v.duration)};Put-Checkpoint $Map $item $uid $dur;$Rows+=[pscustomobject]@{lesson_code=$item.Code;uid=[string]$v.uid;hls=[string]$v.playback.hls;dash=[string]$v.playback.dash;thumbnail=[string]$v.thumbnail;duration_seconds=[int]$dur};Write-Host "    $($item.Code) READY ($dur s)" -ForegroundColor Green;break};Start-Sleep 5}}
  Write-Host '';Write-Host '4/4 Generando SQL...' -ForegroundColor Cyan
  $ready=@($Rows|ForEach-Object{$_.lesson_code});$missing=@($Items|Where-Object{$ready-notcontains$_.Code}|ForEach-Object{$_.Code});$complete=$missing.Count-eq0;$out=if($complete){$SqlPath}else{$PartialSqlPath}
  $s=[System.Collections.Generic.List[string]]::new();$s.Add('-- Academia AG · Utah Driver V2 · Modulo 4 · Cloudflare Stream');if(-not$complete){$s.Add('-- PARCIAL. Faltan: '+($missing-join', '))};$s.Add('begin;');$s.Add('')
  foreach($r in ($Rows|Sort-Object lesson_code)){$s.Add('update public.lessons');$s.Add('set');$s.Add('  video_url = null,');$s.Add("  stream_provider = 'cloudflare',");$s.Add("  stream_uid = $(Sql-Lit $r.uid),");$s.Add("  stream_hls_url = $(Sql-Lit $r.hls),");$s.Add("  stream_dash_url = $(Sql-Lit $r.dash),");$s.Add("  stream_thumbnail_url = $(Sql-Lit $r.thumbnail),");$s.Add("  stream_duration_seconds = $($r.duration_seconds),");$s.Add('  updated_at = now()');$s.Add("where module_id = '$ModuleId'::uuid");$s.Add("  and lesson_code = '$($r.lesson_code)';");$s.Add('')}
  $s.Add('commit;');$s.Add('');$s.Add('-- VERIFICACION: debe regresar 21 / 1 / 0.');$s.Add('select');$s.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and stream_uid is not null) as c4_con_stream,");$s.Add("  count(*) filter (where lesson_code = 'C4-PROMO' and stream_uid is not null) as promo_con_stream,");$s.Add("  count(*) filter (where lesson_code ~ '^C4-[0-9]{2}$' and video_url is not null) as legacy_restante");$s.Add('from public.lessons');$s.Add("where module_id = '$ModuleId'::uuid;");$s|Set-Content -LiteralPath $out -Encoding UTF8
  if($Failures.Count){$Failures|ConvertTo-Json -Depth 5|Set-Content $ErrorsPath -Encoding UTF8}else{'[]'|Set-Content $ErrorsPath -Encoding UTF8}
  Write-Host '';if($complete){Write-Host 'MIGRACION COMPLETA.' -ForegroundColor Green;Write-Host "    Videos listos: $($Rows.Count)/22" -ForegroundColor Green;Write-Host '    Lecciones: 21/21' -ForegroundColor Green;Write-Host '    Contenido especial: 1/1' -ForegroundColor Green;Write-Host "    SQL FINAL: $SqlPath" -ForegroundColor Green;$ExitCode=0}else{Write-Host 'MIGRACION PARCIAL.' -ForegroundColor Yellow;Write-Host "    Pendientes: $($missing-join', ')" -ForegroundColor Yellow;Write-Host '    NO borres c4-cloudflare-checkpoint.json.';$ExitCode=2}
}catch{Write-Host '';Write-Host "ERROR GENERAL: $(Err $_)" -ForegroundColor Red;$ExitCode=1}finally{if(Test-Path $TempDir){Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue};$Token=$null;if($secure){$secure.Dispose()}}
exit $ExitCode
