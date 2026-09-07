[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports',
    [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$publisher = Join-Path $PSScriptRoot 'publish_stp_exports_new_structure.ps1'

if (-not (Test-Path -LiteralPath $ExportRoot)) {
    New-Item -ItemType Directory -Path $ExportRoot | Out-Null
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ExportRoot
$watcher.Filter = '*'
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Created -SourceIdentifier NewStructureStpCreated | Out-Null
Register-ObjectEvent $watcher Changed -SourceIdentifier NewStructureStpChanged | Out-Null

$pending = @{}
Write-Output "Watching $ExportRoot for generated STEP files. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 2
        if ($event) {
            $path = $event.SourceEventArgs.FullPath
            if ($path -match '\.(stp|step)$') { $pending[$path] = Get-Date }
            Remove-Event -EventIdentifier $event.EventIdentifier
        }

        $ready = @($pending.GetEnumerator() | Where-Object { ((Get-Date) - $_.Value).TotalSeconds -ge 2 })
        foreach ($entry in $ready) {
            if (Test-Path -LiteralPath $entry.Key) {
                & $publisher -ExportRoot $ExportRoot -RepoRoot $RepoRoot
            }
            $pending.Remove($entry.Key)
        }
    }
} finally {
    Unregister-Event -SourceIdentifier NewStructureStpCreated -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier NewStructureStpChanged -ErrorAction SilentlyContinue
    $watcher.Dispose()
}
