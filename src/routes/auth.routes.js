// Rutas de autenticacion: /api/auth/*
const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const authController = require("../controllers/auth.controller");

router.post("/registro", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authController.logout);
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
