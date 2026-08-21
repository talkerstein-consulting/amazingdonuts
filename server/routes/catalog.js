import { Router } from "express";
import { getPublicCatalog } from "../services/catalog.js";

export function catalogRouter({ square, config }) {
  const router = Router();

  router.get("/locations", async (_request, response, next) => {
    try {
      const result = await square.listLocations();
      const locations = (result.locations || [])
        .filter((location) => location.status === "ACTIVE")
        .filter((location) => !config.SQUARE_LOCATION_ID || location.id === config.SQUARE_LOCATION_ID)
        .map((location) => ({
          id: location.id,
          name: location.name,
          timezone: location.timezone,
          phone: location.phone_number || null,
          address: location.address || null,
          businessHours: location.business_hours || null
        }));
      response.json({ locations });
    } catch (error) {
      next(error);
    }
  });

  router.get("/catalog", async (request, response, next) => {
    try {
      const locationId = request.query.locationId || config.SQUARE_LOCATION_ID;
      const catalog = await getPublicCatalog(square, locationId);
      response.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      response.json({ locationId: locationId || null, ...catalog });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
