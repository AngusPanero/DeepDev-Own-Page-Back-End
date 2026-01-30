const admin = require("../config/firebase")

const verifyToken = async (req, res, next) => {
    try {
        const token = 
        req.cookie?.idToken || // NAVEGADOR
        req.headers.authorization?.split(" ")[1]; // POSTMAN

        if(!token){
            return res.status(401).json({ message: "No credentials! 🔴" })
        }

        const decoded = await auth.verifyIdToken(token)
        req.user = decoded // Le doy al user las custom claims verificadas

    } catch (error) {
        console.error("Unauthorized 🔴", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
}

module.exports = verifyToken