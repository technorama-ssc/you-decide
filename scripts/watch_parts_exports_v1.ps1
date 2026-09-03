[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_parts_exports',
    [string]$Publisher = "$PSScriptRoot\publish_parts_exports_v1.ps1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExportRoot)) {
    New-Item -ItemType Directory -Path $ExportRoot | Out-Null
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = (Resolve-Path -LiteralPath $ExportRoot).Path
$watcher.Filter = '*.csv'
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Created -SourceIdentifier PartsExportCreated | Out-Null
Register-ObjectEvent $watcher Changed -SourceIdentifier PartsExportChanged | Out-Null

$pending = @{}
Write-Output "Watching $($watcher.Path) for generated BOM files. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 5
        if ($event) {
            $pending[$event.SourceEventArgs.FullPath] = Get-Date
            Remove-Event -EventIdentifier $event.EventIdentifier
        }

        $ready = @($pending.GetEnumerator() | Where-Object { ((Get-Date) - $_.Value).TotalSeconds -ge 5 })
        foreach ($entry in $ready) {
            if (Test-Path -LiteralPath $entry.Key) { & $Publisher }
            $pending.Remove($entry.Key)
        }
    }
} finally {
    Unregister-Event -SourceIdentifier PartsExportCreated -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier PartsExportChanged -ErrorAction SilentlyContinue
    $watcher.Dispose()
}
