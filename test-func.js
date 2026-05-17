const func = require('./netlify/functions/generate-pdc-tabla.js');

const event = {
    httpMethod: 'POST',
    body: JSON.stringify({
        formData: {
            areasDelMes: ['Matemática'],
            datosSemanales: [
                {
                    semana: 1,
                    filas: [
                        { area: 'Mat', contenido: 'Números enteros' }
                    ]
                }
            ]
        }
    })
};

func.handler(event).then(res => {
    console.log("STATUS:", res.statusCode);
    console.log("BODY:", res.body);
}).catch(err => {
    console.error("ERROR:", err);
});
