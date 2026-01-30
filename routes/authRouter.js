// Express y Router
const express = require("express")
const authRouter = express.Router()
// Firebase
const auth = require("../config/firebase")
// Models
const Audit = require("../models/AuditSchema")
const Contact = require("../models/ContactSchema")
// Middlewares



module.exports = authRouter