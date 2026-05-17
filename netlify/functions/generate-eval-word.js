require('dotenv').config();
const {
    Document, Packer, Paragraph, TextRun, AlignmentType, ShadingType, BorderStyle, WidthType, Table, TableRow, TableCell, VerticalAlign, PageOrientation, ImportedXmlComponent, convertMillimetersToTwip
} = require('docx');
const { latexToOMML } = require('latex-to-omml');

const C = {
    azulOscuro: '1E3A8A', 
    azulClaro: 'EFF6FF',
    negro: '111827', 
    grisTexto: '4B5563',
    grisFondo: 'F9FAFB',
    grisBorde: 'D1D5DB',
    blanco: 'FFFFFF',
    primary: '2563EB'
};

const FONT = 'Calibri';
const FS = { titulo: 32, h1: 26, h2: 22, normal: 22, small: 18 }; 

function parseInline(texto) {
    const runs = [];
    // Unescape \_ to _ early
    const cleanText = texto.replace(/\\_/g, '_');
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
    let m;
    while ((m = regex.exec(cleanText)) !== null) {
        if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, size: FS.normal, font: FONT, color: C.negro }));
        else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true, size: FS.normal, font: FONT, color: C.negro }));
        else if (m[4]) runs.push(new TextRun({ text: m[4], size: FS.normal, font: FONT, color: C.negro }));
    }
    return runs.length ? runs : [new TextRun({ text: cleanText, size: FS.normal, font: FONT, color: C.negro })];
}

async function parseInlineAndMathAsync(texto) {
    const runs = [];
    const regex = /(\$\$.+?\$\$|\$.+?\$)/g;
    const parts = texto.split(regex);

    for (const part of parts) {
        if (!part) continue;
        
        let exp = null;
        let isBlock = false;
        
        if (part.startsWith('$$') && part.endsWith('$$')) {
            exp = part.slice(2, -2).trim();
            isBlock = true;
        } else if (part.startsWith('$') && part.endsWith('$')) {
            exp = part.slice(1, -1).trim();
            isBlock = false;
        }

        if (exp) {
            try {
                // Convertir LaTeX a formato nativo OMML de Microsoft Word
                const ommlXml = await latexToOMML(exp);
                // Usar ImportedXmlComponent para parsear, pero extraer el nodo raíz
                // para evitar que docx inserte la etiqueta inválida <undefined>
                const wrapper = ImportedXmlComponent.fromXmlString(ommlXml);
                const xmlObj = wrapper.root[0]; // Extraer el elemento <m:oMath> real
                runs.push(xmlObj);
            } catch (e) {
                console.error("Error convirtiendo LaTeX a OMML:", exp, e.message);
                runs.push(...parseInline(isBlock ? `$$${exp}$$` : `$${exp}$`));
            }
        } else {
            runs.push(...parseInline(part));
        }
    }
    return runs;
}

async function mdAParagraphs(markdown) {
    if (!markdown) return [new Paragraph({ children: [new TextRun('')] })];
    
    const lineas = markdown.split('\n');
    const result = [];
    let tableRows = [];

    const flushTable = async () => {
        if (tableRows.length === 0) return;
        const docxRows = [];
        for (let i = 0; i < tableRows.length; i++) {
            const row = tableRows[i];
            const cells = row.split('|').map(c => c.trim()).filter((c, index, arr) => !(c === '' && (index === 0 || index === arr.length - 1)));
            const docxCells = [];
            for (let j = 0; j < cells.length; j++) {
                const inlineRuns = await parseInlineAndMathAsync(cells[j]);
                docxCells.push(new TableCell({
                    margins: { top: 120, bottom: 120, left: 150, right: 150 },
                    children: [new Paragraph({ children: inlineRuns, alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT })],
                    verticalAlign: VerticalAlign.CENTER,
                    shading: i === 0 ? { type: ShadingType.CLEAR, fill: C.grisFondo } : undefined
                }));
            }
            if (docxCells.length > 0) docxRows.push(new TableRow({ children: docxCells }));
        }
        if (docxRows.length > 0) {
            result.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                    left: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                    right: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                },
                rows: docxRows,
            }));
            result.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun('')] }));
        }
        tableRows = [];
    };

    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i].trim();
        
        if (l.startsWith('|') && l.endsWith('|')) {
            if (/^\|[\s\-\:\|]+\|$/.test(l)) {
                continue;
            }
            tableRows.push(l);
            continue;
        } else {
            await flushTable();
        }

        if (!l) continue;

        if (l.startsWith('### ')) { 
            result.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: l.slice(4).replace(/\*\*/g, ''), bold: true, size: FS.h2, font: FONT, color: C.azulOscuro })] })); 
            continue; 
        }
        if (l.startsWith('## ')) {
            result.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: l.slice(3).replace(/\*\*/g, ''), bold: true, size: FS.h1, font: FONT, color: C.azulOscuro })] })); 
            continue;
        }
        if (l.startsWith('# ')) { 
            const isSolucionario = l.toUpperCase().includes('HOJA DE RESPUESTAS') || l.toUpperCase().includes('SOLUCIONARIO');
            result.push(new Paragraph({ 
                alignment: AlignmentType.CENTER, 
                spacing: { before: 240, after: 160 }, 
                pageBreakBefore: isSolucionario,
                children: [new TextRun({ text: l.slice(2).replace(/\*\*/g, ''), bold: true, size: FS.titulo, font: FONT, color: C.azulOscuro })] 
            })); 
            continue; 
        }
        if (/^[-*]\s+/.test(l)) { 
            const inlineRuns = await parseInlineAndMathAsync(l.replace(/^[-*]\s+/, ''));
            result.push(new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 80 },
                children: inlineRuns
            }));
            continue; 
        }
        
        // Numeración de preguntas (ej. "1. ", "2) ")
        const numMatch = l.match(/^(\d+[\.\)])\s+/);
        if (numMatch) {
            const restText = l.slice(numMatch[0].length);
            const inlineRuns = await parseInlineAndMathAsync(restText);
            result.push(new Paragraph({ 
                spacing: { before: 300, after: 120 }, 
                children: [
                    ...parseInline("**" + numMatch[1] + "** "),
                    ...inlineRuns
                ]
            }));
            continue;
        }
        
        // Opciones de preguntas (ej. "A. ", "b) " o "(  ) Verdadero")
        const letterMatch = l.match(/^([a-zA-Z][\.\)]|\(\s*\))\s+/);
        if (letterMatch) {
            const restText = l.slice(letterMatch[0].length);
            const inlineRuns = await parseInlineAndMathAsync(restText);
            
            const isCheckbox = letterMatch[1].startsWith('(');
            const prefixStr = isCheckbox ? letterMatch[1] + " " : "**" + letterMatch[1] + "** ";
            
            result.push(new Paragraph({ 
                spacing: { after: 80 }, 
                indent: { left: 720 }, // Sangría de 0.5 pulgadas para opciones
                children: [
                    ...parseInline(prefixStr),
                    ...inlineRuns
                ]
            }));
            continue;
        }
        
        // Texto normal
        const inlineRuns = await parseInlineAndMathAsync(l);
        result.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns }));
    }
    
    await flushTable();
    
    return result.length ? result : [new Paragraph({ children: [new TextRun('')] })];
}

function celdaInfo(label, valor, colSpan = 1) {
    const valorTexto = valor ? valor : "__________________________________________";
    return new TableCell({
        columnSpan: colSpan,
        shading: { type: ShadingType.CLEAR, fill: C.blanco },
        margins: { top: 120, bottom: 120, left: 150, right: 150 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
            new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                    new TextRun({ text: label + " ", bold: true, size: FS.small, font: FONT, color: C.grisTexto }),
                    new TextRun({ text: valorTexto, bold: valor ? true : false, size: FS.normal, font: FONT, color: C.negro })
                ]
            })
        ]
    });
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    let evalData;
    try {
        evalData = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
    }

    const f = evalData.formData || {};
    let markdownContent = evalData.generatedContent || "";
    let extractedTitle = "EVALUACIÓN – " + (f.materia ? f.materia.toUpperCase() : "APRENDIZAJES");

    const mdLines = markdownContent.split('\n');
    if (mdLines.length > 0 && mdLines[0].trim().toUpperCase().startsWith('# EVALUACIÓN')) {
        extractedTitle = mdLines[0].trim().substring(2).toUpperCase(); 
        mdLines.shift();
        if (mdLines.length > 0 && mdLines[0].trim() === '') mdLines.shift();
        markdownContent = mdLines.join('\n');
    }

    try {
        const children = [];

        // ── TÍTULO PRINCIPAL ──
        if (f.ue) {
            children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [new TextRun({ text: `UNIDAD EDUCATIVA: ${f.ue.toUpperCase()}`, bold: true, size: FS.h1, font: FONT, color: C.azulOscuro })]
            }));
        }

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: extractedTitle, bold: true, size: FS.titulo, font: FONT, color: C.azulOscuro })]
        }));
        
        let subtitulo = "EDUCACIÓN ACADÉMICA";
        if (f.nivel_educativo === 'Primaria') subtitulo = "EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL";
        else if (f.nivel_educativo === 'Secundaria') subtitulo = "EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA";
        else if (f.nivel_educativo === 'Superior') subtitulo = "EDUCACIÓN SUPERIOR Y FORMACIÓN PROFESIONAL";

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 120 },
            children: [new TextRun({ text: `NIVEL: ${subtitulo}`, bold: true, size: FS.small, font: FONT, color: C.grisTexto })]
        }));
        
        // ── TABLA DE DATOS REFERENCIALES ──
        const headerTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: C.grisBorde },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: C.grisBorde },
                left: { style: BorderStyle.SINGLE, size: 6, color: C.grisBorde },
                right: { style: BorderStyle.SINGLE, size: 6, color: C.grisBorde },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: C.grisBorde },
            },
            rows: [
                new TableRow({
                    children: [
                        celdaInfo("ESTUDIANTE:", ""),
                        celdaInfo("CURSO:", f.curso),
                    ]
                }),
                new TableRow({
                    children: [
                        celdaInfo("FECHA:", ""),
                        celdaInfo("MATERIA:", f.materia),
                    ]
                })
            ]
        });
        children.push(headerTable);
        
        // Línea de separación estética
        children.push(new Paragraph({
            spacing: { before: 200, after: 300 },
            border: {
                bottom: { style: BorderStyle.SINGLE, size: 12, color: C.azulOscuro, space: 1 }
            },
            children: [new TextRun({ text: "" })]
        }));

        // ── CONTENIDO DE LA EVALUACIÓN ──
        const paragraphContents = await mdAParagraphs(markdownContent);
        children.push(...paragraphContents);

        // ── GENERACIÓN DEL DOCUMENTO ──
        const doc = new Document({
            styles: {
                default: { document: { run: { font: FONT, size: FS.normal, color: C.negro } } }
            },
            sections: [{
                properties: {
                    page: {
                        size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
                        margin: {
                            top: convertMillimetersToTwip(15),
                            bottom: convertMillimetersToTwip(15),
                            left: convertMillimetersToTwip(15),
                            right: convertMillimetersToTwip(15)
                        }
                    }
                },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Evaluacion-${(f.materia || 'Materia').replace(/\s+/g, '_')}.docx"`,
                'Access-Control-Allow-Origin': '*',
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error('[generate-eval-word] Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'No se pudo generar el documento Word.', details: error.message })
        };
    }
};
