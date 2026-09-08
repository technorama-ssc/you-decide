Dim inventor = ThisApplication
Dim document = inventor.ActiveDocument
If document Is Nothing Then
    Throw New Exception("Kein aktives Inventor-Dokument geöffnet.")
End If

Dim sourcePath = document.FullFileName
If String.IsNullOrWhiteSpace(sourcePath) Then
    Throw New Exception("Das aktive Dokument wurde noch nicht gespeichert.")
End If

Dim assemblyName = Global.System.IO.Path.GetFileNameWithoutExtension(sourcePath)
Dim numberMatch = Global.System.Text.RegularExpressions.Regex.Match(assemblyName, "^(\d{3})_")
If Not numberMatch.Success Then
    Throw New Exception("Keine dreistellige Exponatnummer im Dateinamen gefunden: " & assemblyName)
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
    Throw New Exception("Kein Exhibit-Ordner für " & numberMatch.Groups(1).Value & " gefunden.")
End If

Dim hardwareDirectory = Global.System.IO.Path.Combine(exhibitDirectory, "03 hardware")
If Not Global.System.IO.Directory.Exists(hardwareDirectory) Then
    Throw New Exception("Kein 03 hardware-Ordner für " & numberMatch.Groups(1).Value & " gefunden.")
End If

Dim stepName = Global.System.IO.Path.GetFileName(exhibitDirectory).ToLowerInvariant() & ".stp"
Dim outputPath = Global.System.IO.Path.Combine(hardwareDirectory, stepName)

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

MessageBox.Show("STP aktualisiert: " & outputPath, "You Decide")
