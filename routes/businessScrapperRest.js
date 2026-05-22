const express         = require("express");
const nodemailer      = require("nodemailer");
const multer          = require("multer");
const adminMiddleware = require("../middleware/adminMiddleware");

const businessRouterRest = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

// ─── Email helpers ────────────────────────────────────────────────────────────

const EMAIL_REGEX       = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const IGNORED_DOMAINS   = ["xxx.com"];
const PRIORITY_PREFIXES = ["info@","contacto@","contact@","hola@","ventas@","admin@","consultas@","atencion@","reservas@","gmail.com","hotmail.com","yahoo.com","outlook.com","live.com","icloud.com","protonmail.com","hotmail.com.ar"];

function isValidBusinessEmail(email) {
    const lower = email.toLowerCase(), domain = lower.split("@")[1];
    if (!domain) return false;
    if (IGNORED_DOMAINS.includes(domain)) return false;
    if (/\.(png|jpg|gif|svg|webp)/.test(lower)) return false;
    if (email.length < 6) return false;
    return true;
}

async function fetchEmailFromUrl(url) {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    try {
        const fetchFn  = typeof fetch !== "undefined" ? fetch : require("node-fetch");
        const response = await fetchFn(url, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ContactBot/1.0)", "Accept": "text/html" },
        });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const html   = await response.text();
        const emails = [...new Set(html.match(EMAIL_REGEX) ?? [])].filter(isValidBusinessEmail);
        if (!emails.length) return null;
        return emails.find(e => PRIORITY_PREFIXES.some(p => e.toLowerCase().startsWith(p))) ?? emails[0];
    } catch (err) {
        clearTimeout(timeout);
        return null;
    }
}

// ─── Transporter — verifica config al arrancar ───────────────────────────────

function createTransporter() {
    const user = process.env.EMAIL_FROM;
    const pass = process.env.PASS_EMAIL;

    // Log en producción para confirmar que las vars existen
    console.log(`[mailer] EMAIL_FROM=${user ? "✓ set" : "✗ MISSING"}`);
    console.log(`[mailer] PASS_EMAIL=${pass ? "✓ set" : "✗ MISSING"}`);

    if (!user || !pass) {
        throw new Error("EMAIL_FROM o PASS_EMAIL no están definidas en las variables de entorno");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
        // En producción algunos servidores necesitan esto explícito
        tls: { rejectUnauthorized: false },
    });
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildPresentationHtml(introText) {
    const year = new Date().getFullYear();

    const body = introText
        ? introText.replace(/\n/g, "<br/>")
        : `Dear Hiring Manager,<br/><br/>I am writing to express my enthusiastic interest in joining your restaurant team for the upcoming summer season. I have a solid background in hospitality and customer service, and I am eager to bring my energy and dedication to your establishment.<br/><br/>I thrive in fast-paced, high-pressure environments and take genuine pride in delivering a warm and professional experience to every guest. I am adaptable, a quick learner, and fully committed to being a reliable member of your team from day one.<br/><br/>I am available to start at your earliest convenience and completely flexible with schedules and shifts. Please find my CV and Cover Letter attached — I would be glad to discuss how I can contribute to your team this season.<br/><br/>Thank you very much for your time and consideration.<br/><br/>Kind regards,<br/><br/><strong style="font-family:'Montserrat',Georgia,sans-serif;font-weight:700;color:#111111;font-size:15px;">Agustín Panero</strong><br/><br/>Phone: +34 622 777 426<br/>Email: aguspanero@gmail.com`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Agustín Panero — Job Application</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Montserrat',Georgia,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#ffffff;padding:48px 40px 52px;">
<tr>
  <td style="max-width:560px;">
    <p style="font-family:'Montserrat',Georgia,sans-serif;font-size:15px;font-weight:400;
              color:#111111;line-height:1.85;margin:0;">${body}</p>
  </td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#f4f2ff;border-top:3px solid #0062FF;">
<tr>
  <td style="padding:36px 40px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="vertical-align:top;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:20px;font-weight:900;
                    letter-spacing:-0.5px;color:#0a192f;margin:0 0 3px;line-height:1;">Agustín Panero</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:8px;font-weight:600;
                    letter-spacing:0.3em;text-transform:uppercase;color:rgba(10,25,47,0.4);margin:0;">
            Hospitality &amp; Customer Service</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:500;
                    letter-spacing:0.18em;text-transform:uppercase;
                    color:rgba(10,25,47,0.35);margin:0;line-height:1.7;">
            Available for Summer Season<br/>Spain · Open to relocation</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="border-top:1px solid rgba(0,98,255,0.15);"></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="vertical-align:top;width:50%;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Contact</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:400;
                    color:#0a192f;margin:0;line-height:2.1;">
            <a href="tel:+34622777426" style="color:#0a192f;text-decoration:none;">+34 622 777 426</a><br/>
            <a href="mailto:aguspanero@gmail.com" style="color:#0a192f;text-decoration:none;">aguspanero@gmail.com</a>
          </p>
        </td>
        <td style="vertical-align:top;padding-left:32px;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Profile</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:300;
                    color:rgba(10,25,47,0.65);line-height:1.75;margin:0;">
            Customer-oriented professional with hands-on experience in hospitality
            and service environments. Energetic, reliable, and fully committed
            to delivering outstanding guest experiences.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td style="border-top:1px solid rgba(0,98,255,0.1);"></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:400;
                    letter-spacing:0.1em;text-transform:uppercase;
                    color:rgba(10,25,47,0.3);margin:0;">
            Agustín Panero · Job Application ${year}</p>
        </td>
        <td style="text-align:right;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:400;
                    letter-spacing:0.08em;text-transform:uppercase;
                    color:rgba(10,25,47,0.25);margin:0;">Spain · Switzerland</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</body>
</html>`;
}

// ─── /api/rest/scrape-email ───────────────────────────────────────────────────

businessRouterRest.post("/api/rest/scrape-email", adminMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") return res.status(400).json({ error: "Se requiere 'url'" });
    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).json({ error: "URL inválida" }); }
    if (!["http:","https:"].includes(parsed.protocol)) return res.status(400).json({ error: "Solo http o https" });
    const email = await fetchEmailFromUrl(url);
    return res.json({ email });
});

// ─── /api/rest/send-bulk-email ────────────────────────────────────────────────

businessRouterRest.post(
    "/api/rest/send-bulk-email",
    adminMiddleware,
    upload.array("attachments", 10),
    async (req, res) => {
        const { email, subject, message } = req.body;

        console.log(`[send-bulk-email] TO=${email} | SUBJECT=${subject} | FILES=${req.files?.length ?? 0}`);

        if (!email || !subject) {
            return res.status(400).json({ message: "Faltan email y/o subject" });
        }

        let transporter;
        try {
            transporter = createTransporter();
        } catch (err) {
            console.error("[send-bulk-email] Transporter error:", err.message);
            return res.status(500).json({ message: err.message });
        }

        // Verificar conexión antes de enviar
        try {
            await transporter.verify();
            console.log("[mailer] SMTP verify: OK");
        } catch (verifyErr) {
            console.error("[mailer] SMTP verify FAILED:", verifyErr.message);
            return res.status(500).json({
                message: `Error de autenticación SMTP: ${verifyErr.message}`,
            });
        }

        const attachments = (req.files ?? []).map(f => ({
            filename:    f.originalname,
            content:     f.buffer,
            contentType: f.mimetype,
        }));

        try {
            await transporter.sendMail({
                from:    process.env.EMAIL_FROM,
                to:      email,
                subject,
                html:    buildPresentationHtml(message || ""),
                attachments,
            });
            console.log(`[send-bulk-email] OK → ${email}`);
            res.json({ ok: true });
        } catch (err) {
            console.error(`[send-bulk-email] sendMail FAILED → ${email}:`, err.message);
            res.status(500).json({ message: err.message });
        }
    }
);

module.exports = businessRouterRest;