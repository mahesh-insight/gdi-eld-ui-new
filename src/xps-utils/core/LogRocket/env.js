const envName =
  {
    "ccrdev.insight.com": "NA-DEV",
    "ccrqa.insight.com": "NA-DEV",
    "ccr.insight.com": "NA-PROD",
    "localhost": "NA-DEV",
  }[window.document.domain] || "DEV";

const logRocketId = {
  "NA-DEV": "c6f0pz/ccr-dev",
  "NA-PROD": "c6f0pz/ccr-prod",
}[envName];

const env = {
  envName,
  logRocketId,
};
Object.freeze(env);
export default env;
