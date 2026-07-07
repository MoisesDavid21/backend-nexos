const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { query, testConnection } = require('./db');

// ==============================================================================
// NEXOS DELIVERY API - SERVIDOR API REST
// ==============================================================================
// Este servidor actúa como puente seguro entre la app móvil React Native
// y la base de datos MySQL. La app nunca conoce las credenciales de la DB.
// ==============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ========================== MIDDLEWARES GLOBALES ==============================

app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, _res, next) => {
  console.log(`📡 ${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// ========================== RUTAS DE LA API ===================================

// ---- Healthcheck ----
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Nexos Delivery API',
    timestamp: new Date().toISOString(),
  });
});

// ---- GET /api/productos ----
app.get('/api/productos', async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        p.id,
        p.titulo,
        p.descripcion,
        p.precio,
        p.imagen_url,
        p.categoria,
        p.oferta_porcentaje,
        p.stock,
        p.activo,
        p.fecha_creacion,
        t.nombre AS tienda_nombre
      FROM productos p
      LEFT JOIN tiendas t ON p.tienda_id = t.id
      WHERE p.activo = true
      ORDER BY p.fecha_creacion DESC
    `);

    res.json({
      ok: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ---- GET /api/tiendas ----
app.get('/api/tiendas', async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        t.id,
        t.nombre,
        t.categoria,
        t.descripcion,
        t.logo_url,
        t.banner_url,
        t.rating,
        t.tiempo_entrega,
        t.costo_envio,
        t.abierta,
        t.direccion,
        t.horario,
        t.fecha_creacion,
        u.nombre AS propietario_nombre
      FROM tiendas t
      LEFT JOIN usuarios u ON t.propietario_id = u.id
      ORDER BY t.rating DESC
    `);

    res.json({
      ok: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ---- PATCH /api/usuarios/:id ----
app.patch('/api/usuarios/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const rolesPermitidos = ['admin', 'tienda', 'delivery', 'user'];
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(400).json({
        ok: false,
        error: `El rol debe ser uno de: ${rolesPermitidos.join(', ')}`,
      });
    }

    // Nota: Como tus IDs en la base de datos de TiDB se manejan como VARCHAR(36) (UUIDs),
    // mantenemos la validación de formato correspondiente.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        ok: false,
        error: 'El ID proporcionado no es un UUID válido.',
      });
    }

    // En MySQL usamos '?' como placeholder. Cambiamos UPDATE porque no soporta RETURNING.
    const updateResult = await query(
      'UPDATE usuarios SET rol = ? WHERE id = ?',
      [rol, id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: 'No se encontró un usuario con ese ID.',
      });
    }

    // Buscamos el registro actualizado para responder con los datos requeridos
    const updatedUser = await query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({
      ok: true,
      mensaje: 'Rol actualizado correctamente.',
      data: updatedUser[0],
    });
  } catch (error) {
    next(error);
  }
});

// ========================== MANEJO DE ERRORES GLOBAL =========================

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Ruta no encontrada. Verifica la URL e intenta de nuevo.',
  });
});

app.use((err, _req, res, _next) => {
  console.error('🔴 Error en el servidor:', err.message);
  console.error(err.stack);

  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor. Intenta más tarde.',
    detalle: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

// ========================== INICIAR SERVIDOR =================================

app.listen(PORT, async () => {
  console.log('===========================================================');
  console.log(`🚀 Nexos Delivery API corriendo en puerto ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('===========================================================');

  await testConnection();
});
