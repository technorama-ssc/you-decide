[CmdletBinding()]
param(
    [string]$SourcePresentation = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\80_Dateiablage\Grafikvorlage & Schriften Lui\Du_entscheidest_Vorlage_A4_Update.pptx',
    [string]$RepoRoot = '',
    [int]$QuietSeconds = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourcePresentation -PathType Leaf)) {
    throw "Die Quelldatei wurde nicht gefunden: $SourcePresentation"
}
if (-not $env:DEEPL_AUTH_KEY) {
    throw 'DEEPL_AUTH_KEY fehlt. Ohne DeepL API-Schlüssel kann der Watcher keine englischen PDFs erzeugen.'
}

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$publisher = Join-Path $PSScriptRoot 'export_exhibit_text_pdfs.ps1'
$sourceDirectory = Split-Path -Parent $SourcePresentation
$sourceFileName = Split-Path -Leaf $SourcePresentation

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $sourceDirectory
$watcher.Filter = $sourceFileName
$watcher.NotifyFilter = [IO.NotifyFilters]'FileName, LastWrite, Size'
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Changed -SourceIdentifier ExhibitTextPresentationChanged | Out-Null
Register-ObjectEvent $watcher Created -SourceIdentifier ExhibitTextPresentationCreated | Out-Null
Register-ObjectEvent $watcher Renamed -SourceIdentifier ExhibitTextPresentationRenamed | Out-Null

$lastChange = $null
Write-Output "Watching $SourcePresentation. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 2
        if ($event) {
            $lastChange = Get-Date
            Remove-Event -EventIdentifier $event.EventIdentifier
        }

        if ($lastChange -and ((Get-Date) - $lastChange).TotalSeconds -ge $QuietSeconds) {
            $lastChange = $null
            try {
                Write-Output 'PowerPoint update detected. Exporting and publishing exhibit PDFs.'
                & $publisher -SourcePresentation $SourcePresentation -RepoRoot $RepoRoot -DeepLAuthKey $env:DEEPL_AUTH_KEY -Publish
            }
            catch {
                Write-Error "PDF export failed: $_"
            }
        }
    }
}
finally {
    Unregister-Event -SourceIdentifier ExhibitTextPresentationChanged -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier ExhibitTextPresentationCreated -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier ExhibitTextPresentationRenamed -ErrorAction SilentlyContinue
    $watcher.Dispose()
}