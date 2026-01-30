const rateLimit = require("express-rate-limir")

const loginLimiter = rateLimit({
    windows: 15 * 60 * 1000, // 15 min
    max: 50, // limite por ip
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Comportamiento sospechoso... Demasiadas solicitudes, intentá más tarde"
    }
})

module.exports = loginLimiter