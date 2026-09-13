import { createHashRouter } from "react-router-dom";

import { App } from "@/app/App";
import { AppShell } from "@/components/layout/AppShell";
import { DisplayPreferencesProvider } from "@/features/display/DisplayPreferencesProvider";
import { AppErrorPage } from "@/pages/error/AppErrorPage";
import { HomePage } from "@/pages/home/HomePage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { StatusPage } from "@/pages/status/StatusPage";

export const router = createHashRouter([
  {
    element: <App />,
    errorElement: <DisplayPreferencesProvider><AppShell><AppErrorPage /></AppShell></DisplayPreferencesProvider>,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "status",
        element: <AppShell><StatusPage /></AppShell>,
      },
      {
        path: "*",
        element: <AppShell><NotFoundPage /></AppShell>,
      },
    ],
  },
]);
