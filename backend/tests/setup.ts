import path from "node:path";
import dotenv from "dotenv";

// Loaded before any test file imports src/config/env.ts, so its own
// `import "dotenv/config"` (which loads backend/.env) sees these values
// already set and leaves them alone — dotenv never overrides existing
// process.env keys by default.
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
