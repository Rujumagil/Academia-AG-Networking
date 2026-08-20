# Academia AG - Utah Driver Success Program V2
# Migrador local: Wix -> Cloudflare Stream -> SQL para Supabase
# V2 robusta: conserva checkpoint, muestra errores HTTP detallados y continua
# con las siguientes lecciones aunque una importacion individual falle.
# NO guarda el API token. El token solo vive en memoria durante esta ejecucion.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$CourseId = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'
$ModuleId = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c1-cloudflare-checkpoint.json'
$CsvPath = Join-Path $ScriptDir 'utah-c1-cloudflare-map.csv'
$SqlPath = Join-Path $ScriptDir 'utah-c1-cloudflare-map.sql'
$PartialSqlPath = Join-Path $ScriptDir 'utah-c1-cloudflare-map-PARCIAL.sql'
$ReportPath = Join-Path $ScriptDir 'utah-c1-cloudflare-report.json'
$ErrorsPath = Join-Path $ScriptDir 'utah-c1-cloudflare-errors.json'

$Items = @(
    [pscustomobject]@{ Code='C1-01'; Title='Tu primer paso hacia la licencia'; ExistingUid='fb0e5bf6bb1895fd021d7555d07ba034'; SourceUrl=$null },
    [pscustomobject]@{ Code='C1-02'; Title='¿Quién necesita una licencia de Utah?'; ExistingUid='4e776dc5f591aaea960f755bc383e3bc'; SourceUrl='https://video.wixstatic.com/video/11f124_8fae233c7c184ad9b7ed1e4f7aed8897/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-03'; Title='¿Quién Puede Manejar sin Obtener una Licencia de Utah?'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_f0c786eac0d4444b87efa28100906b98/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-04'; Title='¿Qué es el Learner Permit?'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_66505b1a87b34d28b30e6c681497330d/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-05'; Title='¿Cuánto Tiempo Debes Mantener tu Learner Permit?'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_30747b689864408d9fc4e4491f7ca1a7/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-06'; Title='Conductores Jóvenes: Restricciones Importantes'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_59d49aabbc244451a13309afd9db4660/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-07'; Title='Provisional Class D'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_c2acdb71d46a4cb0b3fcfb38022a9b01/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-08'; Title='Limited-Term Driver License'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_72942e7c6d134f15b55bbb8619055664/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-09'; Title='Driving Privilege Card — DPC'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_95fe9fba0e7248808749897ca5a00162/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-10'; Title='Documentos que debes preparar'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_3b5bfe4fe33c412c8c2beebb3a0c7455/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-11'; Title='Renovación, reemplazo y cambio de dirección'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_f969136419834af1a67ba36ce6ade6c5/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-12'; Title='Caso práctico: ¿qué trámite necesita cada persona?'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_00156e60ad9e40c5844285969c0a9a08/720p/mp4/file.mp4' },
    [pscustomobject]@{ Code='C1-13'; Title='Resumen'; ExistingUid=$null; SourceUrl='https://video.wixstatic.com/video/11f124_ed3c2b1bbf1d4ccc84e168d583c337bd/720p/mp4/file.mp4' }
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
        $response = $ErrorRecord.Exception.Response
        if ($null -ne $response) {
            try { if ($null -ne $response.StatusCode) { $parts.Add("HTTP $([int]$response.StatusCode) $($response.StatusCode)") } } catch {}
            try {
                $stream = $response.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    try {
                        $body = $reader.ReadToEnd()
                        if (-not [string]::IsNullOrWhiteSpace($body)) { $parts.Add($body) }
                    }
                    finally { $reader.Dispose() }
                }
            } catch {}
            try {
                if ($response.Content) {
                    $body2 = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                    if (-not [string]::IsNullOrWhiteSpace($body2)) { $parts.Add($body2) }
                }
            } catch {}
        }
    } catch {}
    try {
        if (-not [string]::IsNullOrWhiteSpace([string]$ErrorRecord.Exception.Message)) {
            $parts.Add([string]$ErrorRecord.Exception.Message)
        }
    } catch {}
    $clean = @($parts | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
    if ($clean.Count -eq 0) { return 'Error HTTP sin detalle adicional.' }
    return ($clean -join ' | ')
}

function Get-CloudflareResponseErrors($Response) {
    if ($null -eq $Response) { return 'Respuesta vacia de Cloudflare.' }
    try {
        $messages = @($Response.errors | ForEach-Object {
            if ($_.code -and $_.message) { "[$($_.code)] $($_.message)" }
            elseif ($_.message) { [string]$_.message }
            else { $_ | ConvertTo-Json -Compress -Depth 6 }
        } | Where-Object { $_ })
        if ($messages.Count -gt 0) { return ($messages -join '; ') }
    } catch {}
    return ($Response | ConvertTo-Json -Compress -Depth 8)
}

function Set-CheckpointFailure($Map, $Item, [string]$Message) {
    $Map[$Item.Code] = [pscustomobject]@{
        code = $Item.Code
        title = $Item.Title
        uid = $null
        sourceUrl = $Item.SourceUrl
        importedNow = $false
        lastError = $Message
        lastAttemptUtc = [DateTime]::UtcNow.ToString('o')
    }
    Save-Checkpoint $Map
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - MIGRACION CLOUDFLARE STREAM - MODULO 1' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Este proceso NO guarda tu API token.' -ForegroundColor Yellow
Write-Host 'Importara C1-03 a C1-13 desde Wix y conservara C1-01/C1-02.'
Write-Host 'Si una leccion falla, la herramienta continuara con las siguientes.' -ForegroundColor Yellow
Write-Host 'El checkpoint evita duplicar los videos ya importados.' -ForegroundColor Yellow
Write-Host 'C1-PROMO queda fuera hasta localizar el archivo correcto.'
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara en pantalla)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }

$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
$ExitCode = 0

try {
    Write-Host ''
    Write-Host '1/4 Validando token y acceso a Stream...' -ForegroundColor Cyan
    $probe = Invoke-CfGetVideo -Uid 'fb0e5bf6bb1895fd021d7555d07ba034' -Headers $Headers
    if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
    Write-Host '    Token valido. Acceso a Stream confirmado.' -ForegroundColor Green

    $Checkpoint = Load-Checkpoint
    foreach ($item in $Items | Where-Object { $_.ExistingUid }) {
        if (-not $Checkpoint.ContainsKey($item.Code) -or -not $Checkpoint[$item.Code].uid) {
            $Checkpoint[$item.Code] = [pscustomobject]@{
                code = $item.Code; title = $item.Title; uid = $item.ExistingUid; sourceUrl = $item.SourceUrl
                importedNow = $false; lastError = $null; lastAttemptUtc = $null
            }
        }
    }
    Save-Checkpoint $Checkpoint

    Write-Host ''
    Write-Host '2/4 Enviando importaciones Wix -> Cloudflare...' -ForegroundColor Cyan
    $ToImport = @($Items | Where-Object { -not $_.ExistingUid })
    $ImportFailures = @()
    $n = 0
    foreach ($item in $ToImport) {
        $n++
        if ($Checkpoint.ContainsKey($item.Code) -and $Checkpoint[$item.Code].uid) {
            Write-Host ("    [{0}/{1}] {2} ya tiene UID {3}. Se omite reimportacion." -f $n,$ToImport.Count,$item.Code,$Checkpoint[$item.Code].uid) -ForegroundColor DarkGray
            continue
        }

        Write-Host ("    [{0}/{1}] Importando {2}..." -f $n,$ToImport.Count,$item.Code) -NoNewline
        $bodyObject = @{
            input = $item.SourceUrl
            name = "$($item.Code).mp4"
            requireSignedURLs = $false
            meta = @{
                name = "$($item.Code).mp4"
                lesson_code = $item.Code
                lesson_title = $item.Title
                course = 'Utah Driver Success Program V2'
                source = 'wix-batch-migration'
            }
        }
        $body = $bodyObject | ConvertTo-Json -Depth 6

        try {
            $response = Invoke-RestMethod -Method Post -Uri "$ApiBase/copy" -Headers $Headers -ContentType 'application/json' -Body $body
        }
        catch {
            $detail = Get-HttpErrorDetail $_
            Write-Host ' ERROR' -ForegroundColor Red
            Write-Host ("        {0}" -f $detail) -ForegroundColor Red
            Write-Host ("        Fuente Wix: {0}" -f $item.SourceUrl) -ForegroundColor DarkYellow
            Set-CheckpointFailure -Map $Checkpoint -Item $item -Message $detail
            $ImportFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='copy'; source_url=$item.SourceUrl; error=$detail }
            continue
        }

        if (-not $response.success -or -not $response.result.uid) {
            $detail = Get-CloudflareResponseErrors $response
            Write-Host ' RECHAZADO' -ForegroundColor Red
            Write-Host ("        {0}" -f $detail) -ForegroundColor Red
            Write-Host ("        Fuente Wix: {0}" -f $item.SourceUrl) -ForegroundColor DarkYellow
            Set-CheckpointFailure -Map $Checkpoint -Item $item -Message $detail
            $ImportFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='copy'; source_url=$item.SourceUrl; error=$detail }
            continue
        }

        $uid = [string]$response.result.uid
        $Checkpoint[$item.Code] = [pscustomobject]@{
            code=$item.Code; title=$item.Title; uid=$uid; sourceUrl=$item.SourceUrl
            importedNow=$true; lastError=$null; lastAttemptUtc=[DateTime]::UtcNow.ToString('o')
        }
        Save-Checkpoint $Checkpoint
        Write-Host " UID $uid" -ForegroundColor Green
    }

    Write-Host ''
    Write-Host '3/4 Esperando a que los videos queden listos...' -ForegroundColor Cyan
    $FinalRows = @()
    $ProcessingFailures = @()
    $Deadline = (Get-Date).AddMinutes(30)

    foreach ($item in $Items) {
        if (-not $Checkpoint.ContainsKey($item.Code) -or -not $Checkpoint[$item.Code].uid) {
            Write-Host ("    {0}: SIN UID; se deja pendiente para el siguiente intento." -f $item.Code) -ForegroundColor Yellow
            if (-not ($ImportFailures | Where-Object { $_.lesson_code -eq $item.Code })) {
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='checkpoint'; source_url=$item.SourceUrl; error='Sin UID en checkpoint.' }
            }
            continue
        }

        $uid = [string]$Checkpoint[$item.Code].uid
        while ($true) {
            if ((Get-Date) -gt $Deadline) {
                $message = 'Tiempo de espera agotado antes de que Cloudflare reportara READY.'
                Write-Host ("    {0}: PENDIENTE - {1}" -f $item.Code,$message) -ForegroundColor Yellow
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='processing'; source_url=$item.SourceUrl; error=$message }
                break
            }

            try { $detailResponse = Invoke-CfGetVideo -Uid $uid -Headers $Headers }
            catch {
                $detail = Get-HttpErrorDetail $_
                Write-Host ("    {0}: ERROR consultando UID {1}" -f $item.Code,$uid) -ForegroundColor Red
                Write-Host ("        {0}" -f $detail) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='status'; source_url=$item.SourceUrl; error=$detail }
                break
            }

            if (-not $detailResponse.success) {
                $detail = Get-CloudflareResponseErrors $detailResponse
                Write-Host ("    {0}: ERROR de Cloudflare al consultar estado." -f $item.Code) -ForegroundColor Red
                Write-Host ("        {0}" -f $detail) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='status'; source_url=$item.SourceUrl; error=$detail }
                break
            }

            $v = $detailResponse.result
            $state = [string]$v.status.state
            $pct = [string]$v.status.pctComplete
            if ($state -eq 'error') {
                $reason = [string]$v.status.errorReasonText
                if ([string]::IsNullOrWhiteSpace($reason)) { $reason = 'Cloudflare marco el video como error.' }
                Write-Host ("    {0}: ERROR - {1}" -f $item.Code,$reason) -ForegroundColor Red
                $ProcessingFailures += [pscustomobject]@{ lesson_code=$item.Code; title=$item.Title; stage='processing'; source_url=$item.SourceUrl; error=$reason }
                break
            }

            if ($v.readyToStream -eq $true -or $state -eq 'ready') {
                $duration = 0
                if ($null -ne $v.duration) { $duration = [math]::Ceiling([double]$v.duration) }
                $FinalRows += [pscustomobject]@{
                    lesson_code=$item.Code; title=$item.Title; uid=[string]$v.uid; hls=[string]$v.playback.hls
                    dash=[string]$v.playback.dash; thumbnail=[string]$v.thumbnail; duration_seconds=[int]$duration
                    source_url=$item.SourceUrl; imported_now=[bool]$Checkpoint[$item.Code].importedNow
                }
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
    } else { '[]' | Set-Content -LiteralPath $ReportPath -Encoding UTF8 }

    $AllFailures = @($ImportFailures + $ProcessingFailures | Sort-Object lesson_code -Unique)
    if ($AllFailures.Count -gt 0) { $AllFailures | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8 }
    else { '[]' | Set-Content -LiteralPath $ErrorsPath -Encoding UTF8 }

    $readyCodes = @($SortedRows | ForEach-Object { $_.lesson_code })
    $missingCodes = @($Items | Where-Object { $readyCodes -notcontains $_.Code } | ForEach-Object { $_.Code })
    $isComplete = ($missingCodes.Count -eq 0)
    $SqlOutputPath = if ($isComplete) { $SqlPath } else { $PartialSqlPath }

    $sql = New-Object System.Collections.Generic.List[string]
    $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 1 · Cloudflare Stream')
    $sql.Add('-- Generado localmente por migrar-modulo1-cloudflare.ps1')
    $sql.Add('-- C1-PROMO no se modifica.')
    if (-not $isComplete) {
        $sql.Add('-- ADVERTENCIA: MIGRACION PARCIAL. Faltan: ' + ($missingCodes -join ', '))
        $sql.Add('-- Recomendado: corrige las fuentes pendientes y vuelve a ejecutar antes de usar el SQL final.')
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
    $sql.Add('-- VERIFICACION: al finalizar correctamente deben aparecer 13 lecciones con Stream y el promo debe seguir vacio.')
    $sql.Add('select')
    $sql.Add("  count(*) filter (where lesson_code ~ '^C1-[0-9]{2}$' and stream_uid is not null) as c1_con_stream,")
    $sql.Add("  count(*) filter (where lesson_code = 'C1-PROMO' and stream_uid is not null) as promo_con_stream,")
    $sql.Add("  count(*) filter (where lesson_code ~ '^C1-[0-9]{2}$' and video_url is not null) as legacy_restante")
    $sql.Add('from public.lessons')
    $sql.Add("where module_id = '$ModuleId'::uuid;")
    $sql.Add('')
    $sql.Add('select lesson_code, title, stream_uid, stream_duration_seconds')
    $sql.Add('from public.lessons')
    $sql.Add("where module_id = '$ModuleId'::uuid")
    $sql.Add("  and lesson_code ~ '^C1-[0-9]{2}$'")
    $sql.Add('order by lesson_code;')
    $sql.Add('')
    $sql | Set-Content -LiteralPath $SqlOutputPath -Encoding UTF8

    Write-Host ''
    if ($isComplete) {
        Write-Host 'MIGRACION COMPLETA.' -ForegroundColor Green
        Write-Host ("    Videos listos: {0}/{1}" -f $SortedRows.Count,$Items.Count) -ForegroundColor Green
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
        Write-Host 'NO borres c1-cloudflare-checkpoint.json.' -ForegroundColor Yellow
        Write-Host 'Vuelve a ejecutar el lanzador: los UID existentes se omitiran y solo se reintentaran los pendientes.' -ForegroundColor Cyan
        Write-Host 'Si C1-09 vuelve a fallar, copia el detalle rojo completo; ahora Cloudflare mostrara el motivo real.' -ForegroundColor Cyan
        $ExitCode = 2
    }
}
catch {
    $detail = Get-HttpErrorDetail $_
    Write-Host ''
    Write-Host 'ERROR GENERAL:' -ForegroundColor Red
    Write-Host $detail -ForegroundColor Red
    Write-Host ''
    Write-Host 'No borres c1-cloudflare-checkpoint.json. Puedes volver a ejecutar el lanzador.' -ForegroundColor Yellow
    $ExitCode = 1
}
finally {
    $Token = $null
    $secureToken = $null
    [GC]::Collect()
}

exit $ExitCode
