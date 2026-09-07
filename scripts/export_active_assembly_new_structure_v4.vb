Dim outputPath = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_STP_OUTPUT", Global.System.EnvironmentVariableTarget.Process)
If String.IsNullOrWhiteSpace(outputPath) Then
    outputPath = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_STP_OUTPUT", Global.System.EnvironmentVariableTarget.User)
End If

Dim inventor = ThisApplication
Dim document = ThisDoc.Document

If String.IsNullOrWhiteSpace(outputPath) Then
    Dim assemblyName = Global.System.IO.Path.GetFileNameWithoutExtension(document.FullFileName)
    Dim numberMatch = Global.System.Text.RegularExpressions.Regex.Match(assemblyName, "^(\d{3})_")
    If Not numberMatch.Success Then
        Throw New Exception("No three-digit exhibit number found in assembly name: " & assemblyName)
    End If

    Dim repoRoot = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.Process)
    If String.IsNullOrWhiteSpace(repoRoot) Then
        repoRoot = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.User)
    End If
    If String.IsNullOrWhiteSpace(repoRoot) Then
        repoRoot = "C:\Users\clehmann\OneDrive - Swiss Science Center Technorama\01_Projekte\Du entscheidest\GitHub\you-decide"
    End If

    Dim exhibitsRoot = Global.System.IO.Path.Combine(repoRoot, "01 exhibits")
    Dim exhibitDirectory As String = Nothing
    For Each candidate In Global.System.IO.Directory.GetDirectories(exhibitsRoot)
        If Global.System.Text.RegularExpressions.Regex.IsMatch(
            Global.System.IO.Path.GetFileName(candidate),
            "^" & numberMatch.Groups(1).Value & "(?:_|$)") Then
            exhibitDirectory = candidate
            Exit For
        End If
    Next
    If String.IsNullOrWhiteSpace(exhibitDirectory) Then
        Throw New Exception("No exhibit folder found for " & numberMatch.Groups(1).Value)
    End If

    Dim hardwareDirectory = Global.System.IO.Path.Combine(exhibitDirectory, "03 hardware")
    If Not Global.System.IO.Directory.Exists(hardwareDirectory) Then
        Throw New Exception("No 03 hardware folder found for " & numberMatch.Groups(1).Value)
    End If

    Dim stepName = Global.System.IO.Path.GetFileName(exhibitDirectory).ToLowerInvariant() & ".stp"
    outputPath = Global.System.IO.Path.Combine(hardwareDirectory, stepName)
End If

Dim outputDirectory = Global.System.IO.Path.GetDirectoryName(outputPath)
If Not Global.System.IO.Directory.Exists(outputDirectory) Then Global.System.IO.Directory.CreateDirectory(outputDirectory)

Dim translator = inventor.ApplicationAddIns.ItemById("{90AF7F40-0C01-11D5-8E83-0010B541CD80}")
If Not translator.Activated Then translator.Activate()

Dim context = inventor.TransientObjects.CreateTranslationContext()
context.Type = 1
Dim options = inventor.TransientObjects.CreateNameValueMap()
Dim data = inventor.TransientObjects.CreateDataMedium()
data.FileName = outputPath

If translator.HasSaveCopyAsOptions(document, context, options) Then
    options.Value("ApplicationProtocolType") = 3
End If

translator.SaveCopyAs(document, context, options, data)