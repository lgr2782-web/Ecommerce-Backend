// controllers/orderController.js
const db = require('../config/db');

exports.checkout = async (req, res) => {
  const { 
    items, 
    transaction_reference 
  } = req.body; 

  const userId = req.user.id; 

  // --- VALIDACIÓN 3 (Parte A): Verificar estructura básica del carrito ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío o el formato es incorrecto.' });
  }

  // --- VALIDACIÓN 1: Tamaño de la referencia de SINPE ---
  if (!transaction_reference) {
    return res.status(400).json({ message: 'El número de referencia de SINPE Móvil es obligatorio.' });
  }
  
  const refClean = transaction_reference.trim();
  if (refClean.length < 6 || refClean.length > 20) {
    return res.status(400).json({ 
      message: 'El número de referencia no es válido. Debe tener entre 6 y 20 caracteres.' 
    });
  }

  try {
    // --- VALIDACIÓN 2: Que la referencia no esté repetida ---
    const checkRef = await db.query(
      'SELECT id FROM orders WHERE transaction_id = $1', 
      [refClean]
    );
    
    if (checkRef.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Este número de referencia ya fue registrado anteriormente. Si tiene un problema, contacte a soporte.' 
      });
    }

    // Iniciar Transacción SQL
    await db.query('BEGIN');

    let totalAmount = 0;
    const itemsWithPrices = [];

    for (let item of items) {
      const productId = item.product_id || item.id;
      
      // --- VALIDACIÓN 3 (Parte B): Validar que la cantidad solicitada sea exacta y válida ---
      // Evita números negativos, flotantes (como 1.5 productos) o valores vacíos
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0 || quantity !== item.quantity) {
        throw new Error(`La cantidad para el producto debe ser un número entero exacto y mayor a cero.`);
      }

      // Consultar stock actual bloqueando la fila
      const prodRes = await db.query(
        'SELECT price, discount_price, stock, name FROM products WHERE id = $1 FOR UPDATE', 
        [productId]
      );
      
      if (prodRes.rows.length === 0) {
        throw new Error(`Producto no encontrado.`);
      }

      const product = prodRes.rows[0];
      
      // --- VALIDACIÓN 3 (Parte C): Validar disponibilidad exacta en Stock ---
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente para el producto: ${product.name}. Disponible: ${product.stock}`);
      }

      // Validar precio activo
      const activePrice = parseFloat(product.discount_price) > 0 ? product.discount_price : product.price;
      const subtotal = activePrice * quantity;
      totalAmount += subtotal;

      itemsWithPrices.push({
        product_id: productId,
        quantity: quantity,
        unit_price: activePrice,
        name: product.name
      });

      // Descontar inventario de forma exacta
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, productId]);
    }

    const gateway = 'SINPE Movil';
    const status = 'Pendiente'; 

    // 1. Crear Orden Maestro (Guardamos la referencia limpia en transaction_id)
    const orderRes = await db.query(
      `INSERT INTO orders (user_id, total_amount, status, payment_gateway, transaction_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, totalAmount, status, gateway, refClean]
    );
    const orderId = orderRes.rows[0].id;

    // 2. Insertar Detalles de la orden
    for (let item of itemsWithPrices) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '¡Pedido registrado! Su pago está en revisión. El comercio verificará la transferencia y procederá con su envío.',
      orderId,
      total: totalAmount,
      currency: 'CRC',
      items: itemsWithPrices
    });

  } catch (error) {
    // Si cualquiera de las validaciones de stock o cantidades falla dentro del bucle,
    // el ROLLBACK asegura que no se guarde nada ni se altere el inventario de otros productos.
    await db.query('ROLLBACK');
    console.error('Error en proceso de checkout validado:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// Al final de tu orderController.js añade:

exports.approveOrder = async (req, res) => {
  const orderId = req.params.id;
  // 1. Usamos 'Pagado' para que sea compatible con restricciones de base de datos
  const nuevoEstado = 'Pagado'; 

  try {
    // Verificar que db esté definido
    if (!db || typeof db.query !== 'function') {
      throw new Error("El módulo de la base de datos (db) no está configurado correctamente en el controlador.");
    }

    // 2. Actualizamos el estado en la base de datos
    const resultado = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [nuevoEstado, orderId]
    );

    // 3. Si la orden no existía
    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: 'La orden especificada no existe.' });
    }

    // 4. Respondemos con éxito total
    res.status(200).json({
      success: true,
      message: 'Orden aprobada y estado actualizado correctamente.',
      order: resultado.rows[0]
    });

  } catch (error) {
    // Esto imprimirá el error exacto en la consola de Render para que lo puedas ver
    console.error('CRÍTICO - Error en approveOrder:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor al procesar la aprobación.',
      details: error.message 
    });
  }
};