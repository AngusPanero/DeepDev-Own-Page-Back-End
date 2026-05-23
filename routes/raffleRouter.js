const express = require("express");
const rateLimit = require("express-rate-limit");
const adminMiddleware = require("../middleware/adminMiddleware");
const { RaffleEntry, ActiveRaffle } = require("../models/RaffleSchema");

const raffleRouter = express.Router();

// ─── Rate limiter — max 3 intentos por IP cada 15 min ────────
const entryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { message: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});

// ════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ════════════════════════════════════════════════════════════════

// GET /api/raffle/active — sorteo activo actual (público)
raffleRouter.get("/raffle/active", async (req, res) => {
    try {
        const raffle = await ActiveRaffle.findOne({ isActive: true }).sort({ createdAt: -1 });
        if (!raffle) return res.json({ raffle: null });
        res.json({ raffle });
    } catch (err) {
        res.status(500).json({ message: "Error al obtener sorteo" });
    }
});

// POST /api/raffle/enter — registrar participante
raffleRouter.post("/raffle/enter", entryLimiter, async (req, res) => {
    const { fullName, email, phone, country, instagram, description, raffleId } = req.body;

    if (!fullName || !email || !phone || !country || !description || !raffleId) {
        return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    // validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Email inválido." });
    }

    try {
        // verificar que el sorteo existe y está activo
        const raffle = await ActiveRaffle.findById(raffleId);
        if (!raffle || !raffle.isActive) {
            return res.status(400).json({ message: "El sorteo no está disponible." });
        }

        // verificar fecha — no registrar si ya pasó
        if (new Date() > new Date(raffle.drawDate)) {
            return res.status(400).json({ message: "El sorteo ya finalizó." });
        }

        // verificar email duplicado para este sorteo
        const existing = await RaffleEntry.findOne({
            email: email.toLowerCase().trim(),
            raffleId,
        });
        if (existing) {
            return res.status(409).json({
                message: "Este email ya está registrado en el sorteo."
            });
        }

        // guardar
        const ip = req.ip || req.headers["x-forwarded-for"] || "";
        const entry = new RaffleEntry({
            fullName: fullName.trim(),
            email:    email.toLowerCase().trim(),
            phone:    phone.trim(),
            country:  country.trim(),
            instagram: instagram?.trim() ?? "",
            description: description.trim(),
            raffleId,
            ip: Array.isArray(ip) ? ip[0] : ip,
        });
        await entry.save();

        res.status(201).json({ message: "¡Registrado exitosamente! 🟢" });

    } catch (err) {
        if (err.code === 11000) {
            // índice único — doble submit
            return res.status(409).json({ message: "Este email ya está registrado en el sorteo." });
        }
        console.error("[raffleRouter] enter error:", err.message);
        res.status(500).json({ message: "Error al procesar el registro." });
    }
});

// ════════════════════════════════════════════════════════════════
// ADMIN ROUTES — protegidas con adminMiddleware
// ════════════════════════════════════════════════════════════════

// POST /api/raffle/admin/create — crear nuevo sorteo
raffleRouter.post("/raffle/admin/create", adminMiddleware, async (req, res) => {
    const { title, description, prize, drawDate } = req.body;
    console.log(req.body)

    if (!title || !description || !prize || !drawDate) {
        return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    const date = new Date(drawDate);
    if (isNaN(date.getTime()) || date <= new Date()) {
        return res.status(400).json({ message: "La fecha del sorteo debe ser futura." });
    }

    try {
        // desactivar sorteos anteriores
        await ActiveRaffle.updateMany({ isActive: true }, { isActive: false });

        const raffle = new ActiveRaffle({ title, description, prize, drawDate: date });
        await raffle.save();

        res.status(201).json({ message: "Sorteo creado 🟢", raffle });
    } catch (err) {
        console.error("[raffleRouter] create error:", err.message);
        res.status(500).json({ message: "Error al crear sorteo." });
    }
});

// PATCH /api/raffle/admin/:id/deactivate — desactivar sorteo
raffleRouter.patch("/raffle/admin/:id/deactivate", adminMiddleware, async (req, res) => {
    try {
        await ActiveRaffle.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: "Sorteo desactivado 🟢" });
    } catch (err) {
        res.status(500).json({ message: "Error al desactivar." });
    }
});

// GET /api/raffle/admin/entries/:raffleId — ver participantes
raffleRouter.get("/raffle/admin/entries/:raffleId", adminMiddleware, async (req, res) => {
    try {
        const entries = await RaffleEntry
            .find({ raffleId: req.params.raffleId })
            .sort({ createdAt: -1 });
        res.json({ entries, total: entries.length });
    } catch (err) {
        res.status(500).json({ message: "Error al obtener participantes." });
    }
});

// GET /api/raffle/admin/all — todos los sorteos
raffleRouter.get("/raffle/admin/all", adminMiddleware, async (req, res) => {
    try {
        const raffles = await ActiveRaffle.find().sort({ createdAt: -1 });
        res.json({ raffles });
    } catch (err) {
        res.status(500).json({ message: "Error al obtener sorteos." });
    }
});

module.exports = raffleRouter;