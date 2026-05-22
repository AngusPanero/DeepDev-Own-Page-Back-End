const express         = require("express");
const multer          = require("multer");
const adminMiddleware = require("../middleware/adminMiddleware");
const Brevo           = require("@getbrevo/brevo");

const businessRouter = express.Router();

// ─── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// ─── Brevo API client singleton ───────────────────────────────────────────────
let _brevoApi = null;

function getBrevoApi() {
    if (_brevoApi) return _brevoApi;

    const apiKey = process.env.BREVO_API_KEY;
    console.log(`[brevo] BREVO_API_KEY=${apiKey ? "✓ set (***)" : "✗ MISSING"}`);
    if (!apiKey) throw new Error("BREVO_API_KEY no está definida");

    const client = Brevo.ApiClient.instance;
    client.authentications["api-key"].apiKey = apiKey;
    _brevoApi = new Brevo.TransactionalEmailsApi();

    console.log("[brevo] Cliente API creado (singleton)");
    return _brevoApi;
}

// ─── Email helpers ────────────────────────────────────────────────────────────
const EMAIL_REGEX_STR   = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";
const IGNORED_DOMAINS   = ["xxx.com"];
const PERSONAL_DOMAINS  = ["gmail.com","hotmail.com","yahoo.com","outlook.com","live.com","icloud.com","protonmail.com","hotmail.com.ar"];
const PRIORITY_PREFIXES = ["info@","contacto@","contact@","hola@","ventas@","admin@","consultas@","atencion@","reservas@"];

function extractEmails(html) {
    const regex = new RegExp(EMAIL_REGEX_STR, "gi");
    return [...new Set(html.match(regex) ?? [])];
}

function isValidBusinessEmail(email) {
    const lower  = email.toLowerCase();
    const domain = lower.split("@")[1];
    if (!domain) return false;
    if (IGNORED_DOMAINS.includes(domain))  return false;
    if (PERSONAL_DOMAINS.includes(domain)) return false;
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
            signal:  controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ContactBot/1.0)", "Accept": "text/html" },
        });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const html   = await response.text();
        const emails = extractEmails(html).filter(isValidBusinessEmail);
        if (!emails.length) return null;
        return emails.find(e => PRIORITY_PREFIXES.some(p => e.toLowerCase().startsWith(p))) ?? emails[0];
    } catch (err) {
        clearTimeout(timeout);
        console.warn(`[scrapeEmail] ${err.name === "AbortError" ? "Timeout" : "Error"}: ${url}`);
        return null;
    }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
function buildPresentationHtml(introText) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>DeepDev Studio</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Montserrat',Georgia,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#ffffff;padding:48px 40px 52px;">
<tr>
  <td style="max-width:560px;">
    <p style="font-family:'Montserrat',Georgia,sans-serif;font-size:15px;font-weight:400;
              color:#111111;line-height:1.85;margin:0;">${
        introText
            ? introText.replace(/\n/g, "<br/>")
            : "Hola,<br/><br/>Me comunico desde DeepDev Studio. Somos un estudio de desarrollo web full stack especializado en sitios web, aplicaciones móviles e integraciones de inteligencia artificial — con presencia en Argentina y España.<br/><br/>Si en algún momento necesitás renovar tu presencia digital, lanzar un nuevo producto o automatizar algún proceso, estamos disponibles para charlar sin compromiso.<br/><br/>Saludos,"
    }</p>
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
                    letter-spacing:-0.5px;color:#0a192f;margin:0 0 3px;line-height:1;">
            Deep<span style="color:#0062FF;">Dev</span></p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:8px;font-weight:600;
                    letter-spacing:0.3em;text-transform:uppercase;color:rgba(10,25,47,0.4);margin:0;">Studio</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:500;
                    letter-spacing:0.18em;text-transform:uppercase;
                    color:rgba(10,25,47,0.35);margin:0;line-height:1.6;">
            Desarrollo Web &amp; Mobile<br/>Inteligencia Artificial · Automatización</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="border-top:1px solid rgba(0,98,255,0.15);"></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="vertical-align:top;width:55%;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Contacto</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:400;
                    color:#0a192f;margin:0;line-height:2;">
            <a href="https://www.deepdev.com.ar" style="color:#0a192f;text-decoration:none;font-weight:500;">www.deepdev.com.ar</a><br/>
            <a href="mailto:deepdevsolutions@gmail.com" style="color:#0a192f;text-decoration:none;">deepdevsolutions@gmail.com</a><br/>
            <a href="tel:+34622777426" style="color:#0a192f;text-decoration:none;">+34 622 777 426 · España</a><br/>
            <a href="tel:+5491171187463" style="color:#0a192f;text-decoration:none;">+54 9 11 7118 7463 · Argentina</a>
          </p>
        </td>
        <td style="vertical-align:top;padding-left:32px;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Estudio</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:300;
                    color:rgba(10,25,47,0.65);line-height:1.75;margin:0;">
            Estudio boutique de desarrollo digital con base en Argentina y España.
            Especializados en productos web y mobile de alto rendimiento,
            integraciones de IA y automatización de procesos a medida.</p>
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
            © ${year} DeepDev Studio · Todos los derechos reservados</p>
        </td>
        <td style="text-align:right;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:400;
                    letter-spacing:0.08em;text-transform:uppercase;
                    color:rgba(10,25,47,0.25);margin:0;">Argentina · España</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</body>
</html>`;
}

// ─── /api/scrape-email ────────────────────────────────────────────────────────
businessRouter.post("/api/scrape-email", adminMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string")
        return res.status(400).json({ error: "Se requiere 'url'" });
    let parsed;
    try { parsed = new URL(url); } catch {
        return res.status(400).json({ error: "URL inválida" });
    }
    if (!["http:","https:"].includes(parsed.protocol))
        return res.status(400).json({ error: "Solo http o https" });
    const email = await fetchEmailFromUrl(url);
    return res.json({ email });
});

// ─── /api/send-bulk-email ─────────────────────────────────────────────────────
businessRouter.post(
    "/api/send-bulk-email",
    adminMiddleware,
    upload.array("attachments", 5),
    async (req, res) => {
        const { email, subject, message } = req.body;

        console.log(`[send-bulk-email] TO=${email} | SUBJECT=${subject} | FILES=${req.files?.length ?? 0}`);

        if (!email || !subject)
            return res.status(400).json({ message: "Faltan email y/o subject" });

        let api;
        try {
            api = getBrevoApi();
        } catch (err) {
            console.error("[send-bulk-email] Brevo init error:", err.message);
            return res.status(500).json({ message: "Error interno del servidor" });
        }

        // Construir adjuntos para Brevo API (base64)
        const attachment = (req.files ?? []).map(f => ({
            name:    f.originalname,
            content: f.buffer.toString("base64"),
        }));

        try {
            const result = await api.sendTransacEmail({
                sender:      { email: "aguspanero@gmail.com", name: "DeepDev Studio" },
                to:          [{ email }],
                subject,
                htmlContent: buildPresentationHtml(message || ""),
                attachment:  attachment.length > 0 ? attachment : undefined,
            });
            console.log(`[send-bulk-email] OK → ${email} | messageId: ${result.messageId}`);
            res.json({ ok: true });
        } catch (err) {
            console.error(`[send-bulk-email] FAILED → ${email}:`, err.message);
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
);

module.exports = businessRouter;

/* const express         = require("express");
const nodemailer      = require("nodemailer");
const multer          = require("multer");
const adminMiddleware = require("../middleware/adminMiddleware");

const businessRouter = express.Router();

// ─── Multer — límites conservadores ──────────────────────────────────────────
// 5 archivos max, 5 MB cada uno = 25 MB RAM máximo por request
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// ─── Transporter singleton — se crea una sola vez al arrancar ─────────────────
let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    const user = process.env.TICKETS_EMAIL_FROM;
    const pass = process.env.TICKETS_PASS_EMAIL;

    console.log(`[mailer] TICKETS_EMAIL_FROM=${user ? "✓ (" + user + ")" : "✗ MISSING"}`);
    console.log(`[mailer] TICKETS_PASS_EMAIL=${pass ? "✓ (***)" : "✗ MISSING"}`);

    if (!user || !pass) {
        throw new Error("TICKETS_EMAIL_FROM o TICKETS_PASS_EMAIL no están definidas");
    }

    _transporter = nodemailer.createTransport({
        host:   "smtp.gmail.com",
        port:   587,
        secure: false,                   // STARTTLS
        auth:   { user, pass },
        pool:   true,                    // reutiliza conexiones TCP
        maxConnections: 3,               // máximo 3 conexiones paralelas a Gmail
        maxMessages:    50,              // resetea la conexión cada 50 mensajes
        tls:    { rejectUnauthorized: false },
    });

    console.log("[mailer] Transporter creado (singleton)");
    return _transporter;
}

// Verificar SMTP al arrancar el servidor, no en cada request
(async () => {
    try {
        const t = getTransporter();
        await t.verify();
        console.log("[mailer] SMTP verify: OK — listo para enviar");
    } catch (err) {
        console.error("[mailer] SMTP verify FAILED al arrancar:", err.message);
        // No tiramos — el servidor sigue funcionando para las otras rutas
        _transporter = null; // forzar reintento en el próximo request
    }
})();

// ─── Email helpers ────────────────────────────────────────────────────────────

// Sin flag /g para evitar estado interno entre llamadas
const EMAIL_REGEX_STR   = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";
const IGNORED_DOMAINS   = ["xxx.com"];
const PERSONAL_DOMAINS  = ["gmail.com","hotmail.com","yahoo.com","outlook.com","live.com","icloud.com","protonmail.com","hotmail.com.ar"];
const PRIORITY_PREFIXES = ["info@","contacto@","contact@","hola@","ventas@","admin@","consultas@","atencion@","reservas@"];

function extractEmails(html) {
    // Creamos la regex fresh cada vez — sin estado interno
    const regex = new RegExp(EMAIL_REGEX_STR, "gi");
    const matches = html.match(regex) ?? [];
    return [...new Set(matches)];
}

function isValidBusinessEmail(email) {
    const lower  = email.toLowerCase();
    const domain = lower.split("@")[1];
    if (!domain) return false;
    if (IGNORED_DOMAINS.includes(domain))  return false;
    if (PERSONAL_DOMAINS.includes(domain)) return false;
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
            signal:  controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ContactBot/1.0)", "Accept": "text/html" },
        });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const html   = await response.text();
        const emails = extractEmails(html).filter(isValidBusinessEmail);
        if (!emails.length) return null;
        return emails.find(e => PRIORITY_PREFIXES.some(p => e.toLowerCase().startsWith(p))) ?? emails[0];
    } catch (err) {
        clearTimeout(timeout);
        console.warn(`[scrapeEmail] ${err.name === "AbortError" ? "Timeout" : "Error"}: ${url}`);
        return null;
    }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildPresentationHtml(introText) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>DeepDev Studio</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Montserrat',Georgia,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#ffffff;padding:48px 40px 52px;">
<tr>
  <td style="max-width:560px;">
    <p style="font-family:'Montserrat',Georgia,sans-serif;font-size:15px;font-weight:400;
              color:#111111;line-height:1.85;margin:0;">${
        introText
            ? introText.replace(/\n/g, "<br/>")
            : "Hola,<br/><br/>Me comunico desde DeepDev Studio. Somos un estudio de desarrollo web full stack especializado en sitios web, aplicaciones móviles e integraciones de inteligencia artificial — con presencia en Argentina y España.<br/><br/>Si en algún momento necesitás renovar tu presencia digital, lanzar un nuevo producto o automatizar algún proceso, estamos disponibles para charlar sin compromiso.<br/><br/>Saludos,"
    }</p>
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
                    letter-spacing:-0.5px;color:#0a192f;margin:0 0 3px;line-height:1;">
            Deep<span style="color:#0062FF;">Dev</span></p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:8px;font-weight:600;
                    letter-spacing:0.3em;text-transform:uppercase;color:rgba(10,25,47,0.4);margin:0;">Studio</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:500;
                    letter-spacing:0.18em;text-transform:uppercase;
                    color:rgba(10,25,47,0.35);margin:0;line-height:1.6;">
            Desarrollo Web &amp; Mobile<br/>Inteligencia Artificial · Automatización</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="border-top:1px solid rgba(0,98,255,0.15);"></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="vertical-align:top;width:55%;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Contacto</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:400;
                    color:#0a192f;margin:0;line-height:2;">
            <a href="https://www.deepdev.com.ar" style="color:#0a192f;text-decoration:none;font-weight:500;">www.deepdev.com.ar</a><br/>
            <a href="mailto:deepdevsolutions@gmail.com" style="color:#0a192f;text-decoration:none;">deepdevsolutions@gmail.com</a><br/>
            <a href="tel:+34622777426" style="color:#0a192f;text-decoration:none;">+34 622 777 426 · España</a><br/>
            <a href="tel:+5491171187463" style="color:#0a192f;text-decoration:none;">+54 9 11 7118 7463 · Argentina</a>
          </p>
        </td>
        <td style="vertical-align:top;padding-left:32px;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;
                    letter-spacing:0.14em;text-transform:uppercase;
                    color:rgba(10,25,47,0.4);margin:0 0 10px;">Estudio</p>
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:300;
                    color:rgba(10,25,47,0.65);line-height:1.75;margin:0;">
            Estudio boutique de desarrollo digital con base en Argentina y España.
            Especializados en productos web y mobile de alto rendimiento,
            integraciones de IA y automatización de procesos a medida.</p>
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
            © ${year} DeepDev Studio · Todos los derechos reservados</p>
        </td>
        <td style="text-align:right;">
          <p style="font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:400;
                    letter-spacing:0.08em;text-transform:uppercase;
                    color:rgba(10,25,47,0.25);margin:0;">Argentina · España</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</body>
</html>`;
}

// ─── /api/scrape-email ────────────────────────────────────────────────────────

businessRouter.post("/api/scrape-email", adminMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string")
        return res.status(400).json({ error: "Se requiere 'url'" });
    let parsed;
    try { parsed = new URL(url); } catch {
        return res.status(400).json({ error: "URL inválida" });
    }
    if (!["http:","https:"].includes(parsed.protocol))
        return res.status(400).json({ error: "Solo http o https" });

    const email = await fetchEmailFromUrl(url);
    return res.json({ email });
});

// ─── /api/send-bulk-email ─────────────────────────────────────────────────────

businessRouter.post(
    "/api/send-bulk-email",
    adminMiddleware,
    upload.array("attachments", 5),
    async (req, res) => {
        const { email, subject, message } = req.body;

        console.log(`[send-bulk-email] TO=${email} | SUBJECT=${subject} | FILES=${req.files?.length ?? 0}`);

        if (!email || !subject)
            return res.status(400).json({ message: "Faltan email y/o subject" });

        let transporter;
        try {
            transporter = getTransporter();
        } catch (err) {
            console.error("[send-bulk-email] Transporter error:", err.message);
            return res.status(500).json({ message: "Error interno del servidor" });
        }

        const attachments = (req.files ?? []).map(f => ({
            filename:    f.originalname,
            content:     f.buffer,
            contentType: f.mimetype,
        }));

        try {
            const info = await transporter.sendMail({
                from:    process.env.TICKETS_EMAIL_FROM,
                to:      email,
                subject,
                html:    buildPresentationHtml(message || ""),
                attachments,
            });
            console.log(`[send-bulk-email] OK → ${email} | ${info.messageId}`);
            res.json({ ok: true });
        } catch (err) {
            console.error(`[send-bulk-email] FAILED → ${email}:`, err.message);
            // Si la conexión falló, resetear singleton para forzar reconexión
            _transporter = null;
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
);

module.exports = businessRouter; */