const mongoose = require("mongoose");

const PaymentsSchema = new mongoose.Schema({
    client_id: { type: String, required: true },
    email: { type: String, required: true },
    plan: { type: String, enum: ['Landing Basic', 'Landing Pro', 'E-shop Lite', 'E-shop Full'], required: true },
    amount: { type: Number, required: true },
    mp_payment_id: { type: String }, // El ID que te devuelve Mercado Pago
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'in_process'], 
        default: 'pending' 
    },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

const PaymentsMongo = mongoose.model("payments", PaymentsSchema)

module.exports = PaymentsMongo