require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { urlencoded } = require("body-parser")
const cookieParser = require("cookie-parser")
const dbConnection = require("./config/mongoose")
const authRouter = require("./routes/authRouter")
const app = express()
const PORT = process.env.PORT

app.use(urlencoded({ extended: true }))
app.use(express.json())

dbConnection()

app.use(cors({
    origin: [ "http://localhost:5173" ],
    methods: [ "GET", "POST", "PUT", "DELETE" ],
    credentials: true
}))

app.use(authRouter)

app.use((req,res) => {
    res.send(`<h1>404 - Not Found</h1>`)
})

app.listen(PORT, "0.0.0.0", (req, res) => {
    console.log(`Server listening on port http://localhost:${PORT} 🟢`)
})