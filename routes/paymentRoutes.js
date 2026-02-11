// Express y Router
const express = require("express")
const paymentsRouter = express.Router()
// Mongo
const PaymentsMongo = require("../models/Payments")

paymentsRouter.post("/tickets", async (req, res) => {
    const { email } = req.body
    console.log(req.body)
    
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
        console.error("Error gettings tickets! 🔴")
        res.status(500).json({ message: "Error gettings tickets! 🔴" })
    }
})

// Test
/* paymentsRouter.post("/test-payment", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey } = req.body;

    const nuevoPago = new PaymentsMongo({
            orderId: idempotencyKey,
            client_id: payer.id_internal, 
            email: payer.email,
            plan: "Landing Pro",          
            amount: Number(transaction_amount),
            mp_payment_id: result.id,     
            status: result.status,
            date: new Date()
    });
    await nuevoPago.save();
    res.status(200).json({ message: "Payment Hecho" })
}) */

module.exports = paymentsRouter