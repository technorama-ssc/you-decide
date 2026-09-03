Dim sourceDocument As Inventor.Document = ThisApplication.ActiveDocument
If sourceDocument Is Nothing Then
    Throw New Exception("Kein aktives Inventor-Dokument geöffnet.")
End If

Dim sourcePath As String = sourceDocument.FullFileName
If String.IsNullOrWhiteSpace(sourcePath) Then
    Throw New Exception("Das aktive Dokument wurde noch nicht gespeichert.")
End If

Dim outputRoot As String = "C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD\_stp_exports"
If Not System.IO.Directory.Exists(outputRoot) Then
    System.IO.Directory.CreateDirectory(outputRoot)
End If

Dim number As String = System.IO.Path.GetFileNameWithoutExtension(sourcePath).Substring(0, 3)
Dim outputPath As String = System.IO.Path.Combine(outputRoot, number & ".stp")

Dim stepTranslator As Inventor.TranslatorAddIn = ThisApplication.ApplicationAddIns.ItemById("{90AF7F40-0C01-11D5-8E83-0010B541CD80}")
If Not stepTranslator.Activated Then stepTranslator.Activate()

Dim context As Inventor.TranslationContext = ThisApplication.TransientObjects.CreateTranslationContext()
context.Type = Inventor.IOMechanismEnum.kFileBrowseIOMechanism
Dim options As Inventor.NameValueMap = ThisApplication.TransientObjects.CreateNameValueMap()
Dim data As Inventor.DataMedium = ThisApplication.TransientObjects.CreateDataMedium()
data.FileName = outputPath

stepTranslator.SaveCopyAs(sourceDocument, context, options, data)
