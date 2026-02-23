const auth = require("../config/firebase")

const esProduccion = (process.env.NODE_ENV === 'production');

const adminMiddleware = async (req, res, next) => {
    // 1. Extraer la cookie (asegúrate de usar 'cookie-parser' en tu app.js)
    const sessionCookie = req.cookies.session || "";

    if(!sessionCookie){
            return res.status(401).json({ message: "No credentials! 🔴" })
        }
    try {
        // 2. Verificar la cookie de sesión de Firebase
        // checkRevoked: true verifica si la sesión fue cerrada
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        // 3. Chequear el custom claim de admin
        if (decodedClaims.admin === true) {
            req.user = decodedClaims;
            next();
        } else {
            return res.status(403).json({ message: "ACCESS_DENIED: ADMIN_ONLY_ZONE 🔴" });
        }
    } catch (error) {
        console.error(esProduccion ? `Unauthorized! 🔴`: `Unauthorized! 🔴 ${error}`);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = adminMiddleware