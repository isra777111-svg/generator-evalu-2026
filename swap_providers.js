const fs = require('fs');
const path = require('path');

function swapInFile(filename) {
    const filePath = path.join(__dirname, 'netlify', 'functions', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the current Gemini and Groq blocks
    const geminiMatch = content.match(/        \/\/ Intentar Gemini\s+let geminiIndex = 1;[\s\S]*?geminiIndex\+\+;\s*\}/);
    if (!geminiMatch) {
        // Adaptaciones doesn't have the comment // Intentar Gemini
    }

    // A better approach is to simply replace the whole file since we know exactly what we want to do.
    // Or I'll just rewrite both files with the corrected order.
}

swapInFile('generate-pdc-tabla.js');
swapInFile('generate-pdc-adaptaciones.js');
