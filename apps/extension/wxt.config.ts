import { resolve } from "node:path";
import { defineConfig } from "wxt";

export default defineConfig({
  alias: {
    // Point to the protocol package's source directory
    "@tramus/protocol": resolve(__dirname, "./node_modules/@tramus/protocol"),
  },
  dev: {
    server: {
      port: 4000,
    },
  },
  manifest: {
    description:
      "Send Tramus API requests to localhost and cloud APIs without CORS limits.",
    host_permissions: ["<all_urls>"],
    name: "Tramus Interceptor",
  },
});
