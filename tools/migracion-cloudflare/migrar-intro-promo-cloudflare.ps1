# Academia AG - Utah Driver Success Program V2
# Migrador local: INTRO-01 + C1-PROMO -> Cloudflare Stream -> SQL para Supabase
# NO guarda el API token. El token solo vive en memoria durante esta ejecucion.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'utah-intro-promo-cloudflare-checkpoint.json'
$SqlPath = Join-Path $ScriptDir 'utah-intro-promo-cloudflare.sql'
$ReportPath = Join-Path $ScriptDir 'utah-intro-promo-cloudflare-report.json'

$Items = @(
    [pscustomobject]@{
        Code = 'INTRO-01'
        Title = 'Bienvenida y cómo usar el curso'
        ModuleId = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'
        DialogTitle = 'Selecciona el video de INTRODUCCION GENERAL - Bienvenida y cómo usar el curso'
    },
    [pscustomobject]@{
        Code = 'C1-PROMO'
        Title = 'Contenido especial del módulo'
        ModuleId = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'
        DialogTitle = 'Selecciona el video de CONTENIDO ESPECIAL DEL MODULO 1'
    }
)

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Load-Checkpoint {
    $map = @{}
    if (Test-Path -LiteralPath $CheckpointPath) {
        try {
            $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
            foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
        }
        catch {
            Write-Warning 'No se pudo leer el checkpoint anterior. Se iniciara uno nuevo.'
        }
    }
    return $map
}

function Save-Checkpoint($Map) {
    $out = @{}
    foreach ($key in $Map.Keys) { $out[$key] = $Map[$key] }
    $out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
}

function Invoke-CfGetVideo($Uid, $Headers) {
    return Invoke-RestMethod -Method Get -Uri "$ApiBase/$Uid" -Headers $Headers
}

function Get-SqlLiteral([string]$Value) {
    if ($null -eq $Value) { return 'null' }
    return "'" + $Value.Replace("'", "''") + "'"
}

function Get-ContentType([string]$Path) {
    switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.mp4'  { return 'video/mp4' }
        '.m4v'  { return 'video/x-m4v' }
        '.mov'  { return 'video/quicktime' }
        '.webm' { return 'video/webm' }
        default { return 'application/octet-stream' }
    }
}

function Select-VideoFile([string]$Title) {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $Title
    $dialog.Filter = 'Videos (*.mp4;*.m4v;*.mov;*.webm)|*.mp4;*.m4v;*.mov;*.webm|Todos los archivos (*.*)|*.*'
    $dialog.Multiselect = $false
    $dialog.CheckFileExists = $true
    $dialog.CheckPathExists = $true
    try {
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            return $dialog.FileName
        }
        return $null
    }
    finally {
        $dialog.Dispose()
    }
}

function Upload-Video([string]$Path, [string]$Code, [string]$Token) {
    $size = (Get-Item -LiteralPath $Path).Length
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Host "    Archivo: $([IO.Path]::GetFileName($Path)) ($sizeMB MB)" -ForegroundColor DarkGray
    if ($size -le 0) { throw "$Code: el archivo seleccionado esta vacio." }
    if ($size -ge 200MB) {
        throw "$Code: el archivo mide $sizeMB MB. Esta herramienta usa subida simple y requiere un archivo menor de 200 MB."
    }

    Add-Type -AssemblyName System.Net.Http
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Token)
    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    $fileStream = [System.IO.File]::OpenRead($Path)
    try {
        $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
        $streamContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue((Get-ContentType $Path))
        $uploadName = "$Code$([IO.Path]::GetExtension($Path).ToLowerInvariant())"
        $multipart.Add($streamContent, 'file', $uploadName)
        $httpResponse = $client.PostAsync($ApiBase, $multipart).GetAwaiter().GetResult()
        $responseText = $httpResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $httpResponse.IsSuccessStatusCode) {
            throw "$Code: Cloudflare rechazo la subida directa. HTTP $([int]$httpResponse.StatusCode). $responseText"
        }
        return ($responseText | ConvertFrom-Json)
    }
    finally {
        if ($fileStream) { $fileStream.Dispose() }
        if ($multipart) { $multipart.Dispose() }
        if ($client) { $client.Dispose() }
    }
}

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - INTRODUCCION + CONTENIDO ESPECIAL - CLOUDFLARE' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Esta herramienta NO toca C1-01 a C1-13.' -ForegroundColor Yellow
Write-Host 'Subira solamente INTRO-01 y C1-PROMO desde archivos de video de tu PC.'
Write-Host 'Al final generara un SQL complementario para Supabase.'
Write-Host ''

$Checkpoint = Load-Checkpoint
$secureToken = Read-Host 'Pega tu API Token de Cloudflare (no se mostrara en pantalla)' -AsSecureString
$Token = ConvertTo-PlainText $secureToken
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No se recibio un API token.' }
$Headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }

try {
    Write-Host ''
    Write-Host '1/4 Validando acceso a Cloudflare Stream...' -ForegroundColor Cyan
    $probe = Invoke-CfGetVideo -Uid 'fb0e5bf6bb1895fd021d7555d07ba034' -Headers $Headers
    if (-not $probe.success) { throw 'Cloudflare rechazo la validacion del token.' }
    Write-Host '    Token valido.' -ForegroundColor Green

    Write-Host ''
    Write-Host '2/4 Seleccionando y subiendo los dos videos faltantes...' -ForegroundColor Cyan

    foreach ($item in $Items) {
        if ($Checkpoint.ContainsKey($item.Code) -and $Checkpoint[$item.Code].uid) {
            $existingUid = [string]$Checkpoint[$item.Code].uid
            try {
                $existing = Invoke-CfGetVideo -Uid $existingUid -Headers $Headers
                if ($existing.success) {
                    Write-Host "    $($item.Code) ya tiene UID $existingUid. Se omite nueva subida." -ForegroundColor DarkGray
                    continue
                }
            }
            catch { }
        }

        Write-Host ''
        Write-Host "    $($item.Code) - $($item.Title)" -ForegroundColor White
        Write-Host '    Se abrira una ventana para elegir el archivo correcto.' -ForegroundColor DarkGray
        $selected = Select-VideoFile -Title $item.DialogTitle
        if ([string]::IsNullOrWhiteSpace($selected)) {
            throw "$($item.Code): no se selecciono ningun archivo. Puedes volver a ejecutar la herramienta sin perder avances."
        }

        Write-Host "    Subiendo $($item.Code)..." -ForegroundColor Cyan
        $response = Upload-Video -Path $selected -Code $item.Code -Token $Token
        if (-not $response.success -or -not $response.result.uid) {
            $message = ($response.errors | ForEach-Object { $_.message }) -join '; '
            throw "Cloudflare no devolvio UID para $($item.Code). $message"
        }

        $uid = [string]$response.result.uid
        $Checkpoint[$item.Code] = [pscustomobject]@{
            code = $item.Code
            title = $item.Title
            moduleId = $item.ModuleId
            uid = $uid
            localFile = [IO.Path]::GetFileName($selected)
            importedNow = $true
            ready = $false
        }
        Save-Checkpoint $Checkpoint
        Write-Host "    UID recibido: $uid" -ForegroundColor Green
    }

    Write-Host ''
    Write-Host '3/4 Esperando a que INTRO-01 y C1-PROMO queden READY...' -ForegroundColor Cyan
    $FinalRows = @()
    $deadline = (Get-Date).AddMinutes(20)

    foreach ($item in $Items) {
        if (-not $Checkpoint.ContainsKey($item.Code) -or -not $Checkpoint[$item.Code].uid) {
            throw "Falta UID para $($item.Code)."
        }

        $uid = [string]$Checkpoint[$item.Code].uid
        while ($true) {
            if ((Get-Date) -gt $deadline) {
                throw 'Tiempo de espera agotado. Los UID ya fueron guardados; vuelve a ejecutar la herramienta mas tarde.'
            }

            $detail = Invoke-CfGetVideo -Uid $uid -Headers $Headers
            if (-not $detail.success) { throw "No se pudo consultar $($item.Code) ($uid)." }
            $v = $detail.result
            $state = [string]$v.status.state
            $pct = [string]$v.status.pctComplete

            if ($state -eq 'error') { throw "Cloudflare marco ERROR en $($item.Code): $($v.status.errorReasonText)" }

            if ($v.readyToStream -eq $true -or $state -eq 'ready') {
                $duration = 0
                if ($null -ne $v.duration) { $duration = [math]::Ceiling([double]$v.duration) }
                $Checkpoint[$item.Code] = [pscustomobject]@{
                    code = $item.Code
                    title = $item.Title
                    moduleId = $item.ModuleId
                    uid = [string]$v.uid
                    hls = [string]$v.playback.hls
                    dash = [string]$v.playback.dash
                    thumbnail = [string]$v.thumbnail
                    durationSeconds = [int]$duration
                    localFile = $Checkpoint[$item.Code].localFile
                    importedNow = [bool]$Checkpoint[$item.Code].importedNow
                    ready = $true
                }
                Save-Checkpoint $Checkpoint
                $FinalRows += $Checkpoint[$item.Code]
                Write-Host "    $($item.Code) READY ($duration s)" -ForegroundColor Green
                break
            }

            if ([string]::IsNullOrWhiteSpace($pct)) { $pct = '?' }
            Write-Host "    $($item.Code): $state $pct%" -ForegroundColor DarkGray
            Start-Sleep -Seconds 5
        }
    }

    Write-Host ''
    Write-Host '4/4 Generando SQL complementario y reporte...' -ForegroundColor Cyan
    $FinalRows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8

    $sql = New-Object System.Collections.Generic.List[string]
    $sql.Add('-- Academia AG · Utah Driver V2 · Introduccion + C1-PROMO · Cloudflare Stream')
    $sql.Add('-- Generado por migrar-intro-promo-cloudflare.ps1')
    $sql.Add('-- No modifica C1-01 a C1-13.')
    $sql.Add('')
    $sql.Add('begin;')
    $sql.Add('')

    foreach ($row in $FinalRows) {
        $sql.Add('update public.lessons')
        $sql.Add('set')
        $sql.Add('  video_url = null,')
        $sql.Add("  stream_provider = 'cloudflare',")
        $sql.Add("  stream_uid = $(Get-SqlLiteral $row.uid),")
        $sql.Add("  stream_hls_url = $(Get-SqlLiteral $row.hls),")
        $sql.Add("  stream_dash_url = $(Get-SqlLiteral $row.dash),")
        $sql.Add("  stream_thumbnail_url = $(Get-SqlLiteral $row.thumbnail),")
        $sql.Add("  stream_duration_seconds = $($row.durationSeconds),")
        $sql.Add('  updated_at = now()')
        $sql.Add("where module_id = '$($row.moduleId)'::uuid")
        $sql.Add("  and lesson_code = '$($row.code)';")
        $sql.Add('')
    }

    $sql.Add('commit;')
    $sql.Add('')
    $sql.Add('-- VERIFICACION: ambos valores deben ser 1.')
    $sql.Add('select')
    $sql.Add("  count(*) filter (where lesson_code = 'INTRO-01' and stream_uid is not null) as intro_con_stream,")
    $sql.Add("  count(*) filter (where lesson_code = 'C1-PROMO' and stream_uid is not null) as c1_promo_con_stream")
    $sql.Add('from public.lessons')
    $sql.Add("where (module_id = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid and lesson_code = 'INTRO-01')")
    $sql.Add("   or (module_id = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid and lesson_code = 'C1-PROMO');")
    $sql.Add('')
    $sql.Add('select lesson_code, title, stream_uid, stream_duration_seconds')
    $sql.Add('from public.lessons')
    $sql.Add("where lesson_code in ('INTRO-01','C1-PROMO')")
    $sql.Add("  and module_id in ('7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid,'7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid)")
    $sql.Add('order by lesson_code;')

    $sql | Set-Content -LiteralPath $SqlPath -Encoding UTF8

    Write-Host ''
    Write-Host 'MIGRACION DE EXTRAS COMPLETA.' -ForegroundColor Green
    Write-Host '    INTRO-01: READY' -ForegroundColor Green
    Write-Host '    C1-PROMO: READY' -ForegroundColor Green
    Write-Host "    SQL FINAL: $SqlPath" -ForegroundColor Cyan
    Write-Host "    Reporte: $ReportPath" -ForegroundColor DarkGray
    Write-Host ''
    Write-Host 'Siguiente paso: abre el SQL FINAL en Supabase y ejecutalo.' -ForegroundColor Cyan
    Write-Host 'La verificacion debe mostrar intro_con_stream = 1 y c1_promo_con_stream = 1.' -ForegroundColor Cyan
    exit 0
}
catch {
    Write-Host ''
    Write-Host 'ERROR:' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host "No borres $CheckpointPath. Vuelve a ejecutar el lanzador para continuar sin duplicar lo ya subido." -ForegroundColor Yellow
    exit 1
}
finally {
    $Token = $null
    if ($secureToken) { $secureToken.Dispose() }
}
