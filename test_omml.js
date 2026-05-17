const latexToOmml = require('latex-to-omml');
const { Document, Packer, Paragraph, TextRun, Math, MathRun, ExternalStylesFactory } = require('docx');
const fs = require('fs');

try {
    const omml = latexToOmml("x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}");
    console.log("OMML OUTPUT:");
    console.log(omml);

    // Can we inject this OMML into docx?
    // In docx, we can inject raw XML via custom components if necessary, but docx does not have a native "RawXmlComponent".
    // Wait, docx has something like `<w:oMath>`? OMML output is probably `<m:oMath>...</m:oMath>`.
    
} catch (e) {
    console.error(e);
}
