const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
const { createRemoteJWKSet, jwtVerify } = require("jose");

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FRONTEND_ORIGIN,
  PORT = 5000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const jwks = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

const verifySupabaseToken = async (token) => {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${SUPABASE_URL}/auth/v1`,
    audience: "authenticated",
  });
  return payload;
};

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "thodemy-auth", timestamp: new Date().toISOString() });
});

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing bearer token" });
    }

    const payload = await verifySupabaseToken(token);
    req.auth = payload;
    return next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

app.get("/me", authLimiter, requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, created_at, updated_at")
      .eq("id", req.auth.sub)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Profile fetch error:", error.message);
      return res.status(500).json({ message: "Unable to load profile" });
    }

    return res.json({
      user: {
        id: req.auth.sub,
        email: req.auth.email,
      },
      profile: data || null,
    });
  } catch (error) {
    console.error("Unexpected /me error:", error.message);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
