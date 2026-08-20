# Academia AG - Rescate C1-09 Cloudflare Stream
# Descarga el MP4 desde Wix a la PC y lo sube directamente a Cloudflare Stream.
# El API token solo vive en memoria durante esta ejecucion.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$AccountId = '53e711d2cbb587bea151a270722f8f60'
$ApiBase = "https://api.cloudflare.com/client/v4/accounts/$AccountId/stream"
$SourceUrl = 'https://video.wixstatic.com/video/11f124_95fe9fba0e7248808749897ca5a00162/720p/mp4/file.mp4'
$Code = 'C1-09'
$Title = 'Driving Privilege Card - DPC'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CheckpointPath = Join-Path $ScriptDir 'c1-cloudflare-checkpoint.json'
$TempFile = Join-Path $env:TEMP 'academia-ag-c1-09.mp4'

function ConvertTo-PlainText([Security.SecureString]$SecureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Load-Checkpoint {
    $map = @{}
    if (Test-Path -LiteralPath $CheckpointPath) {
        $raw = Get-Content -LiteralPath $CheckpointPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($p in $raw.PSObject.Properties) { $map[$p.Name] = $p.Value }
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

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ' ACADEMIA AG - RESCATE CLOUDFLARE - C1-09' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor DarkGreen
Write-Host ''
Write-Host 'Este proceso NO borra los 12 videos ya migrados.' -ForegroundColor Yellow
Write-Host 'Descargara solamente C1-09 desde Wix y lo subira desde tu PC.'
Write-Host ''

$Checkpoint = Load-Checkpoint
if ($Checkpoint.ContainsKey($Code) -and $Checkpoint[$Code].uid) {
    Write-Host "C1-09 ya tiene UID $($Checkpoint[$Code].uid). No se requiere rescate." -ForegroundColor Green
    exit 0
}

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
    Write-Host '2/4 Descargando C1-09 desde Wix a tu equipo...' -ForegroundColor Cyan
    if (Test-Path -LiteralPath $TempFile) { Remove-Item -LiteralPath $TempFile -Force }
    Invoke-WebRequest -UseBasicParsing -Uri $SourceUrl -OutFile $TempFile
    if (-not (Test-Path -LiteralPath $TempFile)) { throw 'No se genero el archivo temporal.' }

    $size = (Get-Item -LiteralPath $TempFile).Length
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Host "    Descarga completada: $sizeMB MB" -ForegroundColor Green
    if ($size -le 0) { throw 'El archivo descargado esta vacio.' }
    if ($size -ge 200MB) {
        throw "El archivo mide $sizeMB MB. La subida simple de Stream admite archivos menores de 200 MB; se requiere TUS."
    }

    Write-Host ''
    Write-Host '3/4 Subiendo C1-09 directamente a Cloudflare Stream...' -ForegroundColor Cyan
    Add-Type -AssemblyName System.Net.Http
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Token)
    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    $fileStream = [System.IO.File]::OpenRead($TempFile)
    try {
        $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
        $streamContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('video/mp4')
        $multipart.Add($streamContent, 'file', 'C1-09.mp4')
        $httpResponse = $client.PostAsync($ApiBase, $multipart).GetAwaiter().GetResult()
        $responseText = $httpResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $httpResponse.IsSuccessStatusCode) {
            throw "Cloudflare rechazo la subida directa: HTTP $([int]$httpResponse.StatusCode). $responseText"
        }
        $response = $responseText | ConvertFrom-Json
    }
    finally {
        if ($fileStream) { $fileStream.Dispose() }
        if ($multipart) { $multipart.Dispose() }
        if ($client) { $client.Dispose() }
    }

    if (-not $response.success -or -not $response.result.uid) {
        $message = ($response.errors | ForEach-Object { $_.message }) -join '; '
        throw "Cloudflare no devolvio UID para C1-09. $message"
    }

    $uid = [string]$response.result.uid
    Write-Host "    UID recibido: $uid" -ForegroundColor Green

    Write-Host ''
    Write-Host '4/4 Esperando a que C1-09 quede READY...' -ForegroundColor Cyan
    $deadline = (Get-Date).AddMinutes(20)
    while ($true) {
        if ((Get-Date) -gt $deadline) { throw 'Tiempo de espera agotado. El UID ya fue creado; vuelve a ejecutar esta herramienta mas tarde.' }
        $detail = Invoke-CfGetVideo -Uid $uid -Headers $Headers
        if (-not $detail.success) { throw "No se pudo consultar el UID $uid." }
        $v = $detail.result
        $state = [string]$v.status.state
        $pct = [string]$v.status.pctComplete
        if ($state -eq 'error') { throw "Cloudflare marco ERROR: $($v.status.errorReasonText)" }
        if ($v.readyToStream -eq $true -or $state -eq 'ready') {
            $duration = 0
            if ($null -ne $v.duration) { $duration = [math]::Ceiling([double]$v.duration) }
            $Checkpoint[$Code] = [pscustomobject]@{
                code = $Code
                title = $Title
                uid = $uid
                sourceUrl = $SourceUrl
                importedNow = $true
                rescueMode = 'local-file-upload'
                durationSeconds = [int]$duration
            }
            Save-Checkpoint $Checkpoint
            Write-Host "    C1-09 READY ($duration s)" -ForegroundColor Green
            Write-Host ''
            Write-Host 'RESCATE COMPLETADO.' -ForegroundColor Green
            Write-Host 'Ahora vuelve a ejecutar INICIAR-MIGRACION-C1.cmd.' -ForegroundColor Cyan
            Write-Host 'El migrador omitira los 13 UID existentes y generara el SQL COMPLETO para Supabase.' -ForegroundColor Cyan
            exit 0
        }
        if ([string]::IsNullOrWhiteSpace($pct)) { $pct = '?' }
        Write-Host "    C1-09: $state $pct%" -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Host ''
    Write-Host 'ERROR EN RESCATE C1-09:' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path -LiteralPath $TempFile) {
        try { Remove-Item -LiteralPath $TempFile -Force } catch { }
    }
    $Token = $null
    if ($secureToken) { $secureToken.Dispose() }
}
