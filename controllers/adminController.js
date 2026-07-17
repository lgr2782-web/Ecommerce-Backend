const db = require('../config/db');
const bcrypt = require('bcrypt');

// 1. Crear Admin o Colaborador
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, role]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. NUEVO: Listar todos los usuarios para el Admin (Corregido sin 'router' y usando 'db')
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// 3. Borrado lógico de usuarios (Inactivación)
exports.deleteUserLogically = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ message: 'Usuario eliminado lógicamente con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Panel Dashboard: Estadísticas de ventas
exports.getSalesDashboard = async (req, res) => {
  try {
    const totalSales = await db.query("SELECT SUM(total_amount) FROM orders WHERE status = 'Pagado'");
    const ordersCount = await db.query('SELECT COUNT(id) FROM orders');
    const lowStock = await db.query('SELECT id, name, stock FROM products WHERE stock < 5 AND is_published = true');

    res.json({
      revenue: totalSales.rows[0].sum || 0,
      totalOrders: ordersCount.rows[0].count,
      criticalStock: lowStock.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Configuración general de la PYME
exports.updateCompanyProfile = async (req, res) => {
  const { name, cedula_juridica, email, phone, address } = req.body;
  try {
    const profile = await db.query(
      `INSERT INTO company_profile (id, name, cedula_juridica, email, phone, address) 
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE 
       SET name = $1, cedula_juridica = $2, email = $3, phone = $4, address = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, cedula_juridica, email, phone, address]
    );
    res.json(profile.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 1. Obtener listado de órdenes (SINPE) para verificar
exports.getOrders = async (req, res) => {
  try {
    // Consulta a tu tabla de órdenes. Traemos el id, el nombre del cliente (asumiendo relación o campo),
    // el monto total, la referencia de pago sinpe y el estado del pedido.
    const result = await db.query(
      `SELECT o.id, u.name as customer, o.total_amount as total, o.sinpe_reference as reference, o.status 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error interno al cargar órdenes.' });
  }
};

// 2. Obtener el perfil de la empresa (Fila única con ID = 1)
exports.getCompanyProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT name, cedula_juridica, email, phone, address FROM company_profile WHERE id = 1');
    if (result.rows.length === 0) {
      // Si la tabla está vacía, devolvemos un objeto vacío para evitar errores en React
      return res.json({ name: '', cedula_juridica: '', email: '', phone: '', address: '' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil de la empresa:', error);
    res.status(500).json({ error: 'Error interno al cargar perfil de empresa.' });
  }
};