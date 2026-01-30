require("dotenv").config()
const mongoose = require("mongoose")

const dbConnection = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log(`DB connected successfully! 🟢`);
        
    } catch (error) {
        console.error(`Error connecting DB! 🔴 ${error}`);
        throw new Error(`Error connecting DB! 🔴 ${error}`);
    }
}

module.exports = dbConnection