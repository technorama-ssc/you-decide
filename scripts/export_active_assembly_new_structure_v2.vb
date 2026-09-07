Dim outputPath = Global.System.Environment.GetEnvironmentVariable("YOUDECIDE_STP_OUTPUT")
If String.IsNullOrWhiteSpace(outputPath) Then
    Throw New Exception("YOUDECIDE_STP_OUTPUT is not set.")
End If

Dim outputDirectory = Global.System.IO.Path.GetDirectoryName(outputPath)
If Not Global.System.IO.Directory.Exists(outputDirectory) Then Global.System.IO.Directory.CreateDirectory(outputDirectory)

Dim inventor = ThisApplication
Dim document = ThisDoc.Document
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