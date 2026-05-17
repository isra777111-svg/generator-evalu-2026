const { latexToOMML } = require('latex-to-omml');
const { Document, Packer, Paragraph, TextRun, convertToXmlComponent, ImportedXmlComponent } = require('docx');
const fs = require('fs');

async function test() {
    try {
        const ommlXml = await latexToOMML("x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}");
        console.log("OMML length:", ommlXml.length);
        
        // Use convertToXmlComponent? It expects DOM node, not string.
        // What if we just use a dirty hack:
        class OmmlNode {
            constructor(xml) {
                this.xml = xml;
            }
            prepForXml() {
                // If docx expects prepForXml to return an object with _attr etc.
                // Wait, if we return { _raw: xml }, maybe xmlbuilder uses it?
                // No, xmlbuilder uses `raw(text)` or similar. 
                return { _raw: this.xml };
            }
        }

        // Another hack: replace the XML string in the final buffer? No, packer is zipped.
        
        // Let's check how ImportedXmlComponent is instantiated
        console.log(ImportedXmlComponent);
        // Let's create an ImportedXmlComponent with the OMML
        // The signature is usually ImportedXmlComponent.fromXmlString(xmlStr) in some versions.
        let xmlObj;
        if (ImportedXmlComponent.fromXmlString) {
             xmlObj = ImportedXmlComponent.fromXmlString(ommlXml);
        } else {
             // Let's use DOMParser
             const { DOMParser } = require('@xmldom/xmldom');
             const doc = new DOMParser().parseFromString(ommlXml, "application/xml");
             xmlObj = convertToXmlComponent(doc.documentElement);
        }

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
        fs.writeFileSync("test_eq.docx", buffer);
        console.log("Written test_eq.docx successfully");

    } catch (e) {
        console.error(e);
    }
}
test();
