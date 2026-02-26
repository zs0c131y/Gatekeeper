/**
 * /api/user – profile data, preferences and avatar for the logged-in user.
 *
 * Authentication is validated via better-auth sessions (requireJWT middleware).
 * User profile records in the Mongoose User model are looked up by their
 * better-auth session email and upserted lazily on first access.
 *
 * NOTE: password changes and the core sign-in / sign-out flow are now
 *       handled by the better-auth handler mounted at /api/auth/*.
 */

const express = require("express");

const User = require("../models/User");
const { requireJWT } = require("../middleware/auth");
const {
  validateUpdateProfile,
  validateUpdatePreferences,
  validateUpdateAvatar,
  handleValidationErrors,
} = require("../middleware/validate");

const router = express.Router();

const AVATAR_DATA_URL_RE =
  /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function getDefaultPreferences() {
  return { emailAlerts: true, liveDashboard: true, compactTables: false };
}

function normalizePreferences(preferences) {
  const d = getDefaultPreferences();
  return {
    emailAlerts:
      typeof preferences?.emailAlerts === "boolean"
        ? preferences.emailAlerts
        : d.emailAlerts,
    liveDashboard:
      typeof preferences?.liveDashboard === "boolean"
        ? preferences.liveDashboard
        : d.liveDashboard,
    compactTables:
      typeof preferences?.compactTables === "boolean"
        ? preferences.compactTables
        : d.compactTables,
  };
}

function buildAvatarDataUrl(avatar) {
  if (!avatar?.data || !avatar?.mimeType) return null;
  return `data:${avatar.mimeType};base64,${avatar.data}`;
}

/** Serialize the User model document for API responses. */
function serializeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    lastLogin: user.lastLogin,
    avatarDataUrl: buildAvatarDataUrl(user.avatar),
    preferences: normalizePreferences(user.preferences),
  };
}

/**
 * Find the User profile record for the session user, creating it lazily if
 * it does not exist yet (first login after migrating to better-auth).
 */
async function resolveOrCreateProfile(sessionUser) {
  let user = await User.findOne({ email: sessionUser.email });
  if (!user) {
    user = await User.create({
      username: sessionUser.name || sessionUser.email.split("@")[0],
      email: sessionUser.email,
      // passwordHash not used — authentication is handled by better-auth
      passwordHash: "managed-by-better-auth",
      role: sessionUser.role || "viewer",
    });
  }
  return user;
}

// ── GET /api/user/me ──────────────────────────────────────────────────────────

router.get(
  "/me",
  requireJWT,
  asyncHandler(async (req, res) => {
    const user = await resolveOrCreateProfile(req.user);
    // Merge the role from the better-auth session (source of truth for auth)
    user.role = req.user.role || user.role;
    res.json(serializeUser(user));
  }),
);

// ── PUT /api/user/profile ─────────────────────────────────────────────────────

router.put(
  "/profile",
  requireJWT,
  validateUpdateProfile,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const hasUsername = typeof req.body.username === "string";
    const hasEmail = typeof req.body.email === "string";

    if (!hasUsername && !hasEmail) {
      return res
        .status(400)
        .json({
          error: "At least one field is required",
          code: "VALIDATION_ERROR",
        });
    }

    const user = await resolveOrCreateProfile(req.user);

    const nextUsername = hasUsername
      ? req.body.username.trim().toLowerCase()
      : user.username;
    const nextEmail = hasEmail
      ? req.body.email.trim().toLowerCase()
      : user.email;

    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ username: nextUsername }, { email: nextEmail }],
    }).lean();

    if (duplicate) {
      const field = duplicate.email === nextEmail ? "email" : "username";
      return res
        .status(409)
        .json({
          error: `A user with that ${field} already exists`,
          code: "USER_EXISTS",
        });
    }

    user.username = nextUsername;
    user.email = nextEmail;
    await user.save();

    res.json(serializeUser(user));
  }),
);

// ── GET /api/user/preferences ─────────────────────────────────────────────────

router.get(
  "/preferences",
  requireJWT,
  asyncHandler(async (req, res) => {
    const user = await resolveOrCreateProfile(req.user);
    res.json(normalizePreferences(user.preferences));
  }),
);

// ── PUT /api/user/preferences ─────────────────────────────────────────────────

router.put(
  "/preferences",
  requireJWT,
  validateUpdatePreferences,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const allowed = ["emailAlerts", "liveDashboard", "compactTables"];
    const payload = {};

    allowed.forEach((key) => {
      if (typeof req.body[key] === "boolean") payload[key] = req.body[key];
    });

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({
          error: "At least one preference field is required",
          code: "VALIDATION_ERROR",
        });
    }

    const user = await resolveOrCreateProfile(req.user);
    user.preferences = {
      ...normalizePreferences(user.preferences),
      ...payload,
    };
    await user.save();

    res.json(serializeUser(user));
  }),
);

// ── PUT /api/user/avatar ──────────────────────────────────────────────────────

router.put(
  "/avatar",
  requireJWT,
  validateUpdateAvatar,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const shouldClear = req.body.clear === true;
    const avatarDataUrl =
      typeof req.body.avatarDataUrl === "string" ? req.body.avatarDataUrl : "";

    if (!shouldClear && !avatarDataUrl) {
      return res
        .status(400)
        .json({
          error: "avatarDataUrl is required unless clear=true",
          code: "VALIDATION_ERROR",
        });
    }

    const user = await resolveOrCreateProfile(req.user);

    if (shouldClear) {
      user.avatar = undefined;
      await user.save();
      return res.json(serializeUser(user));
    }

    const match = avatarDataUrl.match(AVATAR_DATA_URL_RE);
    if (!match) {
      return res
        .status(400)
        .json({ error: "Invalid avatar format", code: "VALIDATION_ERROR" });
    }

    const mimeType = `image/${match[1]}`;
    const base64Data = match[2];
    const estimatedBytes = Math.floor((base64Data.length * 3) / 4);

    if (estimatedBytes > 140 * 1024) {
      return res
        .status(413)
        .json({
          error: "Avatar exceeds size limit (140 KB)",
          code: "PAYLOAD_TOO_LARGE",
        });
    }

    user.avatar = { data: base64Data, mimeType, updatedAt: new Date() };
    await user.save();

    res.json(serializeUser(user));
  }),
);

module.exports = router;
