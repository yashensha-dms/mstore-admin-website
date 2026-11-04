import versionData from "../version.json";

export const APP_VERSION = versionData?.version || process.env.NEXT_PUBLIC_APP_VERSION || "1.3.0";
export const DISPLAY_VERSION = versionData?.displayVersion || process.env.NEXT_PUBLIC_APP_DISPLAY_VERSION || `v${APP_VERSION}`;
export const FULL_VERSION = versionData?.fullVersion || process.env.NEXT_PUBLIC_APP_FULL_VERSION || DISPLAY_VERSION;
export const BUILD_DATE = versionData?.buildDate || process.env.NEXT_PUBLIC_APP_BUILD_DATE || "";
export const BUILD_TIME = versionData?.buildTime || "";
export const GIT_COMMIT = versionData?.gitCommit || process.env.NEXT_PUBLIC_APP_GIT_COMMIT || "";

export default versionData;

