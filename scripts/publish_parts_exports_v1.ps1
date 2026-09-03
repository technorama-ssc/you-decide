[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_parts_exports',
    [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exhibitsRoot = Join-Path $RepoRoot '01 exhibits'
$mergeScript = Join-Path $PSScriptRoot 'merge_parts_list.py'

function Update-ZipText([string]$ZipPath, [string]$TextPath, [string]$EntryName) {
    $temporaryZip = "$ZipPath.tmp"
    Remove-Item -LiteralPath $temporaryZip -Force -ErrorAction SilentlyContinue
    $sourceArchive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    $destinationArchive = [System.IO.Compression.ZipFile]::Open($temporaryZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $sourceArchive.Entries) {
            if ($entry.FullName -eq $EntryName) { continue }
            $newEntry = $destinationArchive.CreateEntry($entry.FullName, [System.IO.Compression.CompressionLevel]::Optimal)
            $input = $entry.Open()
            $output = $newEntry.Open()
            try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
        }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $destinationArchive, $TextPath, $EntryName,
            [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    } finally {
        $destinationArchive.Dispose()
        $sourceArchive.Dispose()
    }
    Move-Item -LiteralPath $temporaryZip -Destination $ZipPath -Force
}

foreach ($bom in Get-ChildItem -LiteralPath $ExportRoot -File -Filter '*.csv') {
    if ($bom.BaseName -notmatch '^(\d{3})$') {
        Write-Warning "Ignoring BOM without three-digit exhibit number: $($bom.Name)"
        continue
    }

    $number = $Matches[1]
    $exhibit = Get-ChildItem -LiteralPath $exhibitsRoot -Directory |
        Where-Object { $_.Name -match "^$number(?:_|$)" } |
        Select-Object -First 1
    if (-not $exhibit) { Write-Warning "No exhibit folder found for $number"; continue }

    $zip = Get-ChildItem -LiteralPath $exhibit.FullName -File -Filter 'content*.zip' | Select-Object -First 1
    $content = Get-ChildItem -LiteralPath $exhibit.FullName -Directory -Filter 'content*' | Select-Object -First 1
    $parts = if ($content) { Get-ChildItem -LiteralPath $content.FullName -File -Filter 'Parts_*.txt' | Select-Object -First 1 } else { $null }
    if (-not $zip -or -not $content -or -not $parts) { Write-Warning "No content target for $number"; continue }

    $pythonArgs = @($mergeScript, $parts.FullName, $bom.FullName, $parts.FullName)
    & python @pythonArgs
    Update-ZipText $zip.FullName $parts.FullName "$($content.Name)/$($parts.Name)"
    Remove-Item -LiteralPath $bom.FullName -Force
    Write-Output "Published parts list for $number"
}

git -C $RepoRoot add -- '01 exhibits'
git -C $RepoRoot diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git -C $RepoRoot commit -m 'Update generated exhibit parts lists'
    git -C $RepoRoot push origin main
}
