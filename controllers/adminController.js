const db = require('../config/db');
const bcrypt = require('bcrypt');

// 1. Crear Admin o Colaborador (Exportación explícita)
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

// 2. Borrado lógico de usuarios (Inactivación)
exports.deleteUserLogically = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ message: 'Usuario eliminado lógicamente con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Panel Dashboard: Estadísticas de ventas
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

// 4. Configuración general de la PYME
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