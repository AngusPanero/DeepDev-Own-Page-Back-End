const auth = require("../config/firebase");
const esProduccion = (process.env.NODE_ENV === 'production');

const adminMiddleware = async (req, res, next) => {
    // 1. Cambiamos 'session' por 'idToken' para que coincida con tu router
    const token = req.cookies.idToken; 

    if (!token) {
        return res.status(401).json({ message: "No credentials! 🔴" });
    }

    try {
        // 2. Usamos verifyIdToken porque es lo que estás guardando en la cookie
        const decodedClaims = await auth.verifyIdToken(token);
        
        // 3. Verificamos el claim de admin
        if (decodedClaims.admin === true) {
            req.user = decodedClaims;
            next();
        } else {
            return res.status(403).json({ message: "ACCESS_DENIED: ADMIN_ONLY_ZONE 🔴" });
        }
    } catch (error) {
        console.error(esProduccion ? `Unauthorized! 🔴` : `Unauthorized! 🔴 ${error}`);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = adminMiddleware;