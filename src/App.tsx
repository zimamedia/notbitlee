import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { BrandProvider } from "@/components/brand.tsx";
import { RequireSession } from "@/components/session.tsx";
import { Shell } from "@/components/shell.tsx";
import { AnalyticsPage } from "@/pages/analytics-page.tsx";
import { HomePage } from "@/pages/home-page.tsx";
import { LinkDetailPage } from "@/pages/link-detail-page.tsx";
import { LinksPage } from "@/pages/links-page.tsx";
import { LoginPage } from "@/pages/login-page.tsx";
import { NewLinkPage } from "@/pages/new-link-page.tsx";
import { SettingsPage } from "@/pages/settings-page.tsx";

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: <RequireSession />,
      children: [
        {
          element: <Shell />,
          children: [
            { index: true, element: <HomePage /> },
            { path: "links", element: <LinksPage /> },
            { path: "links/new", element: <NewLinkPage /> },
            { path: "links/:slug", element: <LinkDetailPage /> },
            { path: "analytics", element: <AnalyticsPage /> },
            { path: "settings", element: <SettingsPage /> },
          ],
        },
      ],
    },
  ],
  { basename: "/admin" },
);

export function App() {
  return (
    <BrandProvider>
      <RouterProvider router={router} />
    </BrandProvider>
  );
}
