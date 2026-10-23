import { loadEnv } from "./env.js";
import { testConnection } from "./meta.js";
loadEnv();
console.log(await testConnection());
