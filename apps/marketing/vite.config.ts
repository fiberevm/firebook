import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // where the "Sign up" / "Sign in" buttons send people
  const appUrl = (loadEnv(mode, process.cwd(), "").VITE_APP_URL || "http://localhost:5173").replace(/\/$/, "");

  return {
    plugins: [
      tailwindcss(),
      {
        name: "app-url",
        transformIndexHtml: (html) => html.replaceAll("%APP_URL%", appUrl),
      },
    ],
    server: { port: 5174 },
  };
});
