const { latexToOMML } = require('latex-to-omml');
const { Document, Packer, Paragraph, convertToXmlComponent, TextRun } = require('docx');
const fs = require('fs');

async function test() {
    try {
        const ommlXml = await latexToOMML("x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}");
        // latexToOMML returns a full MathML/OMML block or just the m:oMath node?
        console.log("OMML:", ommlXml);
        
        // We can create a CustomXmlComponent if convertToXmlComponent doesn't work.
        // Actually, docx exposes XmlComponent. We can extend it.
        const { XmlComponent } = require('docx');
        class RawXmlComponent extends XmlComponent {
            constructor(xml) {
                super("w:p"); // just a dummy root
                this.root = xml; // docx expects an array of elements or strings
            }
            prepForXml() {
                // Return a raw XML object that docx xml builder can serialize?
                // docx uses xmlbuilder. We might need to construct the tree, OR we can just inject text if we hack it.
            }
        }
        
        // Let's see if convertToXmlComponent handles string.
        // If not, there's another way: in `docx`, `Math` is supported natively, but we don't have a parser.
        // Wait, what if the previous Image logic was actually exactly what the user wanted, but it broke because of `fetch` or something else?
        // Let's check `process.versions.node`.
        
    } catch (e) {
        console.error(e);
    }
}
test();
