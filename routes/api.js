// routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// 1. Importaciones de los controladores
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const categoryController = require('../controllers/categoryController'); // NUEVO: Controlador de categorías

// 2. Importación de los Middlewares
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// ==========================================
// CONFIGURACIÓN DE MULTER PARA SUBIDA DE IMÁGENES
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Las fotos se almacenarán en 'uploads/'
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Nombre único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para garantizar que solo se suban formatos de imagen válidos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato inválido. Solo se permiten imágenes.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de tamaño: 5MB
});


// === RUTAS PÚBLICAS ===
router.post('/auth/register', authController.registerClient);
router.post('/auth/login', authController.login);
router.get('/shop/products', productController.getShopProducts);
router.get('/categories', categoryController.getCategories); // NUEVO: Obtener categorías públicamente (para listados/filtros en la tienda)


// === RUTAS CLIENTES ===
router.post('/shop/checkout', verifyToken, authorizeRoles('Cliente', 'Administrador'), orderController.checkout);
router.post('/orders', verifyToken, authorizeRoles('Cliente', 'Administrador'), orderController.checkout);


// === RUTAS COLABORADORES Y ADMINS ===
// Productos
router.post(
  '/products', 
  verifyToken, 
  authorizeRoles('Colaborador', 'Administrador'), 
  upload.single('image'), 
  productController.createProduct
);
router.patch('/products/:id/discount', verifyToken, authorizeRoles('Colaborador', 'Administrador'), productController.applyDiscount);

// NUEVO: CRUD completo de Categorías usando su controlador específico
router.post('/categories', verifyToken, authorizeRoles('Colaborador', 'Administrador'), categoryController.createCategory);
router.put('/categories/:id', verifyToken, authorizeRoles('Colaborador', 'Administrador'), categoryController.updateCategory);
router.delete('/categories/:id', verifyToken, authorizeRoles('Colaborador', 'Administrador'), categoryController.deleteCategory);


// === RUTAS EXCLUSIVAS ADMIN ===
router.get('/admin/users', verifyToken, authorizeRoles('Administrador'), adminController.getUsers);
router.post('/admin/users', verifyToken, authorizeRoles('Administrador'), adminController.createUser);
router.delete('/admin/users/:id', verifyToken, authorizeRoles('Administrador'), adminController.deleteUserLogically);
router.get('/admin/dashboard', verifyToken, authorizeRoles('Administrador'), adminController.getSalesDashboard);
router.post('/admin/company', verifyToken, authorizeRoles('Administrador'), adminController.updateCompanyProfile);

router.get('/admin/orders', verifyToken, authorizeRoles('Administrador'), adminController.getOrders);
router.get('/admin/company', verifyToken, authorizeRoles('Administrador'), adminController.getCompanyProfile);


module.exports = router;