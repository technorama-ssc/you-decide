[CmdletBinding()]
param(
    [ValidateSet('Once', 'Watch')]
    [string]$Mode = 'Watch',
    [string]$CadRoot = 'C:\Users\clehmann\OneDrive - Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD',
    [string]$RepoRoot = '',
    [string[]]$ChangedPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exportRule = Join-Path $PSScriptRoot 'export_active_assembly_new_structure_v2.vb'
$exhibitsRoot = Join-Path $RepoRoot '01 exhibits'
$stagingRoot = Join-Path $RepoRoot '.stp-staging'

function Get-AssemblyNumber([string]$Path) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
    if ($name -match '^(\d{3})_') { return $Matches[1] }
    return $null
}

function Get-ExhibitTarget([string]$Number) {
    $directory = Get-ChildItem -LiteralPath $exhibitsRoot -Directory |
        Where-Object { $_.Name -match "^$Number(?:_|$)" } |
        Select-Object -First 1
    if (-not $directory) { return $null }

    $hardware = Join-Path $directory.FullName '03 hardware'
    if (-not (Test-Path -LiteralPath $hardware -PathType Container)) { return $null }

    [PSCustomObject]@{
        Directory = $directory
        Hardware = Get-Item -LiteralPath $hardware
        StepName = ($directory.Name.ToLowerInvariant() + '.stp')
    }
}

function Get-ImpactedAssemblies([string[]]$Paths, $Inventor) {
    $changed = @($Paths | ForEach-Object { [System.IO.Path]::GetFullPath($_).ToLowerInvariant() })
    $assemblies = Get-ChildItem -LiteralPath (Join-Path $CadRoot '200_Exponate') -Recurse -File -Filter '*.iam' |
        Where-Object { $_.FullName -notmatch '\\OldVersions\\' }
    $impacted = @()

    foreach ($assembly in $assemblies) {
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
    $target = Get-ExhibitTarget $number
    if (-not $target) { Write-Warning "No repository target for exhibit $number"; return $false }

    if (-not (Test-Path -LiteralPath $stagingRoot)) { New-Item -ItemType Directory -Path $stagingRoot | Out-Null }
    $stpPath = Join-Path $stagingRoot $target.StepName
    $document = $null
    try {
        $document = $Inventor.Documents.Open($AssemblyPath, $false)
        $env:YOUDECIDE_STP_OUTPUT = $stpPath
        $ilogic = $Inventor.ApplicationAddIns | Where-Object { $_.DisplayName -eq 'iLogic' } | Select-Object -First 1
        if (-not $ilogic) { throw 'Inventor iLogic add-in not found.' }
        $ilogic.Automation.RunExternalRule($document, $exportRule)
    } finally {
        if ($document) { $document.Close($false) }
        Remove-Item Env:YOUDECIDE_STP_OUTPUT -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path -LiteralPath $stpPath)) { throw "Inventor did not create $stpPath" }
    $repositoryStep = Join-Path $target.Hardware.FullName $target.StepName
    Copy-Item -LiteralPath $stpPath -Destination $repositoryStep -Force
    Write-Output "Updated $number -> $($target.StepName)"
    return $true
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
        foreach ($assembly in $assemblies) { [void](Export-Assembly $assembly $inventor) }
    } finally {
        if ($ownsInventor) { $inventor.Quit() }
    }

    git -C $RepoRoot add -- '01 exhibits'
    git -C $RepoRoot diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git -C $RepoRoot commit -m 'Update generated exhibit STEP files'
        git -C $RepoRoot push origin main
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