[CmdletBinding()]
param(
    [string]$ExhibitsRoot = "$PSScriptRoot\..\01 exhibits",
    [string]$SyncScript = "$PSScriptRoot\sync_exhibit_texts.py"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = (Resolve-Path -LiteralPath $ExhibitsRoot).Path
$watcher.Filter = 'README.md'
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Changed -SourceIdentifier ExhibitReadmeChanged | Out-Null
Register-ObjectEvent $watcher Created -SourceIdentifier ExhibitReadmeCreated | Out-Null

$pending = @{}
Write-Output "Watching $($watcher.Path) for changed exhibit README files. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 5
        if ($event) {
            $pending[$event.SourceEventArgs.FullPath] = Get-Date
            Remove-Event -EventIdentifier $event.EventIdentifier
        }

        $ready = @($pending.GetEnumerator() | Where-Object { ((Get-Date) - $_.Value).TotalSeconds -ge 2 })
        foreach ($entry in $ready) {
            if (Test-Path -LiteralPath $entry.Key) {
                python $SyncScript
            }
            $pending.Remove($entry.Key)
        }
    }
} finally {
    Unregister-Event -SourceIdentifier ExhibitReadmeChanged -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier ExhibitReadmeCreated -ErrorAction SilentlyContinue
    $watcher.Dispose()
}
