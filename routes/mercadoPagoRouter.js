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

mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey, plan } = req.body;
    
    try {
        const pagoPrevio = await PaymentsMongo.findOne({ orderId: idempotencyKey });

        if (pagoPrevio) {
            return res.status(200).json({ 
                status: pagoPrevio.status, 
                id: pagoPrevio.mp_payment_id, // Usando el nombre correcto de tu esquema
                message: "Esta transacción ya fue procesada anteriormente."
            });
        }

        // Construimos el cuerpo del pago
        const body = {
            token,
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
                order_id: idempotencyKey,
                client_id: payer.id_internal 
            }
        };

        // IMPORTANTE: Solo agregamos el issuer_id si realmente existe y no es "null"
        if (issuer_id && issuer_id !== "null" && issuer_id !== null) {
            body.issuer_id = String(issuer_id);
        }

        const paymentData = {
            body,
            requestOptions: { idempotencyKey }
        };

        const result = await paymentInstance.create(paymentData);
        console.log("Resultado de Mercado Pago:", result);  

        // Guardar en Mongo (Asegúrate de que los nombres de los campos coincidan con tu Schema)
        const nuevoPago = new PaymentsMongo({
            orderId: idempotencyKey,
            client_id: payer.id_internal, 
            email: payer.email,
            plan: plan || "Servicio Digital",          
            amount: Number(transaction_amount),
            mp_payment_id: result.id,     
            status: result.status,
            date: new Date()
        });

        await nuevoPago.save();

        res.status(201).json({ 
            status: result.status, 
            status_detail: result.status_detail, 
            id: result.id 
        });

    } catch (error) {
        console.error("Error processing Mercado Pago payment! 🔴", error);
        // Si MP devuelve un error, lo enviamos con detalle para debugear
        res.status(500).json({ 
            error: error.message || "Internal Server Error", 
            details: error.cause || error.response?.data || "No details provided" 
        });
    }
});

// RUTA PARA RECIBIR NOTIFICACIONES DE MERCADO PAGO
mercadoPagoRouter.post("/webhooks", async (req, res) => {
    try {
        const { query, body } = req;
        const id = query["data.id"] || body?.data?.id || body?.id;
        const type = query.type || body?.type;

        console.log(`--- NOTIFICACIÓN RECIBIDA ---`);
        console.log(`Tipo: ${type}, ID: ${id}`);

        // IMPORTANTE: El ID "123456" es un test de MP y no existe en sus servidores reales
        if (type === "payment" && id && id !== "123456") {
            
            // Aquí es donde fallaba por el Token
            const payment = await paymentInstance.get({ id });

            console.log(`Estado real: ${payment.status}`);

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
        console.error("Error en Webhook 🔴:", error.message);
        res.status(200).send("OK"); // Mandamos 200 igual para que MP no reintente
    }
});

module.exports = mercadoPagoRouter;