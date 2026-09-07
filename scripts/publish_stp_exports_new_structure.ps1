[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports',
    [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exhibitsRoot = Join-Path $RepoRoot '01 exhibits'

foreach ($export in Get-ChildItem -LiteralPath $ExportRoot -File -Include '*.stp', '*.step') {
    if ($export.BaseName -notmatch '^(\d{3})(?:_|$)') {
        Write-Warning "Export ohne Exponatnummer wird ignoriert: $($export.Name)"
        continue
    }

    $number = $Matches[1]
    $exhibit = Get-ChildItem -LiteralPath $exhibitsRoot -Directory |
        Where-Object { $_.Name -match "^$number(?:_|$)" } |
        Select-Object -First 1
    if (-not $exhibit) {
        Write-Warning "Kein Exhibit-Ordner für $number gefunden"
        continue
    }

    $hardware = Join-Path $exhibit.FullName '03 hardware'
    if (-not (Test-Path -LiteralPath $hardware -PathType Container)) {
        Write-Warning "Kein 03 hardware-Ordner für $number gefunden"
        continue
    }

    $stepName = "$($exhibit.Name.ToLowerInvariant()).stp"
    $repositoryStep = Join-Path $hardware $stepName
    Copy-Item -LiteralPath $export.FullName -Destination $repositoryStep -Force
    Remove-Item -LiteralPath $export.FullName -Force
    Write-Output "Published $number as $stepName"
}

git -C $RepoRoot add -- '01 exhibits'
git -C $RepoRoot diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git -C $RepoRoot commit -m 'Update generated exhibit STEP files'
    git -C $RepoRoot push origin HEAD:main
}
