# Academia AG - Utah Driver Success Program V2
# Migrador local: Google Drive -> PC temporal -> Cloudflare Stream -> SQL para Supabase
# Modulo 2 completo: C2-01 a C2-18 + C2-PROMO.
# El API token de Cloudflare solo vive en memoria durante esta ejecucion.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$CourseId = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'
$ModuleId = '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c2-cloudflare-checkpoint.json'
$CsvPath = Join-Path $ScriptDir 'utah-c2-cloudflare-map.csv'
$SqlPath = Join-Path $ScriptDir 'utah-c2-cloudflare-map.sql'
$PartialSqlPath = Join-Path $ScriptDir 'utah-c2-cloudflare-map-PARCIAL.sql'
$ReportPath = Join-Path $ScriptDir 'utah-c2-cloudflare-report.json'
$ErrorsPath = Join-Path $ScriptDir 'utah-c2-cloudflare-errors.json'
$TempDir = Join-Path $env:TEMP 'academia-ag-c2-cloudflare'

$Items = @(
    [pscustomobject]@{ Code='C2-01'; Title='SALUD, EXAMENES Y PREPARACION DEL VEHICULO'; DriveId='1oy_53pUyAWUtY2sjEjA9NeDXC2faMTfC'; FileName='C2-01.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-02'; Title='Examen de Vision'; DriveId='1GPwH5C6GTr2EwWS9LeSubiHvn99xhcrF'; FileName='C2-02.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-03'; Title='Tu Salud Tambien Forma Parte de la Seguridad Vial'; DriveId='1MA0U9IqIdahWeKDijiHGTNlTp3MhG3Rv'; FileName='C2-03.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-04'; Title='Examen Escrito de Conocimientos'; DriveId='1N-t9boCApti4CZEpEUDrKTDHzNSVGwSm'; FileName='C2-04.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-05'; Title='Traffic Safety and Trends Exam'; DriveId='1-G4Y8vVbWYpci1qG0HUnDL3foEgIj8P0'; FileName='C2-05.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-06'; Title='Driving Skills Test'; DriveId='1OTP9uiqC22_fOUv0LM9844Shi_amsiiB'; FileName='C2-06.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-07'; Title='Que Evaluan Durante el Examen Practico'; DriveId='16PTyUpvv7I8IkTgvohR1ZdEwQGuOnx0y'; FileName='C2-07.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-08'; Title='Que Debes Llevar al Driving Skills Test'; DriveId='14zTI22cdaGodeZVUjxr6NgcWvNkpQsJL'; FileName='C2-08.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-09'; Title='Revision del Vehiculo - Parte 1'; DriveId='1Y9tU_FsuIsBhx3UBdiaCf-HPY7UKtWag'; FileName='C2-09.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-10'; Title='Revision del Vehiculo - Parte 2'; DriveId='1Dqb3RMiL04OHsSmluZFi8-tt75FgsAkV'; FileName='C2-10.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-11'; Title='Errores que Pueden Provocar una Falla Automatica'; DriveId='1UNnd87D4dho3uIWTOiyBW9mXFo-Rx1GD'; FileName='C2-11.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-12'; Title='Ajusta tu Asiento y tus Espejos'; DriveId='12ABU-JGIwu0Mi2aCL-k1ATzOQR3y3khL'; FileName='C2-12.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-13'; Title='Cinturones de Seguridad'; DriveId='11urgz07qUyR09C3XzwrM03Vf-0OHUMTr'; FileName='C2-13.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-14'; Title='Asientos Infantiles y Booster Seats'; DriveId='1T8XN5J4VlRIu9ebhu_95_fn0tv-ztcJW'; FileName='C2-14.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-15'; Title='Airbags: Complementan el Cinturon, No lo Sustituyen'; DriveId='1XI3DAXNqNS9Mp32IfJLXvj9kFqJezza8'; FileName='C2-15.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-16'; Title='Actividad Practica: Inspecciona un Vehiculo'; DriveId='1XrRj2dCtMpq_fwkYk1O-fEaqARsVIHws'; FileName='C2-16.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-17'; Title='Antes de Manejar, Haz una Pausa'; DriveId='15Mn4te3P08iNqWo9u6k2DowynGbr_ojD'; FileName='C2-17.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-18'; Title='Resumen: Preparate con Seguridad'; DriveId='1IRhmxFObPIzu1-Gljz6ELqYVOagL7NZo'; FileName='C2-18.mp4'; MimeType='video/mp4' },
    [pscustomobject]@{ Code='C2-PROMO'; Title='Contenido especial del modulo'; DriveId='1W3ldnZichhdR9DVH_z6tnw4W69LWp5OA'; FileName='C2-PROMO.mov'; MimeType='video/quicktime' }
)

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Save-Checkpoint($Map) {
    $out = @{}
    foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
    $out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Load-Checkpoint {
    $map = @{}
    if (Test-Path -LiteralPath $CheckpointPath) {
        try {
            $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
            foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
        }
        catch { Write-Warning 'No se pudo leer el checkpoint anterior. Se iniciara uno nuevo.' }
    }
    return $map
}

function Invoke-CfGetVideo($Uid, $Headers) {
    return Invoke-RestMethod -Method Get -Uri "$ApiBase/$Uid" -Headers $Headers
}

function Get-SqlLiteral([string]$Value) {
    if ($null -eq $Value) { return 'null' }
    return "'" + $Value.Replace("'", "''") + "'"
}

function Get-HttpErrorDetail($ErrorRecord) {
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
    $clean = @($parts | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
    if ($clean.Count -eq 0) { return 'Error sin detalle adicional.' }
    return ($clean -join ' | ')
}

function Test-DownloadedVideo([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { throw 'No se genero el archivo temporal.' }
    $size = (Get-Item -LiteralPath $Path).Length
    if ($size -le 0) { throw 'El archivo descargado esta vacio.' }
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $buffer = New-Object byte[] 512
        $read = $stream.Read($buffer, 0, $buffer.Length)
        $head = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read).ToLowerInvariant()
        if ($head.Contains('<html') -or $head.Contains('<!doctype')) {
            throw 'Google Drive devolvio una pagina HTML en lugar del video. Verifica que el archivo siga compartido publicamente.'
        }
    }
    finally { $stream.Dispose() }
    return $size
}

function Download-DriveFile($Item, [string]$TargetPath) {
    $downloadUrl = "https://drive.usercontent.google.com/download?id=$($Item.DriveId)&export=download&confirm=t"
    if (Test-Path -LiteralPath $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force }
    Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $TargetPath -MaximumRedirection 10
    return Test-DownloadedVideo $TargetPath
}

function Upload-CloudflareFile([string]$Path, $Item, [string]$Token) {
    Add-Type -AssemblyName System.Net.Http
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Token)
    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    $fileStream = [System.IO.File]::OpenRead($Path)
    try {
        $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
        $streamContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue($Item.MimeType)
        $multipart.Add($streamContent, 'file', $Item.FileName)
        $httpResponse = $client.PostAsync($ApiBase, $multipart).GetAwaiter().GetResult()
        $responseText = $httpResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $httpResponse.IsSuccessStatusCode) {
            throw ("Cloudflare rechazo la subida directa. HTTP {0}. {1}" -f [int]$httpResponse.StatusCode,$responseText)
        }
        $response = $responseText | ConvertFrom-Json
        if (-not $response.success -or -not $response.result.uid) {
            $message = @($response.errors | ForEach-Object { $_.message }) -join '; '
            throw ("Cloudflare no devolvio UID. {0}" -f $message)
        }
        return [string]$response.result.uid
    }
    finally {
        if ($fileStream) { $fileStream.Dispose() }
        if ($multipart) { $multipart.Dispose() }
        if ($client) { $client.Dispose() }
    }
}

function Set-CheckpointFailure($Map, $Item, [string]$Message) {
    $Map[$Item.Code] = [pscustomobject]@{
        code = $Item.Code
        title = $Item.Title
        uid = $null
        driveId = $Item.DriveId
        sourceName = $Item.FileName
        importedNow = $false
        lastError = $Message
        lastAttemptUtc = [DateTime]::UtcNow.ToString('o')
    }
    Save-Checkpoint $Map
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - MIGRACION CLOUDFLARE STREAM - MODULO 2' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Este proceso NO guarda tu API token.' -ForegroundColor Yellow
Write-Host 'Origen: carpeta oficial de videos de Google Drive.'
Write-Host 'Incluye C2-01 a C2-18 y el contenido especial C2-PROMO.' -ForegroundColor Green
Write-Host 'Los archivos se descargan temporalmente a tu PC y se eliminan despues de subirlos.'
Write-Host 'El checkpoint evita duplicar videos si el proceso se interrumpe.' -ForegroundColor Yellow
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara en pantalla)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }

$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
$ExitCode = 0

try {
    if (-not (Test-Path -LiteralPath $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

    Write-Host ''
    Write-Host '1/4 Validando token y acceso a Cloudflare Stream...' -ForegroundColor Cyan
    $probe = Invoke-CfGetVideo -Uid 'fb0e5bf6bb1895fd021d7555d07ba034' -Headers $Headers
    if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
    Write-Host '    Token valido. Acceso a Stream confirmado.' -ForegroundColor Green

    $Checkpoint = Load-Checkpoint
    $UploadFailures = @()

    Write-Host ''
    Write-Host '2/4 Descargando desde Drive y subiendo a Cloudflare...' -ForegroundColor Cyan
    $n = 0
    foreach ($item in $Items) {
        $n++
        if ($Checkpoint.ContainsKey($item.Code) -and $Checkpoint[$item.Code].uid) {
            Write-Host ("    [{0}/{1}] {2} ya tiene UID {3}. Se omite." -f $n,$Items.Count,$item.Code,$Checkpoint[$item.Code].uid) -ForegroundColor DarkGray
            continue
        }

        $tempPath = Join-Path $TempDir $item.FileName
        try {
            Write-Host ("    [{0}/{1}] {2} - descargando..." -f $n,$Items.Count,$item.Code) -NoNewline
            $size = Download-DriveFile -Item $item -TargetPath $tempPath
            $sizeMB = [math]::Round($size / 1MB, 2)
            Write-Host (" {0} MB" -f $sizeMB) -ForegroundColor DarkGray
            if ($size -ge 200MB) {
                throw ("El archivo mide {0} MB y requiere subida TUS." -f $sizeMB)
            }

            Write-Host ("             {0} - subiendo a Cloudflare..." -f $item.Code) -NoNewline
            $uid = Upload-CloudflareFile -Path $tempPath -Item $item -Token $Token
            $Checkpoint[$item.Code] = [pscustomobject]@{
                code = $item.Code
                title = $item.Title
                uid = $uid
                driveId = $item.DriveId
                sourceName = $item.FileName
                importedNow = $true
                lastError = $null
                lastAttemptUtc = [DateTime]::UtcNow.ToString('o')
            }
            Save-Checkpoint $Checkpoint
            Write-Host (" UID {0}" -f $uid) -ForegroundColor Green
        }
        catch {
            $detail = Get-HttpErrorDetail $_
            Write-Host ' ERROR' -ForegroundColor Red
            Write-Host ("        {0}" -f $detail) -ForegroundColor Red
            Set-CheckpointFailure -Map $Checkpoint -Item $item -Message $detail
            $UploadFailures += [pscustomobject]@{
                lesson_code = $item.Code
                title = $item.Title
                stage = 'drive-download-or-upload'
                drive_id = $item.DriveId
                error = $detail
            }
        }
        finally {
            if (Test-Path -LiteralPath $tempPath) {
                try { Remove-Item -LiteralPath $tempPath -Force } catch {}
            }
        }
    }

    Write-Host ''
    Write-Host '3/4 Esperando a que los videos queden READY...' -ForegroundColor Cyan
    $FinalRows = @()
    $ProcessingFailures = @()
    $Deadline = (Get-Date).AddMinutes(35)

    foreach ($item in $Items) {
        if (-not $Checkpoint.ContainsKey($item.Code) -or -not $Checkpoint[$item.Code].uid) {
            Write-Host ("    {0}: SIN UID; queda pendiente." -f $item.Code) -ForegroundColor Yellow
            continue
        }

        $uid = [string]$Checkpoint[$item.Code].uid
        while ($true) {
            if ((Get-Date) -gt $Deadline) {
                $message = 'Tiempo de espera agotado antes de READY.'
                Write-Host ("    {0}: PENDIENTE - {1}" -f $item.Code,$message) -ForegroundColor Yellow
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='processing'; drive_id=$item.DriveId; error=$message }
                break
            }

            try { $detailResponse = Invoke-CfGetVideo -Uid $uid -Headers $Headers }
            catch {
                $detail = Get-HttpErrorDetail $_
                Write-Host ("    {0}: ERROR consultando UID {1}" -f $item.Code,$uid) -ForegroundColor Red
                Write-Host ("        {0}" -f $detail) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='status'; drive_id=$item.DriveId; error=$detail }
                break
            }

            if (-not $detailResponse.success) {
                $message = 'Cloudflare devolvio una respuesta no exitosa al consultar estado.'
                Write-Host ("    {0}: ERROR de estado." -f $item.Code) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='status'; drive_id=$item.DriveId; error=$message }
                break
            }

            $v = $detailResponse.result
            $state = [string]$v.status.state
            $pct = [string]$v.status.pctComplete
            if ($state -eq 'error') {
                $reason = [string]$v.status.errorReasonText
                if ([string]::IsNullOrWhiteSpace($reason)) { $reason = 'Cloudflare marco el video como error.' }
                Write-Host ("    {0}: ERROR - {1}" -f $item.Code,$reason) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='processing'; drive_id=$item.DriveId; error=$reason }
                break
            }

            if ($v.readyToStream -eq $true -or $state -eq 'ready') {
                $duration = 0
                if ($null -ne $v.duration) { $duration = [math]::Ceiling([double]$v.duration) }
                $FinalRows += [pscustomobject]@{
                    lesson_code = $item.Code
                    title = $item.Title
                    uid = [string]$v.uid
                    hls = [string]$v.playback.hls
                    dash = [string]$v.playback.dash
                    thumbnail = [string]$v.thumbnail
                    duration_seconds = [int]$duration
                    drive_id = $item.DriveId
                    source_name = $item.FileName
                    imported_now = [bool]$Checkpoint[$item.Code].importedNow
                }
                $Checkpoint[$item.Code].durationSeconds = [int]$duration
                Save-Checkpoint $Checkpoint
                Write-Host ("    {0} READY ({1}s)" -f $item.Code,$duration) -ForegroundColor Green
                break
            }

            if ([string]::IsNullOrWhiteSpace($pct)) { $pct = '?' }
            Write-Host ("    {0}: {1} {2}%" -f $item.Code,$state,$pct) -ForegroundColor DarkGray
            Start-Sleep -Seconds 5
        }
    }

    Write-Host ''
    Write-Host '4/4 Generando CSV, reporte y SQL para Supabase...' -ForegroundColor Cyan
    $SortedRows = @($FinalRows | Sort-Object lesson_code)
    if ($SortedRows.Count -gt 0) {
        $SortedRows | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8
        $SortedRows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
    }
    else { '[]' | Set-Content -LiteralPath $ReportPath -Encoding UTF8 }

    $AllFailures = @($UploadFailures + $ProcessingFailures | Sort-Object lesson_code -Unique)
    if ($AllFailures.Count -gt 0) { $AllFailures | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8 }
    else { '[]' | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8 }

    $readyCodes = @($SortedRows | ForEach-Object { $_.lesson_code })
    $missingCodes = @($Items | Where-Object { $readyCodes -notcontains $_.Code } | ForEach-Object { $_.Code })
    $isComplete = ($missingCodes.Count -eq 0)
    $SqlOutputPath = if ($isComplete) { $SqlPath } else { $PartialSqlPath }

    $sql = New-Object System.Collections.Generic.List[string]
    $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 2 · Cloudflare Stream')
    $sql.Add('-- Generado localmente por migrar-modulo2-cloudflare.ps1')
    $sql.Add('-- Incluye C2-01 a C2-18 y C2-PROMO.')
    if (-not $isComplete) {
        $sql.Add('-- ADVERTENCIA: MIGRACION PARCIAL. Faltan: ' + ($missingCodes -join ', '))
        $sql.Add('-- Vuelve a ejecutar el lanzador; el checkpoint evitara duplicados.')
    }
    $sql.Add('')
    $sql.Add('begin;')
    $sql.Add('')

    foreach ($row in $SortedRows) {
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
    $sql.Add('')
    $sql | Set-Content -LiteralPath $SqlOutputPath -Encoding UTF8

    Write-Host ''
    if ($isComplete) {
        Write-Host 'MIGRACION COMPLETA.' -ForegroundColor Green
        Write-Host ("    Videos listos: {0}/{1}" -f $SortedRows.Count,$Items.Count) -ForegroundColor Green
        Write-Host ("    Lecciones: 18/18") -ForegroundColor Green
        Write-Host ("    Contenido especial: 1/1") -ForegroundColor Green
        Write-Host ("    CSV: {0}" -f $CsvPath)
        Write-Host ("    Reporte: {0}" -f $ReportPath)
        Write-Host ("    SQL FINAL: {0}" -f $SqlPath) -ForegroundColor Green
        Write-Host ''
        Write-Host 'Siguiente paso: abre el SQL FINAL en Supabase y ejecutalo.' -ForegroundColor Cyan
        $ExitCode = 0
    }
    else {
        Write-Host 'MIGRACION PARCIAL: se conservaron todos los avances correctos.' -ForegroundColor Yellow
        Write-Host ("    Videos listos: {0}/{1}" -f $SortedRows.Count,$Items.Count)
        Write-Host ("    Pendientes: {0}" -f ($missingCodes -join ', ')) -ForegroundColor Yellow
        Write-Host ("    Errores detallados: {0}" -f $ErrorsPath)
        Write-Host ("    SQL PARCIAL: {0}" -f $PartialSqlPath) -ForegroundColor DarkYellow
        Write-Host ''
        Write-Host 'NO borres c2-cloudflare-checkpoint.json.' -ForegroundColor Yellow
        Write-Host 'Vuelve a ejecutar este lanzador: solo se reintentaran los pendientes.' -ForegroundColor Cyan
        $ExitCode = 2
    }
}
catch {
    $detail = Get-HttpErrorDetail $_
    Write-Host ''
    Write-Host 'ERROR GENERAL:' -ForegroundColor Red
    Write-Host $detail -ForegroundColor Red
    Write-Host ''
    Write-Host 'No borres c2-cloudflare-checkpoint.json. Puedes volver a ejecutar el lanzador.' -ForegroundColor Yellow
    $ExitCode = 1
}
finally {
    if (Test-Path -LiteralPath $TempDir) {
        try { Remove-Item -LiteralPath $TempDir -Recurse -Force } catch {}
    }
    $Token = $null
    if ($secureToken) { $secureToken.Dispose() }
    [GC]::Collect()
}

exit $ExitCode
