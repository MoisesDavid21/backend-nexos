const { Pool } = require('pg');
require('dotenv').config();

// ==============================================================================
// PRISMA DELIVERY APP - MÓDULO DE CONEXIÓN A POSTGRESQL
// ==============================================================================
// Utiliza DATABASE_URL (connection string) para conectarse a PostgreSQL.
// Configurado con SSL para entornos cloud como Render.
// ==============================================================================

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: La variable de entorno DATABASE_URL no está definida.');
  console.error('   Configúrala en tu archivo .env o en el panel de Render.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Obligatorio para conexiones a PostgreSQL en servicios cloud (Render, Supabase, etc.)
  ssl: {
    rejectUnauthorized: false,
  },

  // Configuraciones del Pool de conexiones
  max: 20,                      // Máximo de clientes simultáneos en el pool
  idleTimeoutMillis: 30000,     // Cerrar cliente inactivo después de 30s
  connectionTimeoutMillis: 5000, // Timeout de espera para nueva conexión (5s)
});

// Listener global para errores inesperados del pool
pool.on('error', (err) => {
  console.error('⚠️  Error inesperado en el pool de conexiones:', err.message);
  // No llamamos process.exit() aquí para que el servidor se mantenga corriendo
  // y pueda recuperarse en la próxima consulta.
});

/**
 * Ejecuta una consulta SQL parametrizada contra la base de datos.
 * @param {string} text - La sentencia SQL con placeholders ($1, $2, ...)
 * @param {Array}  params - Los valores para los placeholders
 * @returns {Promise<import('pg').QueryResult>} Resultado de la consulta
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Query ejecutada (${duration}ms):`, text.substring(0, 80));
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query fallida (${duration}ms):`, text.substring(0, 80));
    console.error('   Detalle:', error.message);
    throw error;
  }
};

/**
 * Verifica la conectividad con PostgreSQL al iniciar el servidor.
 */
const testConnection = async () => {
  try {
    const res = await query('SELECT NOW() AS hora_actual');
    console.log('🟢 Conexión exitosa a PostgreSQL:', res.rows[0].hora_actual);
  } catch (error) {
    console.error('🔴 No se pudo conectar a PostgreSQL:', error.message);
  }
};

module.exports = {
  query,
  pool,
  testConnection,
};
