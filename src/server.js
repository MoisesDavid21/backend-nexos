const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { query, testConnection } = require('./db');

// ==============================================================================
// PRISMA DELIVERY APP - SERVIDOR API REST
// ==============================================================================
// Este servidor actúa como puente seguro entre la app móvil React Native
// y la base de datos PostgreSQL. La app nunca conoce las credenciales de la DB.
// ==============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ========================== MIDDLEWARES GLOBALES ==============================

// Permitir JSON en el body de las peticiones (para PATCH, POST, etc.)
app.use(express.json());

// CORS abierto: permite que la app móvil y cualquier cliente acceda a la API.
// En producción, puedes restringirlo si lo necesitas.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging simple de cada petición entrante
app.use((req, _res, next) => {
  console.log(`📡 ${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// ========================== RUTAS DE LA API ===================================

// ---- Healthcheck (útil para que Render verifique que el servicio está vivo) ---
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Prisma Delivery API',
    timestamp: new Date().toISOString(),
  });
});

// ---- GET /api/productos ----
// Devuelve todos los productos activos con información de su tienda.
app.get('/api/productos', async (_req, res, next) => {
  try {
    const result = await query(`
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
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ---- GET /api/tiendas ----
// Devuelve todas las tiendas registradas con el nombre de su propietario.
app.get('/api/tiendas', async (_req, res, next) => {
  try {
    const result = await query(`
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
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ---- PATCH /api/usuarios/:id ----
// Actualiza el rol de un usuario. Usa consulta parametrizada ($1, $2) para
// prevenir inyección SQL.
app.patch('/api/usuarios/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    // Validar que el rol enviado sea uno de los permitidos por el ENUM
    const rolesPermitidos = ['admin', 'tienda', 'delivery', 'user'];
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(400).json({
        ok: false,
        error: `El rol debe ser uno de: ${rolesPermitidos.join(', ')}`,
      });
    }

    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        ok: false,
        error: 'El ID proporcionado no es un UUID válido.',
      });
    }

    // Consulta parametrizada — el $1 y $2 son reemplazados de forma segura por pg
    const result = await query(
      'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id, nombre, email, rol',
      [rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'No se encontró un usuario con ese ID.',
      });
    }

    res.json({
      ok: true,
      mensaje: 'Rol actualizado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// ========================== MANEJO DE ERRORES GLOBAL =========================

// Ruta no encontrada (404)
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Ruta no encontrada. Verifica la URL e intenta de nuevo.',
  });
});

// Middleware de errores global — captura cualquier error que se lance en las rutas
// para que el servidor NUNCA se bloquee.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('🔴 Error en el servidor:', err.message);
  console.error(err.stack);

  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor. Intenta más tarde.',
    // En desarrollo puedes ver el detalle; en producción se oculta:
    detalle: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

// ========================== INICIAR SERVIDOR =================================

app.listen(PORT, async () => {
  console.log('===========================================================');
  console.log(`🚀 Prisma Delivery API corriendo en puerto ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('===========================================================');

  // Verificar conexión a la DB al arrancar
  await testConnection();
});
