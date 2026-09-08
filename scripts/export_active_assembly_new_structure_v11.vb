Function RunGit(repoRoot As String, arguments As String) As Integer
    Dim startInfo As New System.Diagnostics.ProcessStartInfo()
    startInfo.FileName = "git.exe"
    startInfo.Arguments = arguments
    startInfo.WorkingDirectory = repoRoot
    startInfo.UseShellExecute = False
    startInfo.CreateNoWindow = True
    startInfo.RedirectStandardOutput = True
    startInfo.RedirectStandardError = True

    Dim process = System.Diagnostics.Process.Start(startInfo)
    Dim output = process.StandardOutput.ReadToEnd()
    Dim errorOutput = process.StandardError.ReadToEnd()
    process.WaitForExit()

    If process.ExitCode <> 0 AndAlso Not String.IsNullOrWhiteSpace(errorOutput) Then
        Throw New Exception("Git-Fehler: " & errorOutput.Trim())
    End If
    Return process.ExitCode
End Function

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

Dim exhibitTitle As String = System.IO.Path.GetFileName(exhibitDirectory).ToLowerInvariant()
Dim stepName As String = exhibitTitle & ".stp"
Dim outputPath As String = System.IO.Path.Combine(hardwareDirectory, stepName)

Dim stepTranslator As Inventor.TranslatorAddIn = ThisApplication.ApplicationAddIns.ItemById("{90AF7F40-0C01-11D5-8E83-0010B541CD80}")
If Not stepTranslator.Activated Then stepTranslator.Activate()

Dim context As Inventor.TranslationContext = ThisApplication.TransientObjects.CreateTranslationContext()
context.Type = Inventor.IOMechanismEnum.kFileBrowseIOMechanism
Dim options As Inventor.NameValueMap = ThisApplication.TransientObjects.CreateNameValueMap()
Dim data As Inventor.DataMedium = ThisApplication.TransientObjects.CreateDataMedium()
data.FileName = outputPath
stepTranslator.SaveCopyAs(sourceDocument, context, options, data)

Dim relativePath As String = "01 exhibits\" & System.IO.Path.GetFileName(exhibitDirectory) & "\03 hardware\" & stepName
Dim quotedPath As String = Chr(34) & relativePath & Chr(34)
If RunGit(repoRoot, "add -- " & quotedPath) <> 0 Then
    Throw New Exception("Git konnte die STP-Datei nicht vormerken.")
End If

Dim stagedStatus = RunGit(repoRoot, "diff --cached --quiet -- " & quotedPath)
If stagedStatus = 1 Then
    If RunGit(repoRoot, "commit -m " & Chr(34) & "Update generated exhibit STEP file " & numberMatch.Groups(1).Value & Chr(34)) <> 0 Then
        Throw New Exception("Git konnte den Commit nicht erstellen.")
    End If
    If RunGit(repoRoot, "push origin HEAD:main") <> 0 Then
        Throw New Exception("Git konnte nicht nach GitHub pushen.")
    End If
End If

MessageBox.Show("STP aktualisiert und nach GitHub gepusht: " & relativePath, "You Decide")
