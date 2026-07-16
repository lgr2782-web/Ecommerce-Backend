const db = require('../config/db');

// Crear producto con soporte de Multer para imágenes
exports.createProduct = async (req, res) => {
  // 1. Evitar caída si no llegan datos (Multer procesa multipart y lo deja en req.body)
console.log("=== ENTRANDO A CREATE PRODUCT ===");
  console.log("¿Llegó archivo? (req.file):", req.file);
  console.log("Datos del formulario (req.body):", req.body);
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      error: "Petición inválida. El cuerpo de la solicitud no puede estar vacío." 
    });
  }

  const { 
    category_id, 
    name, 
    description, 
    sku, 
    cabys_code, 
    price, 
    stock, 
    is_published 
  } = req.body;

  // 2. Validación de campos obligatorios
  if (!category_id || !name || price === undefined) {
    return res.status(400).json({ 
      error: "Faltan campos obligatorios. Debes proporcionar: category_id, name y price." 
    });
  }

  try {
    // 3. Obtener la ruta de la imagen procesada por Multer (req.file)
    let imageUrl = null;
    if (req.file) {
      // Genera la URL pública: http://localhost:5000/uploads/nombre_del_archivo.jpg
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // 4. Fallbacks y transformaciones de tipo necesarias para FormData
    const finalStock = stock !== undefined ? parseInt(stock, 10) : 0;
    // FormData envía los booleanos como strings ("true" o "false")
    const finalIsPublished = is_published === 'true' || is_published === true; 

    // 5. Consulta SQL incluyendo la columna image_url (parámetro $9)
    const result = await db.query(
      `INSERT INTO products (category_id, name, description, sku, cabys_code, price, stock, is_published, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        parseInt(category_id, 10), 
        name, 
        description || null, 
        sku || null, 
        cabys_code || null, 
        parseFloat(price), 
        finalStock, 
        finalIsPublished,
        imageUrl // Se guarda la URL en la base de datos
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error en createProduct:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Aplicar oferta/descuento
exports.applyDiscount = async (req, res) => {
  const { id } = req.params;
  const { discount_price } = req.body;

  if (discount_price === undefined) {
    return res.status(400).json({ error: "Debe proporcionar un valor para discount_price." });
  }

  try {
    const result = await db.query(
      'UPDATE products SET discount_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [discount_price, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.json({ message: 'Oferta aplicada con éxito.', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear categoría
exports.createCategory = async (req, res) => {
  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: "El nombre de la categoría es obligatorio." });
  }

  const { name, description } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *', 
      [name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar productos de la tienda con filtros dinámicos
exports.getShopProducts = async (req, res) => {
  const { search, categoryId } = req.query;
  try {
    let queryText = 'SELECT * FROM products WHERE is_published = true';
    let params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      queryText += ` AND category_id = $${paramIndex}`;
      params.push(categoryId);
    }

    const products = await db.query(queryText, params);
    res.json(products.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};