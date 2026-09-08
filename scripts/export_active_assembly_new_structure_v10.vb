Dim sourceDocument As Inventor.Document = ThisApplication.ActiveDocument
If sourceDocument Is Nothing Then
    Throw New Exception("Kein aktives Inventor-Dokument geöffnet.")
End If

Dim sourcePath As String = sourceDocument.FullFileName
If String.IsNullOrWhiteSpace(sourcePath) Then
    Throw New Exception("Das aktive Dokument wurde noch nicht gespeichert.")
End If

Dim assemblyName As String = System.IO.Path.GetFileNameWithoutExtension(sourcePath)
Dim numberMatch = System.Text.RegularExpressions.Regex.Match(assemblyName, "^(\d{3})_")
If Not numberMatch.Success Then
    Throw New Exception("Keine dreistellige Exponatnummer im Dateinamen gefunden: " & assemblyName)
End If

Dim repoRoot As String = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.Process)
If String.IsNullOrWhiteSpace(repoRoot) Then
    repoRoot = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.User)
End If
If String.IsNullOrWhiteSpace(repoRoot) Then
    repoRoot = "C:\Users\clehmann\OneDrive - Swiss Science Center Technorama\01_Projekte\Du entscheidest\GitHub\you-decide"
End If

Dim exhibitsRoot As String = System.IO.Path.Combine(repoRoot, "01 exhibits")
Dim exhibitDirectory As String = Nothing
For Each candidate As String In System.IO.Directory.GetDirectories(exhibitsRoot)
    If System.Text.RegularExpressions.Regex.IsMatch(
        System.IO.Path.GetFileName(candidate),
        "^" & numberMatch.Groups(1).Value & "(?:_|$)") Then
        exhibitDirectory = candidate
        Exit For
    End If
Next
If String.IsNullOrWhiteSpace(exhibitDirectory) Then
    Throw New Exception("Kein Exhibit-Ordner für " & numberMatch.Groups(1).Value & " gefunden.")
End If

Dim hardwareDirectory As String = System.IO.Path.Combine(exhibitDirectory, "03 hardware")
If Not System.IO.Directory.Exists(hardwareDirectory) Then
    Throw New Exception("Kein 03 hardware-Ordner für " & numberMatch.Groups(1).Value & " gefunden.")
End If

Dim stepName As String = System.IO.Path.GetFileName(exhibitDirectory).ToLowerInvariant() & ".stp"
Dim outputPath As String = System.IO.Path.Combine(hardwareDirectory, stepName)

Dim stepTranslator As Inventor.TranslatorAddIn = ThisApplication.ApplicationAddIns.ItemById("{90AF7F40-0C01-11D5-8E83-0010B541CD80}")
If Not stepTranslator.Activated Then stepTranslator.Activate()

Dim context As Inventor.TranslationContext = ThisApplication.TransientObjects.CreateTranslationContext()
context.Type = Inventor.IOMechanismEnum.kFileBrowseIOMechanism
Dim options As Inventor.NameValueMap = ThisApplication.TransientObjects.CreateNameValueMap()
Dim data As Inventor.DataMedium = ThisApplication.TransientObjects.CreateDataMedium()
data.FileName = outputPath

stepTranslator.SaveCopyAs(sourceDocument, context, options, data)

MessageBox.Show("STP aktualisiert: " & outputPath, "You Decide")
