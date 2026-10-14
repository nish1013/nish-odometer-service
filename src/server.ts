import { buildApp } from "./app.js";
import { loadConfig } from "./config/config.js";
import { createProvider } from "./ocr/create-provider.js";

try {
  const config = loadConfig(process.env);
  const provider = createProvider(config);
  const app = await buildApp(config, provider, { logger: true });
  app.log.info(`OCR provider: ${provider.name}`);
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
