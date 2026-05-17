require('dotenv').config();

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const geminiKeys = [
            process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4,
            process.env.GEMINI_API_KEY_5, process.env.GEMINI_API_KEY_6
        ].filter(Boolean);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ geminiKeys })
        };
    } catch (error) {
        console.error('Error al obtener llaves:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Error interno', details: error.message })
        };
    }
};
