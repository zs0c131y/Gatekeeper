/**
 * better-auth instance (lazy-initialised after DB/Redis connections are ready).
 *
 * Call  initAuth(db, redisClient)  once, after connectMongoDB() and
 * connectRedis() have completed.  Everywhere else, call getAuth() to
 * obtain the ready instance.
 */

const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { admin } = require("better-auth/plugins");
const nodemailer = require("nodemailer");

/** @type {ReturnType<typeof betterAuth> | null} */
let _auth = null;

// ── Email helper ────────────────────────────────────────────────────────────

/** Returns a nodemailer transporter configured from env vars, or null. */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  if (!transporter) {
    // Development fallback — log to console instead of sending
    console.log(
      `\n[Auth Email] To: ${to}\nSubject: ${subject}\n${text || html}\n`,
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

// ── Auth factory ────────────────────────────────────────────────────────────

/**
 * Build and store the better-auth instance.
 *
 * @param {import('mongodb').Db} db        - Native MongoDB Db instance
 *                                           (e.g. mongoose.connection.db).
 * @param {import('ioredis').Redis | null} redisClient - Optional Redis client
 *                                           for secondary session storage.
 * @returns {ReturnType<typeof betterAuth>}
 */
function initAuth(db, redisClient) {
  /** @type {import('better-auth').BetterAuthOptions['secondaryStorage'] | undefined} */
  let secondaryStorage;

  if (redisClient) {
    secondaryStorage = {
      get: async (key) => {
        const val = await redisClient.get(`ba:${key}`);
        return val;
      },
      set: async (key, value, ttl) => {
        if (ttl) {
          await redisClient.set(`ba:${key}`, value, "EX", ttl);
        } else {
          await redisClient.set(`ba:${key}`, value);
        }
      },
      delete: async (key) => {
        await redisClient.del(`ba:${key}`);
      },
    };
  }

  const trustedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

  const frontendURL =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production"
      ? process.env.BETTER_AUTH_URL || "http://localhost:3000"
      : "http://localhost:5173");

  _auth = betterAuth({
    database: mongodbAdapter(db),

    session: {
      // Sessions last 7 days; rolling window resets on each visit.
      expiresIn: 60 * 60 * 24 * 7, // 7 days (seconds)
      updateAge: 60 * 60 * 24, // refresh cookie after 1 day of activity
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // client-side cache for 5 min (reduces DB reads)
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your Gatekeeper password",
          text: `Click the link below to reset your password:\n\n${url}\n\nThis link expires in 1 hour. If you did not request a password reset, ignore this email.`,
          html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>`,
        });
      },
    },

    user: {
      deleteUser: {
        enabled: true,
      },
      // NOTE: `role` is intentionally NOT listed here as an additionalField.
      // The `admin` plugin (below) owns the `role` field.  Defining it in both
      // places causes a duplicate-field conflict in better-auth v1.x which can
      // silently break signUpEmail / signInEmail.
    },

    plugins: [
      admin({
        defaultRole: "user",
        adminRole: "admin",
      }),
    ],

    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",

    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

    trustedOrigins,

    // Redirect target after password reset — the frontend reset-password page
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your Gatekeeper account",
          text: `Verify your email address:\n\n${url}`,
          html: `<p>Verify your email address:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },

    ...(secondaryStorage && { secondaryStorage }),
  });

  return _auth;
}

/**
 * Return the initialised better-auth instance.
 * Throws if initAuth() has not been called yet.
 *
 * @returns {ReturnType<typeof betterAuth>}
 */
function getAuth() {
  if (!_auth) {
    throw new Error(
      "Auth not initialised — call initAuth() after the database connects.",
    );
  }
  return _auth;
}

module.exports = { initAuth, getAuth, sendEmail };
