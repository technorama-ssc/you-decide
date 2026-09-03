[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports',
    [string]$Publisher = "$PSScriptRoot\publish_stp_exports.ps1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExportRoot)) {
    New-Item -ItemType Directory -Path $ExportRoot | Out-Null
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ExportRoot
$watcher.Filter = '*.stp'
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Created -SourceIdentifier StpExportCreated | Out-Null
Register-ObjectEvent $watcher Changed -SourceIdentifier StpExportChanged | Out-Null

$pending = @{}
Write-Output "Watching $ExportRoot for generated STEP files. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 5
        if ($event) {
            $path = $event.SourceEventArgs.FullPath
            $pending[$path] = Get-Date
            Remove-Event -EventIdentifier $event.EventIdentifier
        }

        $ready = @($pending.GetEnumerator() | Where-Object { ((Get-Date) - $_.Value).TotalSeconds -ge 5 })
        foreach ($entry in $ready) {
            if (Test-Path -LiteralPath $entry.Key) {
                & $Publisher
            }
            $pending.Remove($entry.Key)
        }
    }
} finally {
    Unregister-Event -SourceIdentifier StpExportCreated -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier StpExportChanged -ErrorAction SilentlyContinue
    $watcher.Dispose()
}
