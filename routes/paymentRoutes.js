// Express y Router
const express = require("express")
const paymentsRouter = express.Router()
// Mongo
const PaymentsMongo = require("../models/Payments")

const esProduccion = (process.env.NODE_ENV === 'production');

paymentsRouter.post("/tickets", async (req, res) => {
    const { email } = req.body
    
    if(!email){
        return res.status(400).json({ message: "All fields are required! 🔴" })
    }
    try {
        const payments = await PaymentsMongo.find({ email: email })
        if(!payments){
            return res.status(404).json({ message: "Cannot find availiable tickets! 🔴" })
        }
        return res.status(200).json(payments)
    } catch (error) {
        console.error(esProduccion ? "Error gettings tickets! 🔴" : "Error getting tickets!", error)
        res.status(500).json({ message: "Error gettings tickets! 🔴" })
    }
})

// Test
/* paymentsRouter.post("/test-payment", async (req, res) => {
    const { 
        token, 
        issuer_id, 
        payment_method_id, 
        transaction_amount, 
        installments, 
        payer, 
        idempotencyKey,
        plan 
    } = req.body;

    console.log("🧪 SIMULACIÓN: Iniciando prueba de guardado para:", plan);

    try {
        // Simulamos la respuesta que nos daría Mercado Pago (result)
        const fakeMPResult = {
            id: "fake-mp-id-" + Math.floor(Math.random() * 1000000),
            status: "approved",
            status_detail: "accredited"
        };

        console.log("🧪 SIMULACIÓN: Generado ID falso:", fakeMPResult.id);

        // 2. Guardar en MongoDB usando tu Schema real
        const nuevoPago = new PaymentsMongo({
            orderId: idempotencyKey || `TEST-ORD-${Date.now()}`, 
            client_id: payer?.id_internal || "test-client-id", 
            email: payer?.email || "test@email.com",
            plan: plan || "Landing Pro", // Debe coincidir con tu enum
            amount: Number(transaction_amount) || 0,
            mp_payment_id: fakeMPResult.id,     
            status: fakeMPResult.status,
            date: new Date()
        });

        await nuevoPago.save();
        
        console.log("✅ SIMULACIÓN: Pago guardado en Mongo correctamente.");

        // Respondemos con la misma estructura que la ruta original
        res.status(200).json({ 
            message: "Simulación de pago exitosa",
            status: fakeMPResult.status, 
            status_detail: fakeMPResult.status_detail, 
            id: fakeMPResult.id 
        });

    } catch (error) {
        console.error("❌ SIMULACIÓN ERROR:", error.message);
        res.status(500).json({ 
            error: "Error en la simulación", 
            details: error.message 
        });
    }
}); */

module.exports = paymentsRouter