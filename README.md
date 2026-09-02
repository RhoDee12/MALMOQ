# MALMOQ - Plataforma web integral para la licoreria

Sistema de comercio electronico + gestion interna para MALMOQ (Moquegua, Peru).
Tienda online para clientes + panel administrativo para empleados y jefe,
conectados a una unica base de datos (no es una maqueta: hay backend real,
base de datos real, autenticacion real y control de stock real).

## Stack tecnologico

| Capa | Tecnologia | Por que |
|---|---|---|
| Backend / API | Node.js + Express | Simple, muy soportado, facil de desplegar gratis |
| Base de datos | Prisma ORM + SQLite (dev) / PostgreSQL (produccion) | Migrar de SQLite a Postgres es solo cambiar el `.env`, el codigo no cambia |
| Frontend | HTML + CSS + Bootstrap 5, **archivos separados** | Sin frameworks que compilen todo junto - facil ubicar y editar cada cosa |
| Autenticacion | JWT en cookie httpOnly + bcrypt | Sesiones sin servidor de sesiones, contrasenas nunca en texto plano |

## Estructura de carpetas

```
MALMOQ/
├── prisma/
│   ├── schema.prisma      Definicion de TODAS las tablas de la base de datos
│   └── seed.js             Datos iniciales de prueba (usuario jefe, categorias, productos)
├── src/                     BACKEND (API)
│   ├── constants.js         Valores permitidos (roles, estados, tipos de pago, etc.)
│   ├── app.js                Configuracion de Express y montaje de rutas
│   ├── server.js             Punto de entrada (arranca el servidor)
│   ├── config/prisma.js      Conexion a la base de datos
│   ├── middleware/           Autenticacion, permisos, subida de imagenes, errores
│   ├── controllers/          Logica de cada endpoint (uno por area del negocio)
│   ├── routes/                Definicion de URLs de la API
│   └── services/              Logica de negocio reusable (precios/IGV, stock, comprobantes)
└── public/                   FRONTEND (HTML/CSS/JS separados)
    ├── css/
    │   ├── style.css          Estilos de la tienda (colores de marca, tipografia)
    │   └── admin.css           Estilos del panel administrativo
    ├── js/
    │   ├── api.js               Funcion central para llamar a la API
    │   ├── cart.js               Carrito (localStorage)
    │   ├── layout.js             Arma navbar/footer de la tienda
    │   ├── pages/                Un archivo JS por cada pagina publica
    │   └── admin/
    │       ├── admin-layout.js   Arma sidebar/topbar del panel
    │       └── pages/            Un archivo JS por cada pagina del panel
    ├── img/
    │   ├── placeholder-producto.svg
    │   └── uploads/               Imagenes subidas desde el panel (logo, productos, etc.)
    ├── index.html, productos.html, producto.html, carrito.html,
    │   checkout.html, login.html, registro.html, mi-cuenta.html   (tienda)
    └── admin/*.html                                                (panel administrativo)
```

Cada pagina HTML es independiente: trae su propio `<link>` a los CSS y sus
propios `<script>` a los JS que necesita - nada esta mezclado dentro del HTML.

## Como correrlo en tu maquina (o en la de casa, tras clonar desde GitHub)

Requisitos: Node.js (v18 o superior).

```bash
git clone <URL-del-repo>
cd MALMOQ
npm install
copy .env.example .env      REM en PowerShell: Copy-Item .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Abre `http://localhost:3000` en el navegador.

**Usuario JEFE de prueba** (creado por el seed, cambiar la contrasena luego):
- Correo: `admin@malmoq.pe`
- Contrasena: `Malmoq2026*`

## Base de datos: de SQLite local a la nube (Postgres)

Para desarrollar no hace falta nada mas que lo de arriba (usa un archivo
`prisma/dev.db` local). Para que la tienda funcione de verdad en internet
(y que la info se comparta entre la compu de la casa, el trabajo, y los
clientes), hay que pasar a una base de datos en la nube:

1. Crear una cuenta gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com).
2. Copiar la cadena de conexion que te dan (`DATABASE_URL`).
3. En `prisma/schema.prisma`, cambiar `provider = "sqlite"` por `provider = "postgresql"`.
4. En `.env`, reemplazar `DATABASE_URL` por la de Neon/Supabase.
5. Correr `npx prisma migrate dev` de nuevo (crea las tablas en la nube).
6. `npm run seed` para tener el usuario jefe y datos iniciales alla tambien.

## Subida de imagenes

Las imagenes (logo, banners, fotos de productos, QR de Yape/Plin) se suben
desde el panel administrativo y se guardan en `public/img/uploads/`. Esta
carpeta esta en `.gitignore` (no se sube a GitHub, cada entorno tiene las
suyas). **Importante para cuando se despliegue en un hosting**: varios
hostings gratuitos borran los archivos subidos en cada despliegue (disco
"efimero"). Si eso pasa, hay que cambiar `src/middleware/upload.middleware.js`
para subir a un servicio externo como Cloudinary o Supabase Storage - el
resto del codigo no cambia, porque todo el sistema solo maneja una URL de
imagen (`imageUrl`), sin importar de donde venga.

## Que esta funcionando ahora mismo (Fase 1)

- Autenticacion con 3 roles (Cliente, Empleado, Jefe) y permisos por empleado.
- Catalogo de productos y categorias, con busqueda/filtros/orden, 100% desde la base de datos.
- Carrito con verificacion de stock, checkout con validacion y descuento de
  inventario **transaccional** (no se puede vender de mas, ni con compras simultaneas).
- Pedidos online con estados, y ventas presenciales (POS) - ambos comparten el mismo inventario.
- Calculo de IGV y comision de Pocket POS, **con historial**: cambiar el % no
  altera ventas ya hechas (probado y verificado).
- Comprobantes con numeracion correlativa automatica (serie B001).
- Panel administrativo: productos, categorias, inventario (con auditoria de
  movimientos), pedidos, ventas/POS, clientes, empleados y permisos,
  promociones, banners, zonas de delivery, configuracion (IGV, medios de
  pago, Pocket POS, Home, WhatsApp, logo/favicon), reportes y dashboard.
- Registro de auditoria (`ActivityLog`) de las acciones administrativas importantes.

## Que falta (proximas fases)

- **PDF de boletas**: el comprobante ya se genera y numera en la base de
  datos; falta el modulo que lo convierta en un PDF descargable/imprimible.
- **Tiempo real**: hoy el panel y la tienda se actualizan al recargar o
  volver a pedir datos a la API. Falta agregar WebSockets/Server-Sent
  Events para que, por ejemplo, el stock se actualice solo sin refrescar.
- **Vista de auditoria en el panel**: los registros ya se guardan en
  `ActivityLog`, falta una pantalla en el panel para consultarlos.
- **Facturacion electronica**: la arquitectura esta preparada (series,
  correlativos y comprobantes separados de la venta), pero la integracion
  con un proveedor autorizado / SUNAT todavia no esta conectada.
- **Despliegue en la nube**: pasar la base de datos a Postgres (Neon/Supabase)
  y subir el backend a un hosting (Render/Railway) para que la tienda sea
  accesible por internet, no solo en `localhost`.

## Notas de seguridad

- Todas las reglas de permisos se validan en el backend (`src/middleware/auth.middleware.js`),
  nunca solo en el frontend - aunque alguien manipule el HTML/JS del navegador,
  la API rechaza lo que no le corresponde a su rol.
- Las contrasenas se guardan cifradas con bcrypt, nunca en texto plano.
- El archivo `.env` (con `JWT_SECRET` y `DATABASE_URL`) NUNCA se sube a GitHub.
