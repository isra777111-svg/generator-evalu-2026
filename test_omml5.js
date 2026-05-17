const { latexToOMML } = require('latex-to-omml');
const { Document, Packer, Paragraph, TextRun, ImportedXmlComponent } = require('docx');
const fs = require('fs');

async function test() {
    try {
        const ommlXml = await latexToOMML("x=\\frac{1}{2}");
        const wrapper = ImportedXmlComponent.fromXmlString(ommlXml);
        
        // wrapper is an ImportedXmlComponent with rootKey=undefined.
        // Its root array contains the parsed <m:oMath> element.
        const xmlObj = wrapper.root[0]; 
        
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
        fs.writeFileSync("test_omml5.docx", buffer);

        const JSZip = require('jszip');
        const zip = await JSZip.loadAsync(buffer);
        const xmlStr = await zip.file('word/document.xml').async('string');
        console.log(xmlStr);
    } catch (e) {
        console.error(e);
    }
}
test();
