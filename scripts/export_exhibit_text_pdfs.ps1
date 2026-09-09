[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$SourcePresentation = 'C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\80_Dateiablage\Grafikvorlage & Schriften Lui\Du_entscheidest_Vorlage_A4_Update.pptx',
    [string]$RepoRoot = '',
    [string]$DeepLAuthKey = $env:DEEPL_AUTH_KEY,
    [switch]$Publish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CommentedExhibitSlides {
    param($Presentation)

    $slidesByExhibit = @{}
    foreach ($slide in $Presentation.Slides) {
        foreach ($comment in $slide.Comments) {
            if ($comment.Text -match '^\s*(?<number>\d{3})(?:_|\s|-)') {
                $number = $Matches.number
                if (-not $slidesByExhibit.ContainsKey($number)) {
                    $slidesByExhibit[$number] = [System.Collections.Generic.List[int]]::new()
                }
                if (-not $slidesByExhibit[$number].Contains($slide.SlideIndex)) {
                    $slidesByExhibit[$number].Add($slide.SlideIndex)
                }
            }
        }
    }

    return $slidesByExhibit
}

function Get-DeepLTranslation {
    param(
        [string[]]$Text,
        [string]$AuthKey
    )

    $body = @('target_lang=EN-US')
    foreach ($item in $Text) {
        $body += 'text=' + [uri]::EscapeDataString($item)
    }

    $response = Invoke-RestMethod -Method Post `
        -Uri 'https://api-free.deepl.com/v2/translate' `
        -Headers @{ Authorization = "DeepL-Auth-Key $AuthKey" } `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body ($body -join '&')

    return @($response.translations | ForEach-Object { $_.text })
}

function Translate-PresentationText {
    param(
        $Presentation,
        [string]$AuthKey
    )

    $textRanges = [System.Collections.Generic.List[object]]::new()
    foreach ($slide in $Presentation.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
                $textRanges.Add($shape.TextFrame.TextRange)
            }
        }
    }

    foreach ($batch in @($textRanges | ForEach-Object -Begin { $items = @() } -Process {
        $items += $_
        if ($items.Count -eq 50) { ,$items; $items = @() }
    } -End { if ($items.Count) { ,$items } })) {
        $sourceTexts = @($batch | ForEach-Object { $_.Text })
        $translations = Get-DeepLTranslation -Text $sourceTexts -AuthKey $AuthKey
        for ($index = 0; $index -lt $batch.Count; $index++) {
            $batch[$index].Text = $translations[$index]
        }
    }
}

if (-not (Test-Path -LiteralPath $SourcePresentation -PathType Leaf)) {
    throw "Die Quelldatei wurde nicht gefunden: $SourcePresentation"
}

$RepoRoot = if ($RepoRoot) { $RepoRoot } else { Split-Path -Parent $PSScriptRoot }
$exhibitsRoot = Join-Path $RepoRoot '01 exhibits'
if (-not (Test-Path -LiteralPath $exhibitsRoot -PathType Container)) {
    throw "Der Exponatordner wurde nicht gefunden: $exhibitsRoot"
}

$powerPoint = New-Object -ComObject PowerPoint.Application
$source = $null
$temporaryFiles = [System.Collections.Generic.List[string]]::new()
$outputs = [System.Collections.Generic.List[string]]::new()

try {
    $source = $powerPoint.Presentations.Open($SourcePresentation, $true, $false, $false)
    $slidesByExhibit = Get-CommentedExhibitSlides -Presentation $source
    if ($slidesByExhibit.Count -eq 0) {
        throw 'Keine Kommentare mit einer Exponatnummer im Format NNN_Name gefunden.'
    }

    foreach ($number in $slidesByExhibit.Keys | Sort-Object) {
        $exhibit = Get-ChildItem -LiteralPath $exhibitsRoot -Directory |
            Where-Object { $_.Name -match "^$number(?:_|$)" } |
            Select-Object -First 1
        if (-not $exhibit) {
            Write-Warning "Kein GitHub-Exponatordner für $number; wird übersprungen."
            continue
        }

        $mediaDirectory = Join-Path $exhibit.FullName '04 media'
        $outputPath = Join-Path $mediaDirectory "exhibit graphics_$($exhibit.Name).pdf"
        $slideNumbers = @($slidesByExhibit[$number] | Sort-Object)
        Write-Output "$number : Folien $($slideNumbers -join ', ') -> $outputPath"

        if (-not $PSCmdlet.ShouldProcess($outputPath, 'Englisches Exponat-PDF erzeugen')) {
            continue
        }
        if (-not $DeepLAuthKey) {
            throw 'DEEPL_AUTH_KEY fehlt. Einen DeepL API-Schlüssel als Umgebungsvariable setzen oder -DeepLAuthKey übergeben.'
        }

        New-Item -ItemType Directory -Force -Path $mediaDirectory | Out-Null
        $temporaryPresentation = Join-Path $env:TEMP ("$number-$(New-Guid).pptx")
        $temporaryFiles.Add($temporaryPresentation)
        Copy-Item -LiteralPath $SourcePresentation -Destination $temporaryPresentation
        $export = $powerPoint.Presentations.Open($temporaryPresentation, $false, $false, $false)
        try {
            foreach ($slideIndex in @($export.Slides.Count..1)) {
                if ($slideIndex -notin $slideNumbers) {
                    $export.Slides.Item($slideIndex).Delete()
                }
            }
            Translate-PresentationText -Presentation $export -AuthKey $DeepLAuthKey
            $export.Save()
            $export.SaveAs($outputPath, 32)
            $outputs.Add($outputPath)
        }
        finally {
            $export.Close()
        }
    }
}
finally {
    if ($source) { $source.Close() }
    $powerPoint.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
    foreach ($temporaryFile in $temporaryFiles) {
        Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
    }
}

if ($Publish -and $outputs.Count) {
    git -C $RepoRoot add -- $outputs
    git -C $RepoRoot diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git -C $RepoRoot commit -m 'Update translated exhibit text PDFs'
        git -C $RepoRoot push origin HEAD:main
    }
}