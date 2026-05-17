const { latexToOMML } = require('latex-to-omml');
const { Document, Packer, Paragraph, TextRun, ImportedXmlComponent } = require('docx');
const fs = require('fs');

async function test() {
    try {
        const ommlXml = await latexToOMML("x=\\frac{1}{2}");
        const xmlObj = ImportedXmlComponent.fromXmlString(ommlXml);
        
        // Fix the rootKey to prevent <undefined> tags
        xmlObj.rootKey = "m:oMath";
        
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [
                            new TextRun("Ecuación: "),
                            xmlObj
                        ]
                    })
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync("test_omml4.docx", buffer);

        const JSZip = require('jszip');
        const zip = await JSZip.loadAsync(buffer);
        const xmlStr = await zip.file('word/document.xml').async('string');
        console.log(xmlStr);
    } catch (e) {
        console.error(e);
    }
}
test();
