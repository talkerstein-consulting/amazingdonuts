export function validateLocalConfig(mode, env) {
  if (!["production", "sandbox"].includes(mode)) throw new Error("HOUSE_LOCAL_MODE must be production or sandbox.");
  if (env.SQUARE_ENVIRONMENT !== mode) throw new Error("The local mode and Square environment must match.");
  for (const key of ["DATABASE_URL", "SQUARE_APPLICATION_ID", "SQUARE_LOCATION_ID", "SQUARE_ACCESS_TOKEN"]) {
    if (!env[key]) throw new Error(`${key} is required for the ${mode} local checkout.`);
  }
  if (env.SQUARE_APPLICATION_ID.startsWith("sandbox-") !== (mode === "sandbox")) {
    throw new Error("The Square application ID does not match the local mode.");
  }
  if (mode === "sandbox") {
    const database = new URL(env.DATABASE_URL);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || database.pathname !== "/amazing_donuts_sandbox") {
      throw new Error("Local sandbox checkout requires the isolated local amazing_donuts_sandbox database.");
    }
  }
}
