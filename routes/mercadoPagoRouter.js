// Express y Router
const express = require("express")
const mercadoPagoRouter = express.Router()
// Mercado Pago
const { MercadoPagoConfig, Payment } =require("mercadopago")
const { v4 } = require("uuid")
// Mongo
const PaymentsMongo = require("../models/Payments")

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

const paymentInstance = new Payment(client);

const esProduccion = (process.env.NODE_ENV === 'production');

mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey, plan } = req.body;

    try {
        const paymentData = {
            body: {
                transaction_amount: Number(transaction_amount),
                token,
                description: "DeepDev Studio - Servicio Digital",
                installments: Number(installments),
                payment_method_id,
                issuer_id: issuer_id ? String(issuer_id) : undefined,
                payer: {
                    email: payer.email,
                    identification: payer.identification
                },
            },
            requestOptions: { 
                
                idempotencyKey: idempotencyKey 
            }
        };

        const result = await paymentInstance.create(paymentData);

        const newPayment = new PaymentsMongo({
            orderId: `ORD-${Date.now()}`, 
            client_id: payer.id_internal || "guest", 
            email: payer.email,
            plan: plan, 
            amount: Number(transaction_amount),
            mp_payment_id: String(result.id),
            status: result.status, 
            date: new Date()
        });

        await newPayment.save();

        res.status(201).json({ status: result.status, status_detail: result.status_detail, id: result.id });

    } catch (error) {
        console.error(esProduccion ? "Error MP" : "Error MP:", error.response?.data || error.message);
        res.status(500).json({ error: "Falla en el proceso de pago" });
    }
});

// RUTA PARA RECIBIR NOTIFICACIONES DE MERCADO PAGO
mercadoPagoRouter.post("/webhooks", async (req, res) => {
    try {
        const { query, body } = req;
        const id = query["data.id"] || body?.data?.id || body?.id;
        const type = query.type || body?.type;

        // IMPORTANTE: El ID "123456" es un test de MP y no existe en sus servidores reales
        if (type === "payment" && id && id !== "123456") {
            
            // Aquí es donde fallaba por el Token
            const payment = await paymentInstance.get({ id });

            await PaymentsMongo.findOneAndUpdate(
                { mpId: id.toString() },
                { 
                    status: payment.status, 
                    statusDetail: payment.status_detail 
                }
            );
        } else if (id === "123456") {
            console.log("Simulación de prueba recibida correctamente (ID 123456)");
        }

        res.status(200).send("OK");
    } catch (error) {
        // Si el error es porque el ID no existe (como el 123456), lo manejamos
        console.error(esProduccion ? "Error en Webhook 🔴" : "Error en Webhook 🔴:", error.message);
        res.status(200).send("OK"); // Mandamos 200 igual para que MP no reintente
    }
});

module.exports = mercadoPagoRouter;