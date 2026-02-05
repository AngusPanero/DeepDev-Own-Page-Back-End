// Express y Router
const express = require("express")
const mercadoPagoRouter = express.Router()
// Mercado Pago
const { MercadoPagoConfig, Payment } =require("mercadopago")
const { v4 } = require("uuid")
// Mongo
const Payments = require("../models/Payments")

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});
const payment = new Payment(client);

mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    try {
        const { token, issuer_id, payment_method_id, transaction_amount, installments, payer } = req.body;

        const paymentData = {
            body: {
                token,
                issuer_id,
                payment_method_id,
                transaction_amount: Number(transaction_amount),
                installments: Number(installments),
                description: "DeepDev Studio - Servicio Digital",
                payer: {
                    email: payer.email,
                    identification: {
                        type: payer.identification.type,
                        number: payer.identification.number
                    }
                },
                metadata: {
                    order_id: `DD-${v4()}`,
                    client_id: payer.id_internal 
                }
            },
            requestOptions: { idempotencyKey: v4() }
        };
        const result = await Payment.create(paymentData);

        // Devolvemos la respuesta detallada
        res.status(201).json({ status: result.status, status_detail: result.status_detail, id: result.id });

    } catch (error) {
        console.error("Error processing Mercado Pago payment! 🔴", error);
        res.status(500).json({ error: error.message, details: error.cause || "Internal Server Error" });
    }
}); 

module.exports = mercadoPagoRouter;