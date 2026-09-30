[CmdletBinding()]
param(
    [string]$ExportRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports',
    [string]$RepoRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$sectionNames = @('00 you decide', '01 exhibits', '02 system')
$publishedPaths = @()

foreach ($export in Get-ChildItem -LiteralPath $ExportRoot -File -Include '*.stp', '*.step') {
    if ($export.BaseName -notmatch '^(\d{3})(?:_|$)') {
        Write-Warning "Export ohne Exponatnummer wird ignoriert: $($export.Name)"
        continue
    }

    $number = $Matches[1]
    $target = $null
    $targetSection = $null
    foreach ($sectionName in $sectionNames) {
        $sectionRoot = Join-Path $RepoRoot $sectionName
        if (-not (Test-Path -LiteralPath $sectionRoot -PathType Container)) { continue }

        $matches = @(Get-ChildItem -LiteralPath $sectionRoot -Directory |
            Where-Object { $_.Name -match "^$([regex]::Escape($number))(?:_|$)" })
        if ($matches.Count -gt 1) { throw "Mehrere Zielordner für $number in $sectionName gefunden" }
        if ($matches.Count -eq 1) {
            if ($target) { throw "Mehrere Zielordner für $number in verschiedenen Bereichen gefunden" }
            $target = $matches[0]
            $targetSection = $sectionName
        }
    }
    if (-not $target) {
        Write-Warning "Kein Zielordner in 00 you decide, 01 exhibits oder 02 system für $number gefunden"
        continue
    }

    $hardware = Join-Path $target.FullName '03 hardware'
    if (-not (Test-Path -LiteralPath $hardware -PathType Container)) {
        Write-Warning "Kein 03 hardware-Ordner für $number gefunden: $($target.FullName)"
        continue
    }

    $stepName = "$($target.Name.ToLowerInvariant()).stp"
    $repositoryStep = Join-Path $hardware $stepName
    Copy-Item -LiteralPath $export.FullName -Destination $repositoryStep -Force
    Remove-Item -LiteralPath $export.FullName -Force
    Write-Output "Published $number as $stepName"
    $publishedPaths += "$targetSection/$($target.Name)/03 hardware/$stepName"
}

if ($publishedPaths.Count -gt 0) {
    git -C $RepoRoot add -- $publishedPaths
    if ($LASTEXITCODE -ne 0) { throw 'Git add failed for published STEP files' }

    git -C $RepoRoot diff --cached --quiet -- $publishedPaths
    if ($LASTEXITCODE -eq 1) {
        git -C $RepoRoot commit --only -m 'Update generated STEP files' -- $publishedPaths
        if ($LASTEXITCODE -ne 0) { throw 'Git commit failed for published STEP files' }
        git -C $RepoRoot -c rebase.autoStash=true pull --rebase origin main
        if ($LASTEXITCODE -ne 0) { throw 'Git pull --rebase failed' }
        git -C $RepoRoot push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw 'Git push failed' }
    } elseif ($LASTEXITCODE -ne 0) {
        throw 'Git diff check failed for published STEP files'
    }
}
