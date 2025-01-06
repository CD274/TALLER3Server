const express = require('express');
const fs = require('fs');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Archivo para almacenar informacion
const dbFile = 'race_data.json';

// Inicializar datos si no existe el archivo
if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ carreras: [] }, null, 2));
}

// Leer datos de la informacion
const readDB = () => {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
};

// Escribir datos en la dbFile
const writeDB = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};

// Ruta para establecer la cantidad de competidores y la distancia total
app.post('/iniciar-carrera', (req, res) => {
    const { cantidadCompetidores, distancia } = req.body;

    if (!cantidadCompetidores || !distancia) {
        return res.status(400).json({ error: 'Faltan datos: cantidadCompetidores y distancia son obligatorios.' });
    }

    const nuevaCarrera = {
        id: Math.floor(Math.random() * 90000) + 10000,
        distanciaTotal: distancia,
        competidores: Array.from({ length: cantidadCompetidores }, (_, i) => ({
            id: i + 1,
            velocidad: Math.random() * (15 - 5) + 5, // Velocidad aleatoria entre 5 y 15 km/h
            distanciaRecorrida: 0
        })),
        historial: [],
        finalizada: false,
        ganador: null
    };

    const db = readDB();
    db.carreras.push(nuevaCarrera);
    writeDB(db);

    res.json({ mensaje: 'Carrera creada con éxito', carreraId: nuevaCarrera.id });
});

// Ruta para actualizar una carrera existente
app.put('/actualizar-carrera/:id', (req, res) => {
    const { id } = req.params;
    const { cantidadCompetidores, distancia } = req.body;
    const db = readDB();
    const carrera = db.carreras.find(c => c.id === parseInt(id));

    if (!carrera) {
        return res.status(404).json({ error: 'Carrera no encontrada.' });
    }

    if (cantidadCompetidores) {
        carrera.competidores = Array.from({ length: cantidadCompetidores }, (_, i) => ({
            id: i + 1,
            velocidad: Math.random() * (15 - 5) + 5,
            distanciaRecorrida: 0
        }));
    }

    if (distancia) {
        carrera.distanciaTotal = distancia;
    }

    carrera.historial = [];
    carrera.finalizada = false;
    carrera.ganador = null;

    writeDB(db);
    res.json({ mensaje: 'Carrera actualizada con éxito.', carrera });
});

//FALTA
app.get('/simular-carrera/:id', async (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const carrera = db.carreras.find(c => c.id === parseInt(id));

    if (!carrera) {
        return res.status(404).json({ error: 'Carrera no encontrada.' });
    }

    if (carrera.finalizada) {
        return res.json({ mensaje: 'La carrera ya ha finalizado.', historial: carrera.historial, ganador: carrera.ganador });
    }

    let tiempo = 0;
    let ganador = null;

    while (!ganador) {
        tiempo += 1;

        carrera.competidores.forEach(competidor => {
            if (!ganador) {
                competidor.distanciaRecorrida += competidor.velocidad;
                if (competidor.distanciaRecorrida >= carrera.distanciaTotal) {
                    competidor.distanciaRecorrida = carrera.distanciaTotal; // Asegurar que no exceda la distancia total
                    ganador = competidor;
                    carrera.ganador = {
                        id: ganador.id,
                        distanciaRecorrida: ganador.distanciaRecorrida.toFixed(2),
                        tiempoTotal: tiempo
                    };
                    carrera.finalizada = true;
                }
            }
        });

        const estadoActual = carrera.competidores.reduce((acc, competidor) => {
            acc[`Corredor ${competidor.id}`] = parseFloat(competidor.distanciaRecorrida.toFixed(2));
            return acc;
        }, {});

        carrera.historial.push({ hora: tiempo, estado: estadoActual });

        if (ganador) {
            writeDB(db);
            return res.json({ mensaje: `El ganador es el competidor ${ganador.id}`, historial: carrera.historial, ganador: carrera.ganador });
        }

        writeDB(db);
    }
});

// Ruta para obtener todas las carreras
app.get('/carreras', (req, res) => {
    const db = readDB();
    res.json(db.carreras);
});

// Ruta para obtener detalles de una carrera
app.get('/carreras/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const carrera = db.carreras.find(c => c.id === parseInt(id));

    if (!carrera) {
        return res.status(404).json({ error: 'Carrera no encontrada.' });
    }

    res.json(carrera);
});

// Ruta para eliminar una carrera
app.delete('/carreras/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.carreras.findIndex(c => c.id === parseInt(id));

    if (index === -1) {
        return res.status(404).json({ error: 'Carrera no encontrada.' });
    }

    db.carreras.splice(index, 1);
    writeDB(db);

    res.json({ mensaje: 'Carrera eliminada con éxito.' });
});

// Iniciar servidor
app.listen(3000, () => {
    console.log('La solicitud fue realizada por el puerto 3000'); 
});
