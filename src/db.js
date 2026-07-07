const mysql = require('mysql2/promise');
require('dotenv').config();

// ==============================================================================
// NEXOS DELIVERY API - MÓDULO DE CONEXIÓN A MYSQL (TiDB CLOUD)
// ==============================================================================
// Utiliza DATABASE_URL (connection string) para conectarse a MySQL.
// ==============================================================================

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: La variable de entorno DATABASE_URL no está definida.');
  console.error('   Configúrala en tu archivo .env o en el panel de Render.');
  process.exit(1);
}

// En mysql2, pasar la URL completa al createPool configura automáticamente el host,
// puerto, usuario, contraseña, base de datos y los parámetros SSL si van en la URL.
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 20,         // Máximo de conexiones simultáneas en el pool (equivalente a max)
  queueLimit: 0,
  idleTimeout: 30000,          // Cerrar cliente inactivo después de 30s
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Ejecuta una consulta SQL parametrizada contra la base de datos.
 * @param {string} text - La sentencia SQL con placeholders (?)
 * @param {Array}  params - Los valores para los placeholders
 * @returns {Promise<Array>} Resultado de la consulta [rows, fields]
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    // mysql2 devuelve un array donde el primer elemento son las filas (rows)
    const [rows] = await pool.execute(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Query ejecutada (${duration}ms):`, text.substring(0, 80).replace(/\s+/g, ' '));
    return rows;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query fallida (${duration}ms):`, text.substring(0, 80).replace(/\s+/g, ' '));
    console.error('   Detalle:', error.message);
    throw error;
  }
};

/**
 * Verifica la conectividad con MySQL al iniciar el servidor.
 */
const testConnection = async () => {
  try {
    const rows = await query('SELECT NOW() AS hora_actual');
    console.log('🟢 Conexión exitosa a MySQL:', rows[0].hora_actual);
  } catch (error) {
    console.error('🔴 No se pudo conectar a MySQL:', error.message);
  }
};

module.exports = {
  query,
  pool,
  testConnection,
};
