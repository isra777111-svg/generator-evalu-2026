const { handler } = require('./netlify/functions/generate-eval-word.js');

async function runMock() {
    const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
            formData: {
                materia: 'Matematicas'
            },
            generatedContent: 'Resuelve la ecuación: $$x^2 = 4$$ y dime el resultado.'
        })
    };
    
    try {
        const result = await handler(event);
        console.log("Status Code:", result.statusCode);
        if (result.statusCode === 500) {
            console.error("Error details:", result.body);
        } else {
            console.log("Success! Buffer length:", result.body.length);
        }
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}
runMock();
