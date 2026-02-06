// Express y Router
const express = require("express")
const mercadoPagoRouter = express.Router()
// Mercado Pago
const { MercadoPagoConfig, Payment } =require("mercadopago")
const { v4 } = require("uuid")
// Mongo
const PaymentsMongo = require("../models/Payments")
const { log } = require("firebase/firestore/pipelines")

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

const paymentInstance = new Payment(client);

mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey } = req.body;
    console.log(req.body);
    
    try {
        // Cheque que no se cobre el mismo pago
        const pagoPrevio = await PaymentsMongo.findOne({ orderId: idempotencyKey });

        if (pagoPrevio) {
            console.log("Reintento detectado: La orden ya existe en nuestra DB.");
            return res.status(200).json({ 
                status: pagoPrevio.status, 
                status_detail: pagoPrevio.statusDetail, 
                id: pagoPrevio.mpId,
                message: "Esta transacción ya fue procesada anteriormente."
            });
        }
        // Data cobro
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
                    order_id: idempotencyKey,
                    client_id: payer.id_internal 
                }
            },
            requestOptions: { idempotencyKey }
        };
        const result = await paymentInstance.create(paymentData);
        console.log("Resultado de Mercado Pago:", result);  
        //Mongo Cheque duplicado
        const pagoExistente = await PaymentsMongo.findOne({ 
            $or: [
                { orderId: idempotencyKey },
                { mpId: result.id }
            ]
        });

        if (pagoExistente) {
            console.log("Pago ya registrado anteriormente, omitiendo duplicado en DB.");
            return res.status(200).json({ 
                status: pagoExistente.status, 
                status_detail: pagoExistente.statusDetail, 
                id: pagoExistente.mpId 
            });
        }

        // Lo guardo si no esta duplicado
        const nuevoPago = new PaymentsMongo({
            orderId: idempotencyKey,
            mpId: result.id,
            amount: Number(transaction_amount),
            status: result.status,
            statusDetail: result.status_detail,
            email: payer.email,
            clientId: payer.id_internal,
            installments: installments,
            paymentMethod: payment_method_id,
            date: new Date()
        });

        await nuevoPago.save();

        // Devolvemos la respuesta detallada
        res.status(201).json({ status: result.status, status_detail: result.status_detail, id: result.id });

    } catch (error) {
        console.error("Error processing Mercado Pago payment! 🔴", error);
        res.status(500).json({ error: error.message, details: error.cause || "Internal Server Error" });
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