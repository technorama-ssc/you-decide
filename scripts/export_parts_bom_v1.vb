Imports System.IO
Imports System.Collections.Generic

Dim sourceDocument As Inventor.AssemblyDocument = ThisApplication.ActiveDocument
If sourceDocument Is Nothing Then Throw New Exception("Kein aktives Baugruppen-Dokument geöffnet.")

Dim sourcePath As String = sourceDocument.FullFileName
If String.IsNullOrWhiteSpace(sourcePath) Then Throw New Exception("Die Baugruppe wurde noch nicht gespeichert.")

Dim cadRoot As String = "C:\Users\clehmann\Swiss Science Center Technorama\Projekte - Dokumente\General\SA_2023_DuEntscheidest\30_Entwicklung\03_Baukasten\20_System\CAD"
Dim outputRoot As String = System.IO.Path.Combine(cadRoot, "_parts_exports")
If Not System.IO.Directory.Exists(outputRoot) Then System.IO.Directory.CreateDirectory(outputRoot)

Dim number As String = System.IO.Path.GetFileNameWithoutExtension(sourcePath).Substring(0, 3)
Dim outputPath As String = System.IO.Path.Combine(outputRoot, number & ".csv")

Dim bom As Inventor.BOM = sourceDocument.ComponentDefinition.BOM
bom.StructuredViewEnabled = True
Dim view As Inventor.BOMView = bom.BOMViews.Item("Structured")

Using writer As New StreamWriter(outputPath, False, System.Text.Encoding.UTF8)
    writer.WriteLine("Category;Quantity;PartNumber;FilePath")
    WriteRows(view.BOMRows, writer)
End Using

Sub WriteRows(rows As Inventor.BOMRows, writer As StreamWriter)
    For Each row As Inventor.BOMRow In rows
        If row.ComponentDefinitions.Count = 0 Then Continue For
        Dim definition As Inventor.ComponentDefinition = row.ComponentDefinitions.Item(1)
        Dim document As Inventor.Document = definition.Document
        Dim path As String = document.FullFileName
        Dim category As String = "OTHER"
        Dim lowerPath As String = path.ToLowerInvariant()
        If lowerPath.Contains("\001_plattensystem\") OrElse lowerPath.Contains("\002_wabenplattensystem\") OrElse lowerPath.Contains("\003_harassensystem\") Then
            category = "SYSTEM COMPONENTS"
        ElseIf lowerPath.Contains("\100_objekte\") Then
            category = "OBJECTS"
        End If
        writer.WriteLine(String.Join(";", category, row.ItemQuantity, definition.Document.PropertySets.Item("Design Tracking Properties").Item("Part Number").Value, path))
        If row.ChildRows IsNot Nothing Then WriteRows(row.ChildRows, writer)
    Next
End Sub
