const express = require('express');
const cartRouter = express.Router();
const Coupon = require("../models/CouponSchema")
const Cart = require("../models/CartSchema")
const Product = require("../models/productModel")
const mongoose = require('mongoose');   
const verifyToken = require('../middleware/authMiddleware');

const esProduccion = (process.env.NODE_ENV === 'pproduction');

// CREAR NUEVO CUPÓN
cartRouter.post("/api/coupons/create", async (req, res) => {
    const { couponData } = req.body;

    if (!couponData || typeof couponData !== 'object') {
        return res.status(400).json({ message: "Datos de cupón no proporcionados o formato inválido 🔴" });
    }

    const { code, discount, type, expiryDate } = couponData;

    if (!code || !discount || !type) {
        return res.status(400).json({ message: "Faltan campos obligatorios: code, discount y type son requeridos 🔴" });
    }

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
        return res.status(400).json({ message: "El descuento debe ser un número entre 1 y 100 🔴" });
    }

    const validTypes = ['single_use', 'date_limited'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo de cupón inválido. Use 'single_use' o 'date_limited' 🔴" });
    }

    if (type === 'date_limited') {
        if (!expiryDate) {
            return res.status(400).json({ message: "Los cupones por fecha requieren una 'expiryDate' 🔴" });
        }
        const date = new Date(expiryDate);
        if (isNaN(date.getTime()) || date <= new Date()) {
            return res.status(400).json({ message: "La fecha de expiración debe ser una fecha válida y futura 🔴" });
        }
    }

    try {
        const sanitizedCode = code.trim().toUpperCase();
        
        const exists = await Coupon.findOne({ code: sanitizedCode });
        if (exists) {
            return res.status(409).json({ message: "El código de cupón ya existe en el sistema 🔴" });
        }

        const newCoupon = await Coupon.create({
            code: sanitizedCode,
            discount: discountNum,
            type,
            expiryDate: type === 'date_limited' ? new Date(expiryDate) : null,
            isActive: true,
            usedBy: []
        });

        res.status(201).json({ message: "Cupón creado con éxito 🟢", coupon: newCoupon });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR_COUPON_CREATE:`, error);
        res.status(500).json({ message: "Error interno al procesar el cupón 🔴" });
    }
});

// VALIDAR CUPONES DESCUENTO
cartRouter.post("/api/coupons/validate", async (req, res) => {
    const { code, email } = req.body;

    const sanitizedCode = code?.toString().trim().toUpperCase();
    const sanitizedEmail = email?.toString().trim().toLowerCase();

    if (!sanitizedCode || !sanitizedEmail) {
        return res.status(400).json({ message: "Código y email son requeridos 🔴" });
    }
    try {
        const coupon = await Coupon.findOne({ code: sanitizedCode, isActive: true });

        if (!coupon) {
            return res.status(404).json({ message: "Cupón no encontrado o inactivo 🔴" });
        }

        if (coupon.type === 'date_limited' && coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: "El cupón ha expirado ⚠️" });
        }

        if (coupon.type === 'single_use' && coupon.usedBy.includes(email)) {
            return res.status(400).json({ message: "Ya has utilizado este cupón 🔴" });
        }

        res.status(200).json({ message: "Cupón aplicado con éxito 🟢", coupon: { code: coupon.code, discount: coupon.discount } });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en validar cupón cartRouter = POST :`, error);
        res.status(500).json({ message: "Error interno al validar cupón" });
    }
});

// CREAR - SINCRONIZAR CARRITO
cartRouter.post("/api/cart/sync", verifyToken, async (req, res) => {
    const { email, items, appliedCoupon } = req.body;

    const sanitizedEmail = email?.trim().toLowerCase();
    
    if (!sanitizedEmail || !Array.isArray(items)) {
        return res.status(400).json({ message: "Datos de carrito inválidos 🔴" });
    }

    if (req.user.email !== sanitizedEmail) {
        return res.status(403).json({ message: "No tienes permiso para sincronizar este carrito 🔴" });
    }

    if (items.length > 100) {
        return res.status(400).json({ message: "El carrito excede el límite de ítems 🔴" });
    }

    try {
        await Cart.findOneAndUpdate(
            { userEmail: sanitizedEmail },
            { items, appliedCoupon },
            { upsert: true, new: true }
        );
        res.status(200).json({ message: "Carrito sincronizado ✅" });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en sincronizar carrito cartRouter = POST :`, error);
        res.status(500).json({ message: "Error al sincronizar carrito" });}
});

// OBTENER CARRITO
cartRouter.get("/api/cart/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    try {
        
        const cart = await Cart.findOne({ userEmail: email.toLowerCase() })
                               .populate('items.productId'); 
        
        if (!cart) return res.status(200).json({ items: [], appliedCoupon: null });

        
        const updatedItems = cart.items.map(item => {
            const realProduct = item.productId; 
            let alert = null;

            if (!realProduct || realProduct.stock <= 0) {
                alert = "Producto agotado";
            } else if (item.cantidad > realProduct.stock) {
                alert = `Stock reducido a ${realProduct.stock} unidades`;
                item.cantidad = realProduct.stock; 
            }

            return { ...item._doc,productId: realProduct._id, stockMax: realProduct.stock, alert };
        });

        res.status(200).json({ message: "Carrito verificado con éxito 🟢", items: updatedItems, appliedCoupon: cart.appliedCoupon });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en obtener carrito cartRouter = GET :`, error);
        res.status(500).json({ message: "Error al recuperar el carrito 🔴" });
    }
});

// DELETE CARRITO POST CHECKOUT
cartRouter.delete("/api/cart/clear/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    try {
        if (req.user.email !== req.params.email) {
            return res.status(403).json({ message: "No tienes permiso para vaciar este carrito 🔴" });
        }
        await Cart.findOneAndDelete({ userEmail: email.toLowerCase() });
        res.status(200).json({ message: "Carrito vaciado correctamente 🟢" });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR DELETE CART:`, error);
        res.status(500).json({ message: "Error al vaciar el carrito 🔴" });
    }
});

//  CHECKOUT SUCCESS
cartRouter.post("/api/checkout/success", verifyToken, async (req, res) => {
    const { email, couponCode, items } = req.body; 
    const sanitizedEmail = email.toLowerCase();

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No hay productos para procesar 🔴" });
    }
    try {
        const stockOperations = items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { stock: -item.cantidad } } 
            }
        }));
        await Product.bulkWrite(stockOperations);
        if (couponCode) {
            await Coupon.findOneAndUpdate(
                { code: couponCode.toUpperCase(), type: 'single_use' },
                { $addToSet: { usedBy: sanitizedEmail } }
            );
        }
        await Cart.findOneAndDelete({ userEmail: sanitizedEmail });
        res.status(200).json({ message: "Compra procesada: Stock actualizado y carrito limpio 🟢" });

    } catch (error) {
        console.error("ERROR EN CHECKOUT SUCCESS:", error);
        res.status(500).json({ message: "Error crítico al finalizar la compra 🔴" });
    }
});

module.exports = cartRouter