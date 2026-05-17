/* =================================================================
   Evaluaciones 2026 - SCRIPT.JS
   Sistema de Generación de Evaluaciones con IA
   ================================================================= */

let evalData = { formData: {}, generatedContent: "" };
let fileBase64 = null;
let fileMimeType = null;
let extractedText = null;

document.addEventListener("DOMContentLoaded", function () {
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

function selectSource(sourceId) {
    // Hide all containers
    document.querySelectorAll('.source-container').forEach(el => el.classList.add('hidden'));
    // Remove active class from all tabs
    document.querySelectorAll('.source-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected container
    document.getElementById(`source_${sourceId}`).classList.remove('hidden');
    // Add active class to clicked tab
    event.currentTarget.classList.add('active');
    
    // Update hidden input
    document.getElementById('source_type').value = sourceId;
    
    // Reset file selections when changing tabs
    fileBase64 = null;
    fileMimeType = null;
    extractedText = null;
    document.getElementById('doc_display').classList.add('hidden');
    document.getElementById('img_display').classList.add('hidden');
    
    const extraContainer = document.getElementById('img_instructions_container');
    if (extraContainer) extraContainer.classList.add('hidden');
    const imgInst = document.getElementById('img_instructions');
    if (imgInst) imgInst.value = '';
}

async function handleFileDisplay(inputId, displayId, extraContainerId = null) {
    const fileInput = document.getElementById(inputId);
    const displayEl = document.getElementById(displayId);
    const extraContainer = extraContainerId ? document.getElementById(extraContainerId) : null;
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        displayEl.textContent = `Archivo cargado: ${file.name}`;
        displayEl.classList.remove('hidden');
        if (extraContainer) extraContainer.classList.remove('hidden');
        
        fileMimeType = file.type;
        
        if (file.name.endsWith('.docx')) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                extractedText = result.value;
                fileBase64 = null;
            } catch (error) {
                console.error("Error extrayendo texto del DOCX:", error);
                alert("Error al leer el archivo Word.");
            }
        } else {
            // Read as Base64 for PDF or Images
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result.split(',')[1];
                fileBase64 = base64Data;
                
                // Si es PDF y no tenemos mimetype explícito
                if (file.name.endsWith('.pdf')) {
                    fileMimeType = "application/pdf";
                }
            };
            reader.readAsDataURL(file);
        }
    } else {
        displayEl.classList.add('hidden');
        if (extraContainer) extraContainer.classList.add('hidden');
        fileBase64 = null;
        fileMimeType = null;
        extractedText = null;
    }
}

function recolectarFormData() {
    return {
        ue: document.getElementById('ue')?.value || '',
        materia: document.getElementById('materia')?.value || '',
        nivel_educativo: document.getElementById('nivel_educativo')?.value || '',
        curso: document.getElementById('curso')?.value || '',
        cantidad_preguntas: document.getElementById('cantidad_preguntas')?.value || '10',
        tipo_preguntas: Array.from(document.querySelectorAll('.tipo-pregunta-cb:checked')).map(cb => cb.value).join(', '),
        source_type: document.getElementById('source_type')?.value || 'document',
        text_manual: document.getElementById('text_manual')?.value || '',
        text_topic: document.getElementById('text_topic')?.value || '',
        img_instructions: document.getElementById('img_instructions')?.value || ''
    };
}

async function fetchWithRetry(url, options, retries = 3, delay = 2500) {
    for (let i = 1; i <= retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            let errText = `Error ${response.status}: ${response.statusText}`;
            try {
                const errJson = await response.json();
                if (errJson.error) {
                    errText += ` - ${errJson.error}`;
                    if (errJson.details) errText += ` (${errJson.details})`;
                }
            } catch (e) { }
            throw new Error(errText);
        } catch (error) {
            if (i === retries) throw error;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

function log(mensaje, tipo = 'info') {
    const logEl = document.getElementById('generation-log');
    if (!logEl) return;
    
    const iconos = { 
        info: '<i data-lucide="info" class="w-4 h-4 text-blue-400"></i>', 
        ok: '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>', 
        error: '<i data-lucide="alert-triangle" class="w-4 h-4 text-red-400"></i>', 
        writing: '<i data-lucide="pen-tool" class="w-4 h-4 text-teal-400"></i>' 
    };
    
    const colors = {
        info: 'text-blue-200 bg-blue-500/10 border-blue-500/20',
        ok: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20',
        error: 'text-red-200 bg-red-500/10 border-red-500/20',
        writing: 'text-teal-200 bg-teal-500/10 border-teal-500/20'
    };

    const iconHtml = iconos[tipo] || '<i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>';
    const colorClass = colors[tipo] || 'text-slate-200 bg-white/5 border-white/10';

    logEl.innerHTML += `
        <div class="flex items-start gap-3 p-3 rounded-xl border ${colorClass} animate-fade-in">
            <div class="shrink-0 mt-0.5">${iconHtml}</div>
            <span class="leading-relaxed tracking-wide">${mensaje}</span>
        </div>`;
        
    if (window.lucide) window.lucide.createIcons();
    logEl.scrollTop = logEl.scrollHeight;
}

function actualizarProgreso(porcentaje, texto) {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const textEl = document.getElementById('progress-text');
    const percentEl = document.getElementById('progress-percent');
    
    const porcentajeEntero = Math.round(porcentaje);
    
    if (container) container.style.display = 'block';
    if (bar) bar.style.width = porcentajeEntero + '%';
    if (textEl && texto) textEl.textContent = texto;
    if (percentEl) percentEl.textContent = porcentajeEntero + '%';
}

function mostrarProveedor(proveedor, silent = false) {
    const badge = document.getElementById('api-provider-badge');
    if (badge && proveedor) {
        const textSpan = badge.querySelector('.badge-text');
        if (textSpan) {
            textSpan.textContent = `Usando ${proveedor}`;
        } else {
            badge.textContent = `Usando ${proveedor}`;
        }
        badge.style.display = 'flex';
        if (!silent) log(`Motor de IA detectado: ${proveedor}`, 'info');
    }
}

async function fetchGeminiWithRotation(prompt, inlineData, keys) {
    let exito = false;
    let contentResponse = '';
    let finalProvider = 'Desconocido';
    let errores = [];

    let geminiIndex = 1;
    for (const apiKey of keys) {
        const providerName = `GEM${geminiIndex}`;
        mostrarProveedor(providerName, true);
        log(`Generando contenido con ${providerName}`, 'writing');
        
        try {
            const parts = [{ text: prompt }];
            if (inlineData && inlineData.data) {
                parts.push({
                    inlineData: {
                        data: inlineData.data,
                        mimeType: inlineData.mimeType
                    }
                });
            }

            const responseGemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
                })
            });
            
            if (!responseGemini.ok) {
                throw new Error(`Error API Gemini: ${responseGemini.status}`);
            }
            const dataGemini = await responseGemini.json();
            contentResponse = dataGemini?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (contentResponse) {
                finalProvider = providerName;
                exito = true;
                break;
            }
        } catch (error) {
            errores.push(`${providerName}:${error.message}`);
            console.warn(`Falló ${providerName}: ${error.message}`);
        }
        geminiIndex++;
    }

    if (!exito) {
        throw new Error(`Fallaron todas las claves. Detalles: ${errores.join(' | ')}`);
    }

    return {
        content: contentResponse.replace(/```markdown/gi, '').replace(/```/g, '').trim(),
        provider: finalProvider
    };
}

async function generarEvaluacion() {
    const formData = recolectarFormData();

    if (!formData.nivel_educativo) {
        alert("Por favor seleccione el Nivel Educativo.");
        return;
    }

    if (!formData.tipo_preguntas) {
        alert("Por favor seleccione al menos un Tipo de Pregunta.");
        return;
    }

    // Validar fuente
    if (formData.source_type === 'document' && !fileBase64 && !extractedText) {
        alert("Por favor suba un documento válido (PDF o DOCX).");
        return;
    }
    if (formData.source_type === 'text' && formData.text_manual.trim() === '') {
        alert("Por favor ingrese el texto base.");
        return;
    }
    if (formData.source_type === 'image' && !fileBase64) {
        alert("Por favor suba una imagen válida.");
        return;
    }
    if (formData.source_type === 'topic' && formData.text_topic.trim() === '') {
        alert("Por favor ingrese el tema.");
        return;
    }

    evalData.formData = formData;
    evalData.generatedContent = "";

    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.style.display = 'block';
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);

    document.getElementById('generation-log').innerHTML = '';
    document.getElementById('action-buttons').style.display = 'none';
    const badge = document.getElementById('api-provider-badge');
    if (badge) badge.style.display = 'none';
    actualizarProgreso(5, 'Iniciando sistema...');

    const btnGenerar = document.getElementById('btn-generar');
    btnGenerar.disabled = true;
    btnGenerar.querySelector('span').textContent = 'GENERANDO...';

    try {
        actualizarProgreso(15, 'Obteniendo claves de API Seguras...');
        log('Solicitando acceso a motor IA...');
        
        const keyResponse = await fetchWithRetry('/.netlify/functions/get-keys', {
            method: 'GET'
        });
        const keyData = await keyResponse.json();
        const geminiKeys = keyData.geminiKeys;

        if (!geminiKeys || geminiKeys.length === 0) {
            throw new Error("No hay API Keys disponibles.");
        }

        actualizarProgreso(30, 'Analizando requerimientos y fuente...');
        log('Procesando instrucciones...');

        let prompt = `Actúa como un docente experto del nivel ${formData.nivel_educativo}. Elabora una evaluación académica para estudiantes de "${formData.curso}" en la materia de "${formData.materia}".\n`;
        prompt += `NIVEL EDUCATIVO OBJETIVO: ${formData.nivel_educativo.toUpperCase()}\n\n`;
        
        if (formData.nivel_educativo === 'Primaria') {
            prompt += `INSTRUCCIONES PEDAGÓGICAS PARA PRIMARIA:\n`;
            prompt += `- Utiliza un lenguaje muy simple, comprensible y directo.\n`;
            prompt += `- Diseña preguntas básicas, didácticas y visualmente amigables.\n`;
            prompt += `- Incluye operaciones acordes a la edad escolar con menor complejidad teórica y sin abstracción profunda.\n\n`;
        } else if (formData.nivel_educativo === 'Secundaria') {
            prompt += `INSTRUCCIONES PEDAGÓGICAS PARA SECUNDARIA:\n`;
            prompt += `- Utiliza un nivel intermedio de dificultad y un lenguaje académico moderado.\n`;
            prompt += `- Fomenta el razonamiento lógico, la comprensión lectora y la aplicación de fórmulas.\n`;
            prompt += `- Diseña ejercicios estructurados, completos y con un balance entre teoría y práctica analítica.\n\n`;
        } else if (formData.nivel_educativo === 'Superior') {
            prompt += `INSTRUCCIONES PEDAGÓGICAS PARA EDUCACIÓN SUPERIOR (UNIVERSIDAD/INSTITUTO):\n`;
            prompt += `- Utiliza un lenguaje académico profesional, riguroso y altamente técnico.\n`;
            prompt += `- Diseña preguntas avanzadas que exijan profundidad conceptual, análisis crítico y síntesis.\n`;
            prompt += `- Incluye ejercicios complejos, especializados y problemas de casos reales o de desarrollo analítico superior.\n\n`;
        }

        prompt += `La evaluación debe contener exactamente ${formData.cantidad_preguntas} preguntas.\n\n`;
        prompt += `IMPORTANTE SOBRE LOS TIPOS DE PREGUNTAS:\n`;
        prompt += `- Solo debes generar los siguientes tipos de preguntas: ${formData.tipo_preguntas}.\n`;
        prompt += `- ESTÁ ESTRICTAMENTE PROHIBIDO generar cualquier otro tipo de pregunta que no esté en la lista anterior.\n`;
        prompt += `- La cantidad total de ${formData.cantidad_preguntas} preguntas debe distribuirse equitativamente entre los tipos seleccionados.\n\n`;

        prompt += `REGLAS DE REDACCIÓN Y ESTILO (OBLIGATORIO Y ESTRICTO):\n`;
        prompt += `- ESTRICTAMENTE PROHIBIDO usar frases introductorias al inicio del documento (ej. "Aquí tienes la evaluación..."). Inicia DIRECTAMENTE con la pregunta 1.\n`;
        prompt += `- ESTÁ ABSOLUTAMENTE PROHIBIDO usar cualquier frase de referencia al material proporcionado en la redacción de las preguntas.\n`;
        prompt += `- NO DEBEN APARECER BAJO NINGÚN CONTEXTO EXPRESIONES COMO:\n`;
        prompt += `  * "Según el material..."\n`;
        prompt += `  * "Según el documento..."\n`;
        prompt += `  * "Según el documento mencionado..."\n`;
        prompt += `  * "De acuerdo al texto..."\n`;
        prompt += `  * "Basado en el contenido..."\n`;
        prompt += `  * "Tomando en cuenta el documento..."\n`;
        prompt += `  * "El documento indica..."\n`;
        prompt += `  * "El texto menciona..."\n`;
        prompt += `- Las preguntas deben formularse directamente, como en una evaluación académica real elaborada por un docente.\n`;
        prompt += `- EJEMPLOS DE REDACCIÓN INCORRECTA:\n`;
        prompt += `  * "Según el documento, ¿qué es la célula?"\n`;
        prompt += `  * "De acuerdo al material proporcionado, explique la fotosíntesis."\n`;
        prompt += `- EJEMPLOS DE REDACCIÓN CORRECTA:\n`;
        prompt += `  * "¿Qué es la célula?"\n`;
        prompt += `  * "Explique el proceso de la fotosíntesis."\n`;
        prompt += `- Las preguntas deben ser claras, directas, académicamente correctas y redactadas con un lenguaje formal de docente.\n\n`;

        prompt += `REGLAS DE FORMATO:\n`;
        prompt += `- Genera la evaluación en formato Markdown, usando ** para negritas.\n`;
        prompt += `- MUY IMPORTANTE: La PRIMERA LÍNEA de tu respuesta debe ser OBLIGATORIAMENTE el título principal, con la estructura "# EVALUACIÓN - [TEMA PRINCIPAL]".\n`;
        prompt += `- Debes DEDUCIR el tema principal evaluado basándote en el contenido proporcionado y ponerlo en mayúsculas (Ejemplos: "# EVALUACIÓN - FACTORIZACIÓN", "# EVALUACIÓN - LEYES DE NEWTON").\n`;
        prompt += `- Enumera cada pregunta con números (1., 2., 3., etc.).\n`;
        prompt += `- Si hay opciones, usa letras mayúsculas (A., B., C., D.).\n`;
        prompt += `- ESTRUCTURA OBLIGATORIA PARA PREGUNTAS DE VERDADERO Y FALSO:\n`;
        prompt += `  Primero escribe la afirmación y debajo coloca exactamente estas dos opciones usando paréntesis vacíos para marcar, en líneas separadas. Ejemplo Exacto:\n`;
        prompt += `  1. La fotosíntesis es un proceso mediante el cual las plantas producen su alimento.\n`;
        prompt += `  (  ) Verdadero\n`;
        prompt += `  (  ) Falso\n`;
        prompt += `- ESTRUCTURA OBLIGATORIA PARA PREGUNTAS DE RELACIÓN DE COLUMNAS:\n`;
        prompt += `  Debes generar obligatoriamente una tabla Markdown de 2 columnas. Ejemplo:\n`;
        prompt += `  1. Relaciona los siguientes conceptos con sus definiciones correspondientes:\n\n`;
        prompt += `  | Concepto | Definición |\n`;
        prompt += `  |---|---|\n`;
        prompt += `  | 1. Célula | A. Parte central de un átomo |\n`;
        prompt += `  | 2. Núcleo | B. Unidad estructural de los seres vivos |\n`;
        prompt += `- ESTRUCTURA OBLIGATORIA PARA PREGUNTAS DE COMPLETAR:\n`;
        prompt += `  Debes usar guiones bajos consecutivos (__________) para los espacios a rellenar. ESTÁ ESTRICTAMENTE PROHIBIDO escapar los guiones con barras invertidas (no uses \\_).\n`;
        prompt += `  Ejemplo: "1. El _________ es el signo gráfico que se coloca sobre una vocal."\n`;
        prompt += `- Para la evaluación en sí, devuelve SOLO las preguntas y las opciones, sin marcar las respuestas correctas.\n`;
        prompt += `- AL FINALIZAR TODA LA EVALUACIÓN, debes agregar obligatoriamente el título "# HOJA DE RESPUESTAS" y generar el solucionario.\n`;
        prompt += `- En la HOJA DE RESPUESTAS sigue estas reglas:\n`;
        prompt += `  * Opción Múltiple: Mostrar claramente la alternativa correcta (Ej: Respuesta correcta: B).\n`;
        prompt += `  * Verdadero/Falso: Mostrar Verdadero o Falso.\n`;
        prompt += `  * Desarrollo o Preguntas Abiertas: Mostrar una respuesta modelo o solución esperada breve.\n`;
        prompt += `  * Ejercicios de MATEMÁTICA, FÍSICA Y QUÍMICA: NO mostrar el procedimiento de desarrollo, dar directamente el resultado final bien estructurado.\n`;
        prompt += `- Separa cada pregunta adecuadamente.\n`;
        prompt += `- MUY IMPORTANTE: Para TODAS las expresiones matemáticas, fracciones, potencias, raíces, ecuaciones, fórmulas químicas, límites, integrales y símbolos científicos, DEBES usar formato LaTeX encerrado entre signos de dólar dobles $$ para ecuaciones en bloque o $ para ecuaciones en línea.\n`;
        prompt += `- Ejemplo en línea: El área de un círculo es $A = \\pi r^2$.\n`;
        prompt += `- Ejemplo en bloque: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n`;
        prompt += `- Bajo ningún motivo uses texto plano (como 1/2 o x^2) para operaciones matemáticas.\n\n`;

        let inlineData = null;

        prompt += `\nRESTRICCIÓN ABSOLUTA DE CONTENIDO (MUY IMPORTANTE):\n`;
        prompt += `- Las preguntas generadas DEBEN estar estricta y exclusivamente basadas en el contenido, documento, tema o imagen proporcionada a continuación.\n`;
        prompt += `- ESTÁ TOTALMENTE PROHIBIDO inventar, asumir o incluir información externa, conceptos ajenos o temas que no se mencionen o relacionen directamente con la fuente original.\n`;
        prompt += `- La evaluación debe ser 100% fiel al material de origen.\n\n`;

        if (formData.source_type === 'document') {
            if (extractedText) {
                prompt += `FUENTE DE INFORMACIÓN (DOCUMENTO):\nBasa todas las preguntas ESTRICTAMENTE en el siguiente texto:\n\n${extractedText}\n`;
            } else if (fileBase64 && fileMimeType === 'application/pdf') {
                prompt += `FUENTE DE INFORMACIÓN (PDF ADJUNTO):\nBasa todas las preguntas ESTRICTAMENTE en el documento PDF proporcionado.\n`;
                inlineData = { data: fileBase64, mimeType: fileMimeType };
            }
        } else if (formData.source_type === 'text') {
            prompt += `FUENTE DE INFORMACIÓN (TEXTO MANUAL):\nBasa todas las preguntas ESTRICTAMENTE en la siguiente teoría:\n\n${formData.text_manual}\n`;
        } else if (formData.source_type === 'image') {
            prompt += `FUENTE DE INFORMACIÓN (IMAGEN ADJUNTA):\nAnaliza la imagen proporcionada. Genera ejercicios o preguntas ESTRICTAMENTE similares al contenido visualizado, usando los mismos conceptos, fórmulas o temas sin desviarte a otros subtemas.\n`;
            if (formData.img_instructions) {
                prompt += `INSTRUCCIONES ADICIONALES DEL DOCENTE SOBRE LA IMAGEN:\n"${formData.img_instructions}"\nDebes cumplir obligatoriamente con estas instrucciones adicionales.\n`;
            }
            inlineData = { data: fileBase64, mimeType: fileMimeType };
        } else if (formData.source_type === 'topic') {
            prompt += `FUENTE DE INFORMACIÓN (TEMA ESPECÍFICO):\nBasa todas las preguntas EXCLUSIVAMENTE en el siguiente tema general: "${formData.text_topic}". No incluyas preguntas de otros temas de la misma materia.\n`;
        }

        actualizarProgreso(45, 'Generando evaluación con Inteligencia Artificial...');
        log('Generando contenido y estructurando preguntas...', 'writing');

        const geminiResult = await fetchGeminiWithRotation(prompt, inlineData, geminiKeys);
        evalData.generatedContent = geminiResult.content;

        log('Generación de preguntas exitosa', 'ok');
        actualizarProgreso(85, 'Estructuración del documento Word...');

        log('¡Evaluación completa generada con éxito!', 'ok');
        actualizarProgreso(100, '¡Documento listo para descargar!');
        
        document.getElementById('action-buttons').style.display = 'flex';
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);

    } catch (error) {
        console.error('Error en generación:', error);
        log(`Error: ${error.message}. Por favor intenta de nuevo.`, 'error');
        actualizarProgreso(0, 'Error en la generación.');
    } finally {
        btnGenerar.disabled = false;
        btnGenerar.querySelector('span').textContent = 'GENERAR EVALUACIÓN CON IA';
    }
}

async function descargarWord() {
    const btnWord = document.getElementById('btn-word');
    const textoOriginal = btnWord.innerHTML;
    btnWord.disabled = true;

    try {
        log('Construyendo archivo DOCX...', 'writing');
        const response = await fetchWithRetry('/.netlify/functions/generate-eval-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evalData)
        });

        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Evaluacion-${(evalData.formData.materia || 'Materia').replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        log('Archivo DOCX descargado exitosamente.', 'ok');

    } catch (error) {
        console.error('Error al generar Word:', error);
        alert('Hubo un error al crear el documento Word. Inténtalo de nuevo.');
        log('Error al generar el archivo DOCX', 'error');
    } finally {
        btnWord.disabled = false;
        btnWord.innerHTML = textoOriginal;
    }
}

function nuevaEvaluacion() {
    if (!confirm('¿Seguro que deseas iniciar una nueva evaluación?')) return;
    evalData = { formData: {}, generatedContent: "" };
    document.getElementById('results-panel').style.display = 'none';
    document.getElementById('generation-log').innerHTML = '';
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'none';
    const badge = document.getElementById('api-provider-badge');
    if (badge) badge.style.display = 'none';

    document.getElementById('evalForm').reset();
    selectSource('document'); // Reset tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// PROTECCIONES BÁSICAS
document.addEventListener('contextmenu', e => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
});
document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['U', 'S', 'P'].includes(e.key.toUpperCase()))) {
        e.preventDefault();
    }
});
document.addEventListener('selectstart', e => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
});
document.addEventListener('dragstart', e => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
});
