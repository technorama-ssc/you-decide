Sub Main()
    Dim sourceDocument As Inventor.Document = ThisApplication.ActiveDocument
    If sourceDocument Is Nothing Then
        Throw New Exception("Kein aktives Inventor-Dokument geoeffnet.")
    End If

    Dim sourcePath As String = sourceDocument.FullFileName
    If String.IsNullOrWhiteSpace(sourcePath) Then
        Throw New Exception("Das aktive Dokument wurde noch nicht gespeichert.")
    End If

    Dim assemblyName As String = System.IO.Path.GetFileNameWithoutExtension(sourcePath)
    Dim numberMatch = System.Text.RegularExpressions.Regex.Match(assemblyName, "^(\d{3})_")
    If Not numberMatch.Success Then
        Throw New Exception("Keine dreistellige Nummer im Dateinamen gefunden: " & assemblyName)
    End If
    Dim assemblyNumber As String = numberMatch.Groups(1).Value

    Dim repoRoot As String = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.Process)
    If String.IsNullOrWhiteSpace(repoRoot) Then
        repoRoot = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_REPO_ROOT", Global.System.EnvironmentVariableTarget.User)
    End If
    If String.IsNullOrWhiteSpace(repoRoot) Then
        repoRoot = "C:\Users\clehmann\OneDrive - Swiss Science Center Technorama\01_Projekte\Du entscheidest\GitHub\you-decide"
    End If

    Dim sectionNames As String() = {"00 you decide", "01 exhibits", "02 system"}
    Dim targetDirectory As String = Nothing
    Dim targetSection As String = Nothing
    For Each sectionName As String In sectionNames
        Dim sectionRoot As String = System.IO.Path.Combine(repoRoot, sectionName)
        If Not System.IO.Directory.Exists(sectionRoot) Then Continue For

        For Each candidate As String In System.IO.Directory.GetDirectories(sectionRoot)
            If System.Text.RegularExpressions.Regex.IsMatch(
                System.IO.Path.GetFileName(candidate),
                "^" & System.Text.RegularExpressions.Regex.Escape(assemblyNumber) & "(?:_|$)") Then
                If targetDirectory IsNot Nothing Then
                    Throw New Exception("Mehrere Zielordner fuer Nummer " & assemblyNumber & " gefunden.")
                End If
                targetDirectory = candidate
                targetSection = sectionName
            End If
        Next
    Next
    If String.IsNullOrWhiteSpace(targetDirectory) Then
        Throw New Exception("Kein Zielordner in 00 you decide, 01 exhibits oder 02 system fuer " & assemblyNumber & " gefunden.")
    End If

    Dim hardwareDirectory As String = System.IO.Path.Combine(targetDirectory, "03 hardware")
    If Not System.IO.Directory.Exists(hardwareDirectory) Then
        Throw New Exception("Kein 03 hardware-Ordner fuer " & assemblyNumber & " gefunden: " & targetDirectory)
    End If

    Dim stepName As String = System.IO.Path.GetFileName(targetDirectory).ToLowerInvariant() & ".stp"
    Dim finalPath As String = System.IO.Path.Combine(hardwareDirectory, stepName)
    Dim outputPath As String = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_STP_OUTPUT", Global.System.EnvironmentVariableTarget.Process)
    If String.IsNullOrWhiteSpace(outputPath) Then
        outputPath = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_STP_OUTPUT", Global.System.EnvironmentVariableTarget.User)
    End If
    Dim usesStaging As Boolean = Not String.IsNullOrWhiteSpace(outputPath)
    If Not usesStaging Then outputPath = finalPath

    Dim outputDirectory As String = System.IO.Path.GetDirectoryName(outputPath)
    If Not System.IO.Directory.Exists(outputDirectory) Then System.IO.Directory.CreateDirectory(outputDirectory)

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

    If usesStaging Then
        MessageBox.Show("STP exportiert und bereit zur Veroeffentlichung: " & outputPath, "You Decide")
        Exit Sub
    End If

    Dim relativePath As String = targetSection & "\" & System.IO.Path.GetFileName(targetDirectory) & "\03 hardware\" & stepName
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
    If gitProcess.ExitCode <> 0 AndAlso gitProcess.ExitCode <> 1 Then Throw New Exception("Git-Pruefung fehlgeschlagen: " & gitError.Trim())

    Dim pushed As Boolean = False
    If gitProcess.ExitCode = 1 Then
        startInfo.Arguments = "commit -m " & Chr(34) & "Update generated STEP file " & assemblyNumber & Chr(34)
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
        pushed = True
    End If

    If pushed Then
        MessageBox.Show("STP aktualisiert und nach GitHub gepusht: " & relativePath, "You Decide")
    Else
        MessageBox.Show("STP exportiert; keine neue Git-Aenderung: " & relativePath, "You Decide")
    End If
End Sub
