// ============================================================================
// CONTROLADOR DE EMPLEADOS
// ============================================================================
// Solo el JEFE puede crear y administrar empleados (no hay registro publico
// para este rol). Aca tambien se asignan los permisos granulares de cada
// empleado (ver modelo Employee en el schema).
// ============================================================================

const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { ROLES } = require("../constants");
const { logActivity } = require("../services/activityLog.service");

/** GET /api/admin/empleados - lista de empleados (excluye al jefe mismo). */
async function list(req, res) {
  const users = await prisma.user.findMany({
    where: { role: ROLES.EMPLEADO },
    include: { employeeProfile: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, employees: users.map(publicUser) });
}

/**
 * POST /api/admin/empleados
 * Crea un usuario con rol EMPLEADO y su perfil con los permisos iniciales.
 */
async function create(req, res) {
  const { email, password, firstName, lastName, phone, permissions } = req.body;
  if (!email || !password || !firstName || !lastName) {
    throw new AppError("Nombre, apellidos, correo y contrasena son obligatorios.");
  }
  if (password.length < 6) throw new AppError("La contrasena debe tener al menos 6 caracteres.");

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError("Ya existe una cuenta con ese correo.", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const perms = permissions || {};

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role: ROLES.EMPLEADO,
      employeeProfile: {
        create: {
          firstName, lastName, phone,
          canManageProducts: Boolean(perms.canManageProducts),
          canManageInventory: perms.canManageInventory !== false,
          canManageOrders: perms.canManageOrders !== false,
          canRegisterSales: perms.canRegisterSales !== false,
          canViewCustomers: Boolean(perms.canViewCustomers),
          canEditConfirmedOrders: Boolean(perms.canEditConfirmedOrders),
        },
      },
    },
    include: { employeeProfile: true },
  });

  await logActivity({ userId: req.user.id, action: "EMPLOYEE_CREATE", entity: "User", entityId: user.id });
  res.status(201).json({ ok: true, employee: publicUser(user) });
}

/** PUT /api/admin/empleados/:id - edita datos/permisos/activo de un empleado. */
async function update(req, res) {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id }, include: { employeeProfile: true } });
  if (!user || user.role !== ROLES.EMPLEADO) throw new AppError("Empleado no encontrado.", 404);

  const { isActive, firstName, lastName, phone, permissions } = req.body;

  if (isActive !== undefined) {
    await prisma.user.update({ where: { id }, data: { isActive: Boolean(isActive) } });
  }

  const profileData = {};
  for (const field of ["firstName", "lastName", "phone"]) {
    if (req.body[field] !== undefined) profileData[field] = req.body[field];
  }
  if (permissions) {
    for (const key of ["canManageProducts", "canManageInventory", "canManageOrders", "canRegisterSales", "canViewCustomers", "canEditConfirmedOrders"]) {
      if (permissions[key] !== undefined) profileData[key] = Boolean(permissions[key]);
    }
  }
  if (Object.keys(profileData).length > 0) {
    await prisma.employee.update({ where: { userId: id }, data: profileData });
  }

  const updated = await prisma.user.findUnique({ where: { id }, include: { employeeProfile: true } });
  await logActivity({ userId: req.user.id, action: "EMPLOYEE_UPDATE", entity: "User", entityId: id, newValue: { isActive, ...profileData } });
  res.json({ ok: true, employee: publicUser(updated) });
}

/** PUT /api/admin/empleados/:id/contrasena - el jefe resetea la contrasena de un empleado. */
async function resetPassword(req, res) {
  const id = Number(req.params.id);
  const { password } = req.body;
  if (!password || password.length < 6) throw new AppError("La nueva contrasena debe tener al menos 6 caracteres.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await logActivity({ userId: req.user.id, action: "EMPLOYEE_PASSWORD_RESET", entity: "User", entityId: id });
  res.json({ ok: true });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = { list, create, update, resetPassword };
