// Rutas del carrito: /api/carrito/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/cart.controller");

// No requiere sesion: se puede armar carrito como visitante.
router.post("/carrito/verificar", asyncHandler(ctrl.verify));

module.exports = router;
