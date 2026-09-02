// ============================================================================
// MIDDLEWARE DE SUBIDA DE IMAGENES (logo, banners, fotos de productos, etc.)
// ============================================================================
// Usa la libreria "multer" para recibir archivos desde formularios del panel
// administrativo y guardarlos en disco, dentro de public/img/uploads/<carpeta>.
// Como esa carpeta esta servida como estatica (ver app.js), cualquier imagen
// guardada aca queda accesible al instante en una URL tipo:
//   /img/uploads/productos/1699999999-ron-cartavio.jpg
//
// NOTA para cuando se despliegue en la nube: los discos de muchos hostings
// gratuitos son "efimeros" (se borran en cada despliegue). Si eso pasa,
// reemplazar este modulo por una subida a un servicio como Cloudinary o
// Supabase Storage - el resto del codigo (que solo usa "imageUrl") no
// cambiaria, solo como se genera esa URL.
// ============================================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "public", "img", "uploads");

// Tipos de archivo permitidos, para no aceptar cualquier cosa como "imagen".
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Crea un middleware de subida configurado para guardar en una subcarpeta
 * especifica (ej: "productos", "categorias", "banners", "logo", "qr").
 * @param {string} subfolder
 */
function createUploader(subfolder) {
  const destination = path.join(UPLOADS_ROOT, subfolder);
  fs.mkdirSync(destination, { recursive: true }); // crea la carpeta si no existe

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      // Nombre unico: timestamp + nombre original saneado, para evitar
      // que dos imagenes con el mismo nombre se sobreescriban entre si.
      const safeName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.\-]/g, "-");
      cb(null, `${Date.now()}-${safeName}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximo por imagen
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error("Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF."));
      }
      cb(null, true);
    },
  });
}

/**
 * Dada la subcarpeta y el nombre de archivo guardado por multer, arma la
 * URL publica que se guarda en la base de datos (campo imageUrl / qrImageUrl / etc).
 */
function buildPublicUrl(subfolder, filename) {
  return `/img/uploads/${subfolder}/${filename}`;
}

module.exports = { createUploader, buildPublicUrl };
