// backend/controllers/categoryController.js
// Importa el pool ya configurado de tu proyecto
const pool = require('../config/db');


// 1. OBTENER TODAS LAS CATEGORÍAS (GET)
const getCategories = async (req, res) => {
  try {
    // Traemos solo las categorías que estén activas, ordenadas alfabéticamente
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error detallado al obtener categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener categorías.' });
  }
};

// 2. CREAR UNA CATEGORÍA (POST)
const createCategory = async (req, res) => {
  const { name, descripcion } = req.body; // <-- Corregido a 'descripcion'
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, true) RETURNING *',
      [name, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error detallado al crear categoría:', error);
    res.status(500).json({ error: 'Error al registrar la categoría.' });
  }
};

// 3. ACTUALIZAR UNA CATEGORÍA (PUT)
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, descripcion, is_active } = req.body; // <-- Corregido a 'descripcion'
  
  // Si en la petición no envían 'is_active', por defecto lo dejamos en true o lo que venga
  const activeStatus = is_active !== undefined ? is_active : true;

  try {
    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2, is_active = $3 WHERE id = $4 RETURNING *',
      [name, descripcion, activeStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error detallado al actualizar categoría:', error);
    console.error("Error real en la BD:", error);
    res.status(500).json({ error: 'Error al modificar la categoría.' });
  }
};

// 4. ELIMINAR UNA CATEGORÍA (DELETE - Borrado lógico)
// Como tienes la columna 'is_active', es mucho mejor hacer un borrado lógico (desactivarla) 
// en lugar de un borrado físico, para no romper la integridad referencial con tus productos.
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE categories SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }

    res.json({ message: 'Categoría desactivada con éxito.', category: result.rows[0] });
  } catch (error) {
    console.error('Error detallado al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar la categoría.' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};