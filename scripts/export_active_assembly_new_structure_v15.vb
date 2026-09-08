Sub Main()
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
    Dim options = ThisApplication.TransientObjects.CreateNameValueMap()
    Dim data = ThisApplication.TransientObjects.CreateDataMedium()
    data.FileName = outputPath
    stepTranslator.SaveCopyAs(sourceDocument, context, options, data)

    Dim stable As Boolean = False
    Dim previousLength As Long = -1
    Dim previousWriteTime As DateTime = DateTime.MinValue
    Dim deadline As DateTime = DateTime.Now.AddSeconds(30)
    Do While DateTime.Now < deadline
        If System.IO.File.Exists(outputPath) Then
            Dim fileInfo As New System.IO.FileInfo(outputPath)
            If fileInfo.Length > 0 AndAlso fileInfo.Length = previousLength AndAlso fileInfo.LastWriteTime = previousWriteTime Then
                stable = True
                Exit Do
            End If
            previousLength = fileInfo.Length
            previousWriteTime = fileInfo.LastWriteTime
        End If
        System.Threading.Thread.Sleep(1000)
    Loop
    If Not stable Then
        Throw New Exception("STP-Datei wurde nicht innerhalb von 30 Sekunden stabil geschrieben: " & outputPath)
    End If

    Dim relativePath As String = "01 exhibits\" & System.IO.Path.GetFileName(exhibitDirectory) & "\03 hardware\" & stepName
    Dim quotedPath As String = Chr(34) & relativePath & Chr(34)
    Dim startInfo As New System.Diagnostics.ProcessStartInfo()
    startInfo.FileName = "git.exe"
    startInfo.WorkingDirectory = repoRoot
    startInfo.UseShellExecute = False
    startInfo.CreateNoWindow = True
    startInfo.RedirectStandardOutput = True
    startInfo.RedirectStandardError = True
    Dim gitProcess As System.Diagnostics.Process
    Dim gitOutput As String
    Dim gitError As String

    startInfo.Arguments = "add -- " & quotedPath
    gitProcess = System.Diagnostics.Process.Start(startInfo)
    gitOutput = gitProcess.StandardOutput.ReadToEnd()
    gitError = gitProcess.StandardError.ReadToEnd()
    gitProcess.WaitForExit()
    If gitProcess.ExitCode <> 0 Then Throw New Exception("Git add fehlgeschlagen: " & gitError.Trim())

    startInfo.Arguments = "diff --cached --quiet -- " & quotedPath
    gitProcess = System.Diagnostics.Process.Start(startInfo)
    gitOutput = gitProcess.StandardOutput.ReadToEnd()
    gitError = gitProcess.StandardError.ReadToEnd()
    gitProcess.WaitForExit()
    If gitProcess.ExitCode <> 0 AndAlso gitProcess.ExitCode <> 1 Then Throw New Exception("Git-Prüfung fehlgeschlagen: " & gitError.Trim())

    If gitProcess.ExitCode = 1 Then
        startInfo.Arguments = "commit -m " & Chr(34) & "Update generated exhibit STEP file " & numberMatch.Groups(1).Value & Chr(34)
        gitProcess = System.Diagnostics.Process.Start(startInfo)
        gitOutput = gitProcess.StandardOutput.ReadToEnd()
        gitError = gitProcess.StandardError.ReadToEnd()
        gitProcess.WaitForExit()
        If gitProcess.ExitCode <> 0 Then Throw New Exception("Git commit fehlgeschlagen: " & gitError.Trim())

        startInfo.Arguments = "-c rebase.autoStash=true pull --rebase origin main"
        gitProcess = System.Diagnostics.Process.Start(startInfo)
        gitOutput = gitProcess.StandardOutput.ReadToEnd()
        gitError = gitProcess.StandardError.ReadToEnd()
        gitProcess.WaitForExit()
        If gitProcess.ExitCode <> 0 Then Throw New Exception("Git pull --rebase fehlgeschlagen: " & gitError.Trim())

        startInfo.Arguments = "push origin HEAD:main"
        gitProcess = System.Diagnostics.Process.Start(startInfo)
        gitOutput = gitProcess.StandardOutput.ReadToEnd()
        gitError = gitProcess.StandardError.ReadToEnd()
        gitProcess.WaitForExit()
        If gitProcess.ExitCode <> 0 Then Throw New Exception("Git push fehlgeschlagen: " & gitError.Trim())
    End If

    MessageBox.Show("STP aktualisiert und nach GitHub gepusht: " & relativePath, "You Decide")
End Sub
