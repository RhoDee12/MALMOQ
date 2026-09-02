// ============================================================================
// CONTROLADOR DE AUTENTICACION
// ============================================================================
// Maneja registro y login de CLIENTES (los empleados y el jefe los crea el
// jefe desde el panel administrativo, ver employees.controller.js - no hay
// registro publico para esos roles, por seguridad).
// ============================================================================

const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { signToken, TOKEN_EXPIRES_IN } = require("../utils/jwt");
const { ROLES } = require("../constants");

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias, igual que el JWT

/**
 * Pone el token de sesion en una cookie httpOnly (no accesible desde
 * JavaScript del navegador, solo la envia el navegador automaticamente en
 * cada peticion) - mitiga robo de sesion via ataques XSS.
 */
function setSessionCookie(res, user) {
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    // "secure" deberia ser true en produccion (requiere HTTPS). En
    // desarrollo local (http://localhost) se deja en false para poder probar.
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * POST /api/auth/registro
 * Crea una cuenta nueva de CLIENTE. Los datos personales van en la tabla
 * Customer (separada de User) para mantener User simple y generico para
 * los 3 roles.
 */
async function register(req, res) {
  const { email, password, firstName, lastName, phone, address, reference } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw new AppError("Nombre, apellidos, correo y contrasena son obligatorios.");
  }
  if (password.length < 6) {
    throw new AppError("La contrasena debe tener al menos 6 caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError("Ya existe una cuenta registrada con ese correo.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role: ROLES.CLIENTE,
      customerProfile: {
        create: { firstName, lastName, phone, address, reference },
      },
    },
    include: { customerProfile: true },
  });

  setSessionCookie(res, user);
  res.status(201).json({ ok: true, user: publicUser(user) });
}

/**
 * POST /api/auth/login
 * Valida credenciales para cualquier rol (cliente, empleado o jefe usan el
 * mismo formulario de login; el frontend decide a que panel redirigir
 * segun el "role" que viene en la respuesta).
 */
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Correo y contrasena son obligatorios.");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { customerProfile: true, employeeProfile: true },
  });

  // Mensaje generico a proposito (no decir si el problema fue el correo o
  // la contrasena) para no facilitarle informacion a quien intenta adivinar.
  const invalidCredentialsMsg = "Correo o contrasena incorrectos.";
  if (!user) throw new AppError(invalidCredentialsMsg, 401);
  if (!user.isActive) throw new AppError("Tu cuenta esta desactivada. Contacta al administrador.", 401);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new AppError(invalidCredentialsMsg, 401);

  setSessionCookie(res, user);
  res.json({ ok: true, user: publicUser(user) });
}

/** POST /api/auth/logout - simplemente borra la cookie de sesion. */
function logout(req, res) {
  res.clearCookie("token");
  res.json({ ok: true });
}

/** GET /api/auth/me - devuelve el usuario logueado actualmente (o 401 si no hay sesion). */
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { customerProfile: true, employeeProfile: true },
  });
  res.json({ ok: true, user: publicUser(user) });
}

/**
 * Recorta los campos del usuario que se envian al frontend: nunca se manda
 * el passwordHash, aunque sea un hash y no la contrasena real.
 */
function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = { register, login, logout, me };
