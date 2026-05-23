const mongoose = require("mongoose");

// ─── Registro de participante ─────────────────────────────────
const RaffleEntrySchema = new mongoose.Schema({
    fullName:    { type: String, required: true, trim: true },
    email:       { type: String, required: true, lowercase: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    country:     { type: String, required: true, trim: true },
    instagram:   { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },
    raffleId:    { type: mongoose.Schema.Types.ObjectId, ref: "ActiveRaffle", required: true },
    createdAt:   { type: Date, default: Date.now },
    ip:          { type: String, default: "" },
});
// un email = un registro por sorteo
RaffleEntrySchema.index({ email: 1, raffleId: 1 }, { unique: true });

// ─── Sorteo activo (creado desde el admin) ────────────────────
const ActiveRaffleSchema = new mongoose.Schema({
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    prize:       { type: String, required: true, trim: true },
    drawDate:    { type: Date,   required: true },
    isActive:    { type: Boolean, default: true },
    createdAt:   { type: Date,  default: Date.now },
    createdBy:   { type: String, default: "admin" },
});

const RaffleEntry  = mongoose.model("RaffleEntry",  RaffleEntrySchema);
const ActiveRaffle = mongoose.model("ActiveRaffle", ActiveRaffleSchema);

module.exports = { RaffleEntry, ActiveRaffle };