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
        [string]$PresentationPath,
        [string]$AuthKey
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::Open(
        $PresentationPath,
        [System.IO.Compression.ZipArchiveMode]::Update
    )

    try {
        $documents = [System.Collections.Generic.List[object]]::new()
        $paragraphs = [System.Collections.Generic.List[object]]::new()
        foreach ($entry in $archive.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' }) {
            $reader = New-Object IO.StreamReader($entry.Open())
            try {
                [xml]$xml = $reader.ReadToEnd()
            }
            finally {
                $reader.Close()
            }

            $namespace = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
            $namespace.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
            foreach ($node in $xml.SelectNodes('//a:t', $namespace)) {
                if ($node.InnerText.Trim()) {
                    $paragraphs.Add([PSCustomObject]@{ Node = $node; Text = $node.InnerText })
                }
            }
            $documents.Add([PSCustomObject]@{ EntryName = $entry.FullName; Xml = $xml })
        }

        foreach ($batch in @($paragraphs | ForEach-Object -Begin { $items = @() } -Process {
            $items += $_
            if ($items.Count -eq 50) { ,$items; $items = @() }
        } -End { if ($items.Count) { ,$items } })) {
            $sourceTexts = @($batch | ForEach-Object { $_.Text.Trim() })
            $translations = Get-DeepLTranslation -Text $sourceTexts -AuthKey $AuthKey
            for ($index = 0; $index -lt $batch.Count; $index++) {
                $batch[$index].Node.InnerText = $translations[$index]
            }
        }

        foreach ($document in $documents) {
            $archive.GetEntry($document.EntryName).Delete()
            $entry = $archive.CreateEntry($document.EntryName)
            $writer = New-Object IO.StreamWriter($entry.Open(), [Text.UTF8Encoding]::new($false))
            try {
                $document.Xml.Save($writer)
            }
            finally {
                $writer.Close()
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}

function Convert-SvgGraphicsToHighResolutionPng {
    param(
        $Presentation,
        [string]$RasterDirectory
    )

    New-Item -ItemType Directory -Force -Path $RasterDirectory | Out-Null
    $graphics = [System.Collections.Generic.List[object]]::new()
    $imageIndex = 0
    foreach ($slide in $Presentation.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.Type -ne 28) { continue }

            $imagePath = Join-Path $RasterDirectory "graphic-$imageIndex.png"
            $shape.Export($imagePath, 2, 1600, 1600)
            $graphics.Add([PSCustomObject]@{
                Slide = $slide
                Shape = $shape
                ZOrder = $shape.ZOrderPosition
                ImagePath = $imagePath
                Left = $shape.Left
                Top = $shape.Top
                Width = $shape.Width
                Height = $shape.Height
            })
            $imageIndex++
        }
    }

    foreach ($graphic in $graphics | Sort-Object ZOrder -Descending) {
        $graphic.Shape.Delete()
    }
    foreach ($graphic in $graphics | Sort-Object { $_.Slide.SlideIndex }, ZOrder) {
        $replacement = $graphic.Slide.Shapes.AddPicture(
            $graphic.ImagePath,
            0,
            -1,
            $graphic.Left,
            $graphic.Top,
            $graphic.Width,
            $graphic.Height
        )
        $replacement.ZOrder(1)
        for ($position = 1; $position -lt $graphic.ZOrder; $position++) {
            $replacement.ZOrder(2)
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
        $outputPath = Join-Path $mediaDirectory "Exhibit graphics_$($exhibit.Name).pdf"
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
        Translate-PresentationText -PresentationPath $temporaryPresentation -AuthKey $DeepLAuthKey
        $export = $powerPoint.Presentations.Open($temporaryPresentation, $false, $false, $false)
        try {
            foreach ($slideIndex in @($export.Slides.Count..1)) {
                if ($slideIndex -notin $slideNumbers) {
                    $export.Slides.Item($slideIndex).Delete()
                }
            }
            $rasterDirectory = Join-Path $env:TEMP ("$number-$(New-Guid)")
            $temporaryFiles.Add($rasterDirectory)
            Convert-SvgGraphicsToHighResolutionPng -Presentation $export -RasterDirectory $rasterDirectory
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