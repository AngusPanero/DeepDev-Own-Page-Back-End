require("dotenv").config()
const express = require("express")
const nodemailer = require("nodemailer")

const mailRouter = express.Router()

mailRouter.post("/send-email", async (req, res) => {
    const { name, lastName, companyName, contactRole, email, phone, projectOption, typeOfWork, currentUrl, description, projectGoal, budgetRange, availableTime } = req.body
    
    if(!name || !lastName || !companyName || !contactRole || !email || !phone || !projectOption || !typeOfWork || !description || !projectGoal || !budgetRange || !availableTime){
        return res.status(400).json({ message: "All required fields must be filled! 🔴" })
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_FROM,
            pass: process.env.PASS_EMAIL
        }
    })

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO, // A dónde querés que llegue el Mail
        subject: `Nueva Consulta De Proyecto.`,
        html: `<!DOCTYPE html>
<html>
<head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0f172a;
            --card-bg: #1e293b;
            --accent: #8e2de2;
            --text-main: #ffffff; /* Blanco puro para máxima lectura */
            --text-dim: #94a3b8;  /* Gris azulado claro para textos secundarios */
            --border: rgba(142, 45, 226, 0.4);
        }

        body {
            margin: 0; padding: 0;
            font-family: 'Montserrat', 'Inter', -apple-system, sans-serif;
            background-color: #020617; /* Fondo exterior más profundo para resaltar la card */
            color: var(--text-main);
        }

        .wrapper {
            width: 100%;
            padding: 40px 0;
            display: flex;
            justify-content: center;
        }

        .sales-card-isolated {
            max-width: 600px;
            margin: 0 auto;
            background-color: #0f172a; /* Fondo de la card un poco más claro que el body */
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
            border: 1px solid var(--border);
        }

        .sales-mac-header {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mac-dots { display: flex; gap: 8px; }
        .m-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .m-red { background: #ff5f56; }
        .m-yellow { background: #ffbd2e; }
        .m-green { background: #27c93f; }

        .mac-filename {
            margin-left: 15px;
            font-size: 12px;
            font-family: 'Fira Code', monospace;
            color: var(--text-dim);
        }

        .content { padding: 35px; }

        .sales-plan-name {
            color: #ffffff;
            font-size: 26px; /* Un poco más grande para jerarquía */
            font-weight: 800;
            margin: 0 0 10px 0;
        }

        .badge {
            display: inline-block;
            background: rgba(142, 45, 226, 0.2);
            color: #d8b4fe;
            padding: 6px 14px;
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 25px;
        }

        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .data-table td { 
            padding: 14px 0; 
            border-bottom: 1px solid rgba(255,255,255,0.08); 
            font-size: 14px; 
        }
        
        .label { 
            color: #c084fc; /* Violeta más claro para que se lea mejor en fondo oscuro */
            font-weight: 700; 
            width: 35%; 
            text-transform: uppercase; 
            font-size: 10px; 
            letter-spacing: 1px;
            font-family: 'Fira Code', monospace;
        }
        
        .value { color: #f1f5f9; font-weight: 500; }
        .highlight { color: #4ade80; font-weight: 700; } /* Verde neón más brillante */

        .description-box {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 8px;
            border: 1px dashed rgba(142, 45, 226, 0.5);
            color: #cbd5e1; /* Gris claro para el cuerpo del mensaje */
            font-size: 14px;
            line-height: 1.6;
            margin-top: 10px;
        }

        .footer-info { 
            background-color: rgba(0, 0, 0, 0.4); 
            padding: 25px; 
            text-align: center; 
            color: var(--text-dim); 
            font-size: 11px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="sales-card-isolated">
            <div class="sales-mac-header">
                <div class="mac-dots">
                    <span class="m-dot m-red"></span>
                    <span class="m-dot m-yellow"></span>
                    <span class="m-dot m-green"></span>
                </div>
                <p class="mac-filename">incoming_request.json</p>
            </div>

            <div class="content">
                <div class="badge">Nuevo Ticket de Proyecto</div>
                <h1 class="sales-plan-name">Detalles de la Consulta</h1>
                
                <table class="data-table">
                    <tr><td class="label">Cliente</td><td class="value">${name} ${lastName}</td></tr>
                    <tr><td class="label">Empresa</td><td class="value">${companyName} <span style="color: #94a3b8; font-size: 12px;">(${contactRole})</span></td></tr>
                    <tr><td class="label">Email</td><td class="value" style="color: #38bdf8;">${email}</td></tr>
                    <tr><td class="label">Tipo</td><td class="value">${projectOption}</td></tr>
                    <tr><td class="label">Presupuesto</td><td class="value highlight">${budgetRange}</td></tr>
                    <tr><td class="label">Timeline</td><td class="value">${availableTime}</td></tr>
                </table>

                <div class="label" style="margin-bottom: 8px;">Resumen del Objetivo:</div>
                <div class="value" style="margin-bottom: 25px; font-size: 15px; border-left: 3px solid var(--accent); padding-left: 15px;">
                    ${projectGoal}
                </div>

                <div class="label">Mensaje Completo:</div>
                <div class="description-box">
                    ${description}
                </div>
            </div>
            
            <div class="footer-info">
                <strong style="color: #ffffff;">SISTEMA DE CONTACTO DEEPDEV STUDIO</strong><br>
                Este correo fue enviado desde el portal oficial.<br>
                © 2026 — Built with precision.
            </div>
        </div>
    </div>
</body>
</html>`
    }
    try {
        await transporter.sendMail(mailOptions)
        res.status(200).json({ success: true, message: 'Correo enviado con éxito' })
    } catch (error) {
        console.error(`Internal error setting up mail transporter! 🔴 ${error}`);
        res.status(500).send({ message: `Internal error setting up mail transporter! 🔴 ${error}` })
    }
})

module.exports = mailRouter