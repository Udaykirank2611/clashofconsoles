import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Konami } from "@/components/site/Konami";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="aurora opacity-30" aria-hidden="true" />
      <div className="grid-texture absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="glass relative w-full max-w-xl rounded-4xl px-8 py-14 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-cyan">
          Signal Lost
        </p>
        <h1 className="text-gradient mt-6 text-7xl font-extrabold leading-none sm:text-8xl">
          404
        </h1>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Looks like you&apos;ve entered the wrong arena.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This screen is offline. Respawn at the main lobby and get back in the game.
        </p>
        <div className="mt-9">
          <Link
            to="/"
            className="gradient-ring inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_22px_70px_-14px_var(--primary)] active:scale-[0.965]"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Clash of Consoles — Premium Gaming Cafe in Hyderabad" },
      {
        name: "description",
        content:
          "Hyderabad's premium console gaming arena — PlayStation 5 bays, multiplayer battles and snacks.",
      },
      { property: "og:site_name", content: "Clash of Consoles" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#090909" },
      { property: "og:title", content: "Clash of Consoles — Premium Gaming Cafe in Hyderabad" },
      { name: "twitter:title", content: "Clash of Consoles — Premium Gaming Cafe in Hyderabad" },
      { property: "og:description", content: "Hyderabad's premium console gaming arena — PlayStation 5 bays, multiplayer battles and snacks." },
      { name: "twitter:description", content: "Hyderabad's premium console gaming arena — PlayStation 5 bays, multiplayer battles and snacks." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/27f23e47c8acfd0852470bc9c07fad2c/id-preview-0d687785--ab7ada00-a643-423b-b5d6-a7bfffa1764d.lovable.app-1786530534558.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/27f23e47c8acfd0852470bc9c07fad2c/id-preview-0d687785--ab7ada00-a643-423b-b5d6-a7bfffa1764d.lovable.app-1786530534558.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=Orbitron:wght@700;800;900&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: (props) => <ErrorComponent error={props.error as Error} reset={props.reset} />,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
      <Konami />
    </QueryClientProvider>
  );
}
