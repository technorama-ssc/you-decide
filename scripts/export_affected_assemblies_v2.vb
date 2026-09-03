Imports System.IO
Imports System.Collections.Generic

Dim cadRoot = "C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD"
Dim assemblyRoot = System.IO.Path.Combine(cadRoot, "200_Exponate")
Dim outputRoot = System.IO.Path.Combine(cadRoot, "_stp_exports")
Dim changedPath = ThisApplication.ActiveDocument.FullFileName
Dim changedFullPath = System.IO.Path.GetFullPath(changedPath).ToLowerInvariant()

If Not Directory.Exists(assemblyRoot) Then
    Throw New Exception("Exhibit assembly folder not found: " & assemblyRoot)
End If
If Not Directory.Exists(outputRoot) Then Directory.CreateDirectory(outputRoot)

Dim inventor = ThisApplication
Dim impacted = New List(Of String)

For Each filePath In System.IO.Directory.GetFiles(assemblyRoot, "*.iam", System.IO.SearchOption.AllDirectories)
    If filePath.ToLowerInvariant().Contains("\oldversions\") Then Continue For

    Dim assemblyDocument = Nothing
    Try
        assemblyDocument = inventor.Documents.Open(filePath, False)
        Dim isImpacted = filePath.ToLowerInvariant() = changedFullPath
        If Not isImpacted Then
            For Each reference In assemblyDocument.ReferencedDocuments
                If reference.FullFileName.ToLowerInvariant() = changedFullPath Then
                    isImpacted = True
                    Exit For
                End If
            Next
        End If
        If isImpacted Then impacted.Add(filePath)
    Catch
        ' Skip assemblies Inventor cannot inspect and continue with the rest.
    Finally
        If assemblyDocument IsNot Nothing Then assemblyDocument.Close(False)
    End Try
Next

Dim stepTranslator = inventor.ApplicationAddIns.ItemById("{90AF7F40-0C01-11D5-8E83-0010B541CD80}")
If Not stepTranslator.Activated Then stepTranslator.Activate()

For Each assemblyPath In impacted
    Dim assemblyDocument = Nothing
    Try
        assemblyDocument = inventor.Documents.Open(assemblyPath, False)
        assemblyDocument.Update2(True)

        Dim number = System.IO.Path.GetFileNameWithoutExtension(assemblyPath).Substring(0, 3)
        Dim outputPath = System.IO.Path.Combine(outputRoot, number & ".stp")
        Dim context = inventor.TransientObjects.CreateTranslationContext()
        context.Type = 1
        Dim options = inventor.TransientObjects.CreateNameValueMap()
        Dim data = inventor.TransientObjects.CreateDataMedium()
        data.FileName = outputPath
        If stepTranslator.HasSaveCopyAsOptions(assemblyDocument, context, options) Then
            options.Value("ApplicationProtocolType") = 3
        End If
        stepTranslator.SaveCopyAs(assemblyDocument, context, options, data)
    Finally
        If assemblyDocument IsNot Nothing Then assemblyDocument.Close(False)
    End Try
Next
