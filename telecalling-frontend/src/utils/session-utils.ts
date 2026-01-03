

/**
 * Forcefully logs the user out when the token is invalid or expired.
 */
// src/utils/session-utils.ts

/**
 * Forcefully logs out the user when the token is invalid or expired.
 * Removes local session and redirects cleanly with a message param.
 */
export const forceLogout = () => {
  try {
    console.warn("🔒 Session expired — redirecting to login...");

    // Remove credentials silently
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to login with a message param
    const loginUrl = new URL("/", window.location.origin);
    loginUrl.searchParams.set("session", "expired");

    // Smooth UX: no alert, no flash
    window.location.replace(loginUrl.toString());
  } catch (err) {
    console.error("Failed to cleanly handle session expiry:", err);
  }
};