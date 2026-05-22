const express         = require("express");
const multer          = require("multer");
const adminMiddleware = require("../middleware/adminMiddleware");

const businessRouterRest = express.Router();

// ─── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// ─── Brevo client singleton ───────────────────────────────────────────────────
let _brevoClient = null;

function getBrevoClient() {
    if (_brevoClient) return _brevoClient;

    const apiKey = process.env.BREVO_API_KEY;
    console.log(`[brevo-rest] BREVO_API_KEY=${apiKey ? "✓ set (***)" : "✗ MISSING"}`);
    if (!apiKey) throw new Error("BREVO_API_KEY no está definida");

    const { BrevoClient } = require("@getbrevo/brevo");
    _brevoClient = new BrevoClient({ apiKey });

    console.log("[brevo-rest] Cliente creado (singleton)");
    return _brevoClient;
}

// ─── Email helpers ────────────────────────────────────────────────────────────
const EMAIL_REGEX_STR   = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";
const IGNORED_DOMAINS   = ["xxx.com"];
const PRIORITY_PREFIXES = ["info@","contacto@","contact@","hola@","ventas@","admin@","consultas@","atencion@","reservas@", "gmail.com","hotmail.com","yahoo.com","outlook.com","live.com","icloud.com","protonmail.com","hotmail.com.ar"];

function extractEmails(html) {
    const regex = new RegExp(EMAIL_REGEX_STR, "gi");
    return [...new Set(html.match(regex) ?? [])];
}

function isValidBusinessEmail(email) {
    const lower  = email.toLowerCase();
    const domain = lower.split("@")[1];
    if (!domain) return false;
    if (IGNORED_DOMAINS.includes(domain))  return false;
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
        console.warn(`[scrapeEmail-rest] ${err.name === "AbortError" ? "Timeout" : "Error"}: ${url}`);
        return null;
    }
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

// ─── /api/rest/send-bulk-email ────────────────────────────────────────────────
businessRouterRest.post(
    "/api/rest/send-bulk-email",
    adminMiddleware,
    upload.array("attachments", 5),
    async (req, res) => {
        const { email, subject, message } = req.body;

        console.log(`[send-bulk-rest] TO=${email} | SUBJECT=${subject} | FILES=${req.files?.length ?? 0}`);

        if (!email || !subject)
            return res.status(400).json({ message: "Faltan email y/o subject" });

        let brevo;
        try {
            brevo = getBrevoClient();
        } catch (err) {
            console.error("[send-bulk-rest] Brevo error:", err.message);
            return res.status(500).json({ message: "Error interno del servidor" });
        }

        const attachment = (req.files ?? []).map(f => ({
            name:    f.originalname,
            content: f.buffer.toString("base64"),
        }));

        try {
            const result = await brevo.transactionalEmails.sendTransacEmail({
                sender:      { email: "aguspanero@gmail.com", name: "Agustín Panero" },
                to:          [{ email }],
                subject,
                htmlContent: buildPresentationHtml(message || ""),
                attachment:  attachment.length > 0 ? attachment : undefined,
            });
            console.log(`[send-bulk-rest] OK → ${email} | messageId: ${result.messageId}`);
            res.json({ ok: true });
        } catch (err) {
            console.error(`[send-bulk-rest] FAILED → ${email}:`, err.message);
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
);

module.exports = businessRouterRest;

/* const express         = require("express");
const nodemailer      = require("nodemailer");
const multer          = require("multer");
const adminMiddleware = require("../middleware/adminMiddleware");

const businessRouterRest = express.Router();

// ─── Multer — límites conservadores ──────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// ─── Transporter singleton ───────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    const user = process.env.TICKETS_EMAIL_FROM;
    const pass = process.env.TICKETS_PASS_EMAIL;

    console.log(`[mailer-rest] EMAIL_FROM=${user ? "✓ (" + user + ")" : "✗ MISSING"}`);
    console.log(`[mailer-rest] PASS=${pass ? "✓ (***)" : "✗ MISSING"}`);

    if (!user || !pass)
        throw new Error("TICKETS_EMAIL_FROM o TICKETS_PASS_EMAIL no están definidas");

    _transporter = nodemailer.createTransport({
        host:           "smtp.gmail.com",
        port:           587,
        secure:         false,
        auth:           { user, pass },
        pool:           true,
        maxConnections: 3,
        maxMessages:    50,
        tls:            { rejectUnauthorized: false },
    });

    console.log("[mailer-rest] Transporter creado (singleton)");
    return _transporter;
}

(async () => {
    try {
        await getTransporter().verify();
        console.log("[mailer-rest] SMTP verify: OK");
    } catch (err) {
        console.error("[mailer-rest] SMTP verify FAILED al arrancar:", err.message);
        _transporter = null;
    }
})();

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
        console.warn(`[scrapeEmail-rest] ${err.name === "AbortError" ? "Timeout" : "Error"}: ${url}`);
        return null;
    }
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

// ─── /api/rest/send-bulk-email ────────────────────────────────────────────────

businessRouterRest.post(
    "/api/rest/send-bulk-email",
    adminMiddleware,
    upload.array("attachments", 5),
    async (req, res) => {
        const { email, subject, message } = req.body;

        console.log(`[send-bulk-rest] TO=${email} | SUBJECT=${subject} | FILES=${req.files?.length ?? 0}`);

        if (!email || !subject)
            return res.status(400).json({ message: "Faltan email y/o subject" });

        let transporter;
        try {
            transporter = getTransporter();
        } catch (err) {
            console.error("[send-bulk-rest] Transporter error:", err.message);
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
            console.log(`[send-bulk-rest] OK → ${email} | ${info.messageId}`);
            res.json({ ok: true });
        } catch (err) {
            console.error(`[send-bulk-rest] FAILED → ${email}:`, err.message);
            _transporter = null; // forzar reconexión en próximo request
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
);

module.exports = businessRouterRest; */