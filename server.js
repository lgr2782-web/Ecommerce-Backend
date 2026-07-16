const express = require('express');
const cors = require('cors');
require('dotenv').config();
const apiRoutes = require('./routes/api');
const path = require('path');

const app = express();

// 1. Middlewares Globales de Comunicación y parseo JSON
app.use(cors());
app.use(express.json());

// 2. HACER PÚBLICA LA CARPETA UPLOADS (Debe ir antes de las rutas y del 404)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Inyección de rutas globales
app.use('/api/v1', apiRoutes);

// 4. Manejo básico de errores de ruta (SIEMPRE AL FINAL DE TODO)
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint no encontrado.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor de Comercio Electrónico corriendo en el puerto ${PORT}`);
});