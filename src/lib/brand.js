// Single source of truth for Routix brand identity.
// Import from here instead of hardcoding "Routix"/"routix" in key surfaces.

export const BRAND_NAME = "Routix"; // display name
export const BRAND_SLUG = "routix"; // lowercase: filesystem, package, URL
export const BRAND_DOMAIN = "routix.web.id";
export const CLOUD_URL = `https://${BRAND_DOMAIN}`;
export const APP_NAME = BRAND_SLUG; // → ~/.routix