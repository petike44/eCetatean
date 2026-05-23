import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/chat", priority: "1.0" },
          { path: "/onboarding" },
          { path: "/auth" },
          { path: "/action-plan" },
          { path: "/documents" },
          { path: "/report" },
          { path: "/document-preview" },
          { path: "/profile" },
          { path: "/audit" },
          { path: "/staff" },
        ];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) => `  <url><loc>${BASE_URL}${e.path}</loc>${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
