# Academia AG - Utah Driver Success Program V2
# Migrador local: Wix -> Cloudflare Stream -> SQL para Supabase
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
$ReportPath = Join-Path $ScriptDir 'utah-c1-cloudflare-report.json'

# C1-01 y C1-02 ya fueron subidos y validados manualmente.
# C1-03 a C1-13 se importan directamente desde los MP4 720p alojados en Wix.
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
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Save-Checkpoint($Map) {
    $out = @{}
    foreach ($key in $Map.Keys) {
        $out[$key] = $Map[$key]
    }
    $out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Load-Checkpoint {
    $map = @{}
    if (Test-Path -LiteralPath $CheckpointPath) {
        try {
            $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
            foreach ($p in $raw.PSObject.Properties) {
                $map[$p.Name] = $p.Value
            }
        }
        catch {
            Write-Warning "No se pudo leer el checkpoint anterior. Se iniciara uno nuevo."
        }
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

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - MIGRACION CLOUDFLARE STREAM - MODULO 1' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Este proceso NO guarda tu API token.' -ForegroundColor Yellow
Write-Host 'Importara C1-03 a C1-13 desde Wix y conservara C1-01/C1-02.'
Write-Host 'C1-PROMO queda fuera hasta localizar el archivo correcto.'
Write-Host ''

$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara en pantalla)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) {
    throw 'No se recibio un API token.'
}

$Headers = @{
    Authorization = "Bearer $Token"
    Accept = 'application/json'
}

try {
    Write-Host ''
    Write-Host '1/4 Validando token y acceso a Stream...' -ForegroundColor Cyan
    $probe = Invoke-CfGetVideo -Uid 'fb0e5bf6bb1895fd021d7555d07ba034' -Headers $Headers
    if (-not $probe.success) {
        throw 'Cloudflare rechazo la validacion del token.'
    }
    Write-Host '    Token valido. Acceso a Stream confirmado.' -ForegroundColor Green

    $Checkpoint = Load-Checkpoint

    # Sembrar los UID ya existentes.
    foreach ($item in $Items | Where-Object { $_.ExistingUid }) {
        if (-not $Checkpoint.ContainsKey($item.Code)) {
            $Checkpoint[$item.Code] = [pscustomobject]@{
                code = $item.Code
                title = $item.Title
                uid = $item.ExistingUid
                sourceUrl = $item.SourceUrl
                importedNow = $false
            }
        }
    }
    Save-Checkpoint $Checkpoint

    Write-Host ''
    Write-Host '2/4 Enviando importaciones Wix -> Cloudflare...' -ForegroundColor Cyan
    $ToImport = $Items | Where-Object { -not $_.ExistingUid }
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
        $response = Invoke-RestMethod -Method Post -Uri "$ApiBase/copy" -Headers $Headers -ContentType 'application/json' -Body $body
        if (-not $response.success -or -not $response.result.uid) {
            $message = ($response.errors | ForEach-Object { $_.message }) -join '; '
            throw "Cloudflare no acepto $($item.Code). $message"
        }

        $uid = [string]$response.result.uid
        $Checkpoint[$item.Code] = [pscustomobject]@{
            code = $item.Code
            title = $item.Title
            uid = $uid
            sourceUrl = $item.SourceUrl
            importedNow = $true
        }
        Save-Checkpoint $Checkpoint
        Write-Host " UID $uid" -ForegroundColor Green
    }

    Write-Host ''
    Write-Host '3/4 Esperando a que los videos queden listos...' -ForegroundColor Cyan
    $FinalRows = @()
    $Deadline = (Get-Date).AddMinutes(20)

    foreach ($item in $Items) {
        if (-not $Checkpoint.ContainsKey($item.Code) -or -not $Checkpoint[$item.Code].uid) {
            throw "Falta UID para $($item.Code)."
        }

        $uid = [string]$Checkpoint[$item.Code].uid
        while ($true) {
            if ((Get-Date) -gt $Deadline) {
                throw "Tiempo de espera agotado. Ejecuta de nuevo la herramienta; el checkpoint evitara duplicados."
            }

            $detailResponse = Invoke-CfGetVideo -Uid $uid -Headers $Headers
            if (-not $detailResponse.success) {
                throw "No se pudo consultar $($item.Code) ($uid)."
            }

            $v = $detailResponse.result
            $state = [string]$v.status.state
            $pct = [string]$v.status.pctComplete

            if ($state -eq 'error') {
                throw "Cloudflare marco ERROR en $($item.Code): $($v.status.errorReasonText)"
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
                    source_url = $item.SourceUrl
                    imported_now = [bool]$Checkpoint[$item.Code].importedNow
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
    $FinalRows | Sort-Object lesson_code | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8
    $FinalRows | Sort-Object lesson_code | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8

    $sql = New-Object System.Collections.Generic.List[string]
    $sql.Add('-- Academia AG · Utah Driver V2 · Modulo 1 · Cloudflare Stream')
    $sql.Add('-- Generado localmente por migrar-modulo1-cloudflare.ps1')
    $sql.Add('-- C1-PROMO no se modifica.')
    $sql.Add('')
    $sql.Add('begin;')
    $sql.Add('')

    foreach ($row in ($FinalRows | Sort-Object lesson_code)) {
        $sql.Add("update public.lessons")
        $sql.Add('set')
        $sql.Add("  video_url = null,")
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
    $sql.Add('-- VERIFICACION: deben aparecer 13 lecciones con Stream y el promo debe seguir vacio.')
    $sql.Add('select')
    $sql.Add('  count(*) filter (where lesson_code ~ ''^C1-[0-9]{2}$'' and stream_uid is not null) as c1_con_stream,')
    $sql.Add('  count(*) filter (where lesson_code = ''C1-PROMO'' and stream_uid is not null) as promo_con_stream,')
    $sql.Add('  count(*) filter (where lesson_code ~ ''^C1-[0-9]{2}$'' and video_url is not null) as legacy_restante')
    $sql.Add('from public.lessons')
    $sql.Add("where module_id = '$ModuleId'::uuid;")
    $sql.Add('')
    $sql.Add('select lesson_code, title, stream_uid, stream_duration_seconds')
    $sql.Add('from public.lessons')
    $sql.Add("where module_id = '$ModuleId'::uuid")
    $sql.Add('order by position;')

    $sql | Set-Content -LiteralPath $SqlPath -Encoding UTF8

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGreen
    Write-Host ' MIGRACION DE CLOUDFLARE COMPLETADA' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor DarkGreen
    Write-Host ''
    Write-Host "CSV:     $CsvPath"
    Write-Host "Reporte: $ReportPath"
    Write-Host "SQL:     $SqlPath" -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'SIGUIENTE PASO:' -ForegroundColor Cyan
    Write-Host 'Abre utah-c1-cloudflare-map.sql, copia TODO y ejecutalo una sola vez en Supabase.'
    Write-Host 'La verificacion final debe dar: c1_con_stream=13, promo_con_stream=0, legacy_restante=0.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Cuando termines la migracion completa, revoca el API token temporal de Cloudflare.' -ForegroundColor Yellow
}
catch {
    Write-Host ''
    Write-Host 'ERROR:' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'No borres c1-cloudflare-checkpoint.json. Vuelve a ejecutar la herramienta para continuar sin duplicar lo ya importado.' -ForegroundColor Yellow
    exit 1
}
finally {
    # Eliminar la referencia al token en cuanto termina el proceso.
    $Token = $null
    $secureToken = $null
}
