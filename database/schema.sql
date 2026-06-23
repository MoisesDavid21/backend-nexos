-- ==============================================================================
-- PRISMA DELIVERY APP - ESQUEMA DE BASE DE DATOS (POSTGRESQL)
-- ==============================================================================

CREATE DATABASE prisma;
\c prisma;

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE rol_usuario AS ENUM ('admin', 'tienda', 'delivery', 'user');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'preparando', 'listo', 'asignado', 'entregado', 'cancelado');

-- ==============================================================================
-- 2. TABLAS PRINCIPALES
-- ==============================================================================

-- TABLA USUARIOS (Abarca todos los roles)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario DEFAULT 'user',
    telefono VARCHAR(20),
    -- Campos específicos de cliente
    direccion_principal TEXT,
    -- Campos específicos de delivery
    vehiculo VARCHAR(50),
    zona_reparto VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 5.00,
    -- Metadatos
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- TABLA TIENDAS (Comercios)
CREATE TABLE tiendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    propietario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descripcion TEXT,
    logo_url VARCHAR(255),
    banner_url VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 5.00,
    tiempo_entrega VARCHAR(50),
    costo_envio DECIMAL(10,2) DEFAULT 0.00,
    abierta BOOLEAN DEFAULT FALSE,
    direccion TEXT,
    horario VARCHAR(100),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA PRODUCTOS
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tienda_id UUID REFERENCES tiendas(id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    imagen_url VARCHAR(255),
    categoria VARCHAR(50),
    oferta_porcentaje INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. TABLAS DE FLUJO DE COMPRA (PEDIDOS)
-- ==============================================================================

-- TABLA PEDIDOS (Orders)
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tienda_id UUID REFERENCES tiendas(id) ON DELETE SET NULL,
    delivery_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado estado_pedido DEFAULT 'pendiente',
    subtotal DECIMAL(10,2) NOT NULL,
    costo_envio DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    direccion_entrega TEXT NOT NULL,
    nota_cliente TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMP WITH TIME ZONE
);

-- TABLA DETALLE DE PEDIDOS (Items)
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    titulo_snapshot VARCHAR(100), -- Guardar el nombre al momento de la compra
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0)
);

-- ==============================================================================
-- 4. ÍNDICES DE OPTIMIZACIÓN
-- ==============================================================================
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_tiendas_categoria ON tiendas(categoria);
CREATE INDEX idx_productos_tienda ON productos(tienda_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_tienda ON pedidos(tienda_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
