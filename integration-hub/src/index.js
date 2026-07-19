import { config } from "./config.js";
import { createServer } from "./server.js";

const app = createServer();
app.listen(config.port, () => {
  console.log(`Forge Integration Hub listening on :${config.port} (mode=${config.mode})`);
});
