import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { ToastProvider } from "@/components/Toast";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-text-primary">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold text-text-primary">Pagină inexistentă</h2>
        <p className="mt-2 text-sm text-text-secondary">Pagina pe care o cauți nu există sau a fost mutată.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">
            Înapoi acasă
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-text-primary">Pagina nu s-a încărcat</h1>
        <p className="mt-2 text-sm text-text-secondary">Ceva nu a mers bine. Încearcă să reîncarci pagina.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="press inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >Încearcă din nou</button>
          <a href="/" className="press inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary">
            Acasă
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1F4E79" },
      { title: "eCetățean — Asistentul tău civic pentru România digitală" },
      { name: "description", content: "Ghidul tău digital pentru orice relație cu statul. ClaudIA, asistentul AI, te ajută cu acte, formulare și proceduri." },
      { name: "author", content: "eCetățean" },
      { property: "og:title", content: "eCetățean — Asistentul tău civic" },
      { property: "og:description", content: "Ghidul tău digital pentru orice relație cu statul." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </QueryClientProvider>
  );
}
