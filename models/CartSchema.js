const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userEmail: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    appliedCoupon: { type: String, 
        default: null 
    }, 
    items: [
        {
            id: { type: String, required: true },
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Referencia para el Populate
            nombre: String,
            precio: Number,
            imagen: String,
            cantidad: { type: Number, min: 1 },
            stockMax: Number
        }
    ]
}, { timestamps: true });

const Cart = mongoose.model("Cart", CartSchema)

module.exports = Cart