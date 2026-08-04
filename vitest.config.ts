import path from "node:path";
import { defineConfig } from "vitest/config";

/** El alias "@/" tiene que existir también en los tests: sin esto, cualquier
 *  test que importe como lo hace la app falla al resolver el módulo. */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
