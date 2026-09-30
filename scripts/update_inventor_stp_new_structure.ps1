[CmdletBinding()]
param(
    [ValidateSet('Once', 'Watch')]
    [string]$Mode = 'Watch',
    [string]$CadRoot = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD',
    [string]$RepoRoot = '',
    [string[]]$ChangedPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exportRule = Join-Path $PSScriptRoot 'export_active_assembly_new_structure_v16.vb'
$sectionNames = @('00 you decide', '01 exhibits', '02 system')
$stagingRoot = Join-Path $RepoRoot '.stp-staging'

function Get-AssemblyNumber([string]$Path) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    if ($name -match '^(\d{3})_') { return $Matches[1] }
    return $null
}

function Get-RepositoryTarget([string]$Number) {
    $directory = $null
    $sectionName = $null
    foreach ($candidateSection in $sectionNames) {
        $sectionRoot = Join-Path $RepoRoot $candidateSection
        if (-not (Test-Path -LiteralPath $sectionRoot -PathType Container)) { continue }

        $matches = @(Get-ChildItem -LiteralPath $sectionRoot -Directory |
            Where-Object { $_.Name -match "^$([regex]::Escape($Number))(?:_|$)" })
        if ($matches.Count -gt 1) { throw "Multiple targets for $Number in $candidateSection" }
        if ($matches.Count -eq 1) {
            if ($directory) { throw "Multiple targets for $Number across repository sections" }
            $directory = $matches[0]
            $sectionName = $candidateSection
        }
    }
    if (-not $directory) { return $null }

    $hardware = Join-Path $directory.FullName '03 hardware'
    if (-not (Test-Path -LiteralPath $hardware -PathType Container)) { return $null }

    [PSCustomObject]@{
        SectionName = $sectionName
        Directory = $directory
        Hardware = Get-Item -LiteralPath $hardware
        StepName = ($directory.Name.ToLowerInvariant() + '.stp')
    }
}

function Get-ImpactedAssemblies([string[]]$Paths, $Inventor) {
    $changed = @($Paths | ForEach-Object {
        $resolved = Resolve-Path -LiteralPath $_ -ErrorAction SilentlyContinue
        $resolvedPath = if ($resolved) { $resolved.Path }
        if (-not $resolvedPath) {
            $fileName = [System.IO.Path]::GetFileName($_)
            $resolvedPath = Get-ChildItem -LiteralPath $CadRoot -Recurse -File -Filter $fileName -ErrorAction SilentlyContinue |
                Select-Object -First 1 |
                ForEach-Object { $_.FullName }
        }
        if ($resolvedPath) { [System.IO.Path]::GetFullPath($resolvedPath).ToLowerInvariant() }
    })
    $assemblies = Get-ChildItem -LiteralPath (Join-Path $CadRoot '200_Exponate') -Recurse -File -Filter '*.iam' |
        Where-Object { $_.FullName -notmatch '\\OldVersions\\' }
    $impacted = @()

    foreach ($assembly in $assemblies) {
        $assemblyPath = $assembly.FullName.ToLowerInvariant()
        if ($changed -contains $assemblyPath) {
            $impacted += $assembly.FullName
            continue
        }
        $document = $null
        try {
            $document = $Inventor.Documents.Open($assembly.FullName, $false)
            $references = @($document.ReferencedDocuments | ForEach-Object { $_.FullFileName.ToLowerInvariant() })
            if ($changed | Where-Object { $references -contains $_ -or $_ -eq $assembly.FullName.ToLowerInvariant() }) {
                $impacted += $assembly.FullName
            }
        } catch {
            Write-Warning "Could not inspect assembly $($assembly.Name): $($_.Exception.Message)"
        } finally {
            if ($document) { $document.Close($false) }
        }
    }
    return $impacted | Sort-Object -Unique
}

function Export-Assembly([string]$AssemblyPath, $Inventor) {
    $number = Get-AssemblyNumber $AssemblyPath
    if (-not $number) { Write-Warning "Skipping assembly without exhibit number: $AssemblyPath"; return $false }
    $target = Get-RepositoryTarget $number
    if (-not $target) { Write-Warning "No repository target for $number"; return $null }

    if (-not (Test-Path -LiteralPath $stagingRoot)) { New-Item -ItemType Directory -Path $stagingRoot | Out-Null }
    $stpPath = Join-Path $stagingRoot $target.StepName
    $document = $null
    $closeDocument = $false
    try {
        $activeDocument = $Inventor.ActiveDocument
        if ($activeDocument -and $activeDocument.FullFileName -and
            $activeDocument.FullFileName.ToLowerInvariant() -eq $AssemblyPath.ToLowerInvariant()) {
            $document = $activeDocument
        } else {
            $document = $Inventor.Documents.Open($AssemblyPath, $false)
            $closeDocument = $true
        }
        $env:YOUDECIDE_STP_OUTPUT = $stpPath
        [Environment]::SetEnvironmentVariable('YOUDECIDE_STP_OUTPUT', $stpPath, 'User')
        $ilogic = $Inventor.ApplicationAddIns | Where-Object { $_.DisplayName -eq 'iLogic' } | Select-Object -First 1
        if (-not $ilogic) { throw 'Inventor iLogic add-in not found.' }
        $ilogic.Automation.RunExternalRule($document, $exportRule)
    } finally {
        if ($document -and $closeDocument) { $document.Close($false) }
        Remove-Item Env:YOUDECIDE_STP_OUTPUT -ErrorAction SilentlyContinue
        [Environment]::SetEnvironmentVariable('YOUDECIDE_STP_OUTPUT', $null, 'User')
    }

    if (-not (Test-Path -LiteralPath $stpPath)) { throw "Inventor did not create $stpPath" }
    $repositoryStep = Join-Path $target.Hardware.FullName $target.StepName
    Copy-Item -LiteralPath $stpPath -Destination $repositoryStep -Force
    Write-Host "Updated $number -> $($target.StepName)"
    return "$($target.SectionName)/$($target.Directory.Name)/03 hardware/$($target.StepName)"
}

function Invoke-Update([string[]]$Paths) {
    $inventor = $null
    $ownsInventor = $false
    try { $inventor = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Inventor.Application') } catch { }
    if (-not $inventor) {
        $inventor = New-Object -ComObject Inventor.Application
        $inventor.Visible = $false
        $ownsInventor = $true
    }
    try {
        $assemblies = Get-ImpactedAssemblies $Paths $inventor
        $updatedPaths = @()
        foreach ($assembly in $assemblies) {
            $updatedPath = Export-Assembly $assembly $inventor
            if ($updatedPath) { $updatedPaths += $updatedPath }
        }
    } finally {
        if ($ownsInventor) { $inventor.Quit() }
    }

    if ($updatedPaths.Count -gt 0) {
        git -C $RepoRoot add -- $updatedPaths
        if ($LASTEXITCODE -ne 0) { throw 'Git add failed for updated STEP files' }

        git -C $RepoRoot diff --cached --quiet -- $updatedPaths
        if ($LASTEXITCODE -eq 1) {
            git -C $RepoRoot commit --only -m 'Update generated STEP files' -- $updatedPaths
            if ($LASTEXITCODE -ne 0) { throw 'Git commit failed for updated STEP files' }
            git -C $RepoRoot -c rebase.autoStash=true pull --rebase origin main
            if ($LASTEXITCODE -ne 0) { throw 'Git pull --rebase failed' }
            git -C $RepoRoot push origin HEAD:main
            if ($LASTEXITCODE -ne 0) { throw 'Git push failed' }
        } elseif ($LASTEXITCODE -ne 0) {
            throw 'Git diff check failed for updated STEP files'
        }
    }
}

if ($Mode -eq 'Once') {
    if (-not $ChangedPath) { throw 'Use -ChangedPath with -Mode Once.' }
    Invoke-Update $ChangedPath
    exit
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $CadRoot
$watcher.Filter = '*'
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Changed -SourceIdentifier InventorCadChanged | Out-Null
Register-ObjectEvent $watcher Created -SourceIdentifier InventorCadCreated | Out-Null
Write-Output "Watching $CadRoot for changed Inventor parts. Press Ctrl+C to stop."

try {
    while ($true) {
        $event = Wait-Event -Timeout 5
        if (-not $event) { continue }
        $paths = @()
        do {
            $paths += $event.SourceEventArgs.FullPath
            Remove-Event -EventIdentifier $event.EventIdentifier
            $event = Get-Event -SourceIdentifier InventorCadChanged -ErrorAction SilentlyContinue | Select-Object -First 1
            if (-not $event) { $event = Get-Event -SourceIdentifier InventorCadCreated -ErrorAction SilentlyContinue | Select-Object -First 1 }
        } while ($event)
        $paths = $paths | Where-Object { $_ -match '\.(ipt|iam)$' } | Sort-Object -Unique
        if ($paths) { Invoke-Update $paths }
    }
} finally {
    Unregister-Event -SourceIdentifier InventorCadChanged -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier InventorCadCreated -ErrorAction SilentlyContinue
    $watcher.Dispose()
}