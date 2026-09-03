[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports',
    [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exhibitsRoot = Join-Path $RepoRoot '01 exhibits'

function Update-ZipWithStep([string]$ZipPath, [string]$StepPath, [string]$EntryName) {
    $temporaryZip = "$ZipPath.tmp"
    Remove-Item -LiteralPath $temporaryZip -Force -ErrorAction SilentlyContinue
    $sourceArchive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    $destinationArchive = [System.IO.Compression.ZipFile]::Open($temporaryZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $sourceArchive.Entries) {
            if ($entry.FullName -match '\.stp$|\.step$') { continue }
            $newEntry = $destinationArchive.CreateEntry($entry.FullName, [System.IO.Compression.CompressionLevel]::Optimal)
            $input = $entry.Open()
            $output = $newEntry.Open()
            try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
        }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $destinationArchive, $StepPath, $EntryName,
            [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    } finally {
        $destinationArchive.Dispose()
        $sourceArchive.Dispose()
    }
    Move-Item -LiteralPath $temporaryZip -Destination $ZipPath -Force
}

foreach ($export in Get-ChildItem -LiteralPath $ExportRoot -File -Include '*.stp', '*.step') {
    if ($export.BaseName -notmatch '^(\d{3})(?:_|$)') {
        Write-Warning "Ignoring export without exhibit number: $($export.Name)"
        continue
    }

    $number = $Matches[1]
    $exhibit = Get-ChildItem -LiteralPath $exhibitsRoot -Directory |
        Where-Object { $_.Name -match "^$number(?:_|$)" } |
        Select-Object -First 1
    if (-not $exhibit) { Write-Warning "No exhibit folder found for $number"; continue }

    $zip = Get-ChildItem -LiteralPath $exhibit.FullName -File -Filter 'content*.zip' | Select-Object -First 1
    $content = Get-ChildItem -LiteralPath $exhibit.FullName -Directory -Filter 'content*' | Select-Object -First 1
    if (-not $zip -or -not $content) { Write-Warning "No content ZIP/folder found for $number"; continue }

    $stepName = "$($exhibit.Name.ToLowerInvariant()).stp"
    $repositoryStep = Join-Path $content.FullName $stepName
    Copy-Item -LiteralPath $export.FullName -Destination $repositoryStep -Force
    Update-ZipWithStep $zip.FullName $repositoryStep "$($content.Name)/$stepName"
    Remove-Item -LiteralPath $export.FullName -Force
    Write-Output "Published $number as $stepName"
}

git -C $RepoRoot add -- '01 exhibits'
git -C $RepoRoot diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git -C $RepoRoot commit -m 'Update generated exhibit STEP files'
    git -C $RepoRoot push origin main
}
