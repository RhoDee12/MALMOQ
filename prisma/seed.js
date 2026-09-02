// ============================================================================
// SEED - datos iniciales para poder probar el sistema
// ============================================================================
// Crea: la fila de configuracion del sitio, el usuario JEFE (admin), los
// medios de pago basicos, las categorias del brief, y algunos productos de
// ejemplo con stock, para que la tienda no se vea vacia al probarla.
//
// Se ejecuta con: npm run seed
// Es seguro correrlo varias veces (usa upsert / verifica antes de crear).
// ============================================================================

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { ROLES, PAYMENT_METHOD_TYPES } = require("../src/constants");

const prisma = new PrismaClient();

const CATEGORIES = [
  "Cervezas", "Vinos", "Whisky", "Vodka", "Ron", "Tequila", "Pisco", "Licores", "Bebidas", "Otros",
];

// Usuario jefe por defecto - CAMBIAR LA CONTRASENA apenas se pruebe el sistema.
const JEFE_EMAIL = "admin@malmoq.pe";
const JEFE_PASSWORD = "Malmoq2026*";

async function main() {
  console.log("Sembrando datos iniciales de MALMOQ...\n");

  // 1) Configuracion del sitio (fila unica id=1)
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      heroTitle: "Todo para tus mejores momentos",
      heroSubtitle: "Encuentra tus bebidas favoritas en MALMOQ.",
      igvPercent: 18,
      pricesIncludeIgv: true,
      companyName: "MALMOQ",
      companyAddress: "Moquegua, Peru",
      whatsappMessage: "Hola, quisiera hacer una consulta.",
    },
  });
  console.log("- Configuracion del sitio lista.");

  // 2) Usuario JEFE
  const existingJefe = await prisma.user.findUnique({ where: { email: JEFE_EMAIL } });
  if (!existingJefe) {
    const passwordHash = await bcrypt.hash(JEFE_PASSWORD, 10);
    await prisma.user.create({
      data: { email: JEFE_EMAIL, passwordHash, role: ROLES.JEFE, isActive: true },
    });
    console.log(`- Usuario JEFE creado -> correo: ${JEFE_EMAIL} / contrasena: ${JEFE_PASSWORD}`);
  } else {
    console.log("- Usuario JEFE ya existia, no se toco.");
  }

  // 3) Medios de pago basicos
  for (const type of Object.values(PAYMENT_METHOD_TYPES)) {
    await prisma.paymentMethod.upsert({ where: { type }, update: {}, create: { type, isActive: true } });
  }
  console.log("- Medios de pago (Efectivo, Yape, Plin, Tarjeta/Pocket POS) listos.");

  // 4) Comision inicial de Pocket POS (ejemplo: 3%)
  const pocketPos = await prisma.paymentMethod.findUnique({ where: { type: PAYMENT_METHOD_TYPES.TARJETA_POCKET_POS } });
  const hasCommission = await prisma.paymentCommission.findFirst({ where: { paymentMethodId: pocketPos.id } });
  if (!hasCommission) {
    await prisma.paymentCommission.create({
      data: { paymentMethodId: pocketPos.id, percent: 3.0, providerName: "Pocket POS (ejemplo, editar en Configuracion)" },
    });
    console.log("- Comision inicial de Pocket POS: 3% (editable en el panel).");
  }

  // 5) Categorias
  let sortOrder = 0;
  const categoryRecords = {};
  for (const name of CATEGORIES) {
    const slug = name.toLowerCase();
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug, sortOrder: sortOrder++ },
    });
    categoryRecords[name] = category;
  }
  console.log(`- ${CATEGORIES.length} categorias listas.`);

  // 6) Productos de ejemplo (para poder ver la tienda funcionando)
  // Los SKU usan el mismo criterio que el panel genera automaticamente al
  // crear un producto nuevo: primeras 3 letras de la categoria + numero
  // correlativo (ver prefijoSkuDeCategoria en public/js/admin/pages/productos.js).
  const sampleProducts = [
    { sku: "CER-001", name: "Cerveza Pilsen Callao 620ml", category: "Cervezas", price: 8.5, stock: 120 },
    { sku: "CER-002", name: "Cerveza Cusquena Dorada 620ml", category: "Cervezas", price: 9.0, stock: 100 },
    { sku: "VIN-001", name: "Vino Tabernero Borgona 750ml", category: "Vinos", price: 25.0, stock: 40 },
    { sku: "WHI-001", name: "Whisky Johnnie Walker Red Label 750ml", category: "Whisky", price: 65.0, promoPrice: 58.0, stock: 25 },
    { sku: "VOD-001", name: "Vodka Absolut Blue 750ml", category: "Vodka", price: 55.0, stock: 30 },
    { sku: "RON-001", name: "Ron Cartavio Black 750ml", category: "Ron", price: 38.0, stock: 35 },
    { sku: "TEQ-001", name: "Tequila Jose Cuervo Especial 750ml", category: "Tequila", price: 70.0, stock: 15 },
    { sku: "PIS-001", name: "Pisco Queirolo Quebranta 750ml", category: "Pisco", price: 32.0, stock: 45 },
  ];

  for (const p of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        presentation: "botella",
        price: p.price,
        promoPrice: p.promoPrice || null,
        stock: p.stock,
        minStock: 10,
        categoryId: categoryRecords[p.category].id,
      },
    });
  }
  console.log(`- Productos de ejemplo listos (puedes editarlos o borrarlos desde el panel).`);

  console.log("\nListo. Ya puedes iniciar sesion como JEFE con los datos de arriba.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
