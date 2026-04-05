import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AdminProvider } from "./context/AdminContext";
import { IntranetProvider } from "./context/IntranetContext";
import { OrganizerProvider } from "./context/OrganizerContext";
import AppRouter from "./router/index";
import CookieBanner, { getCookieConsent } from "./components/common/CookieBanner";

export default function App() {
  const analyticsAllowed = getCookieConsent() === "accepted";

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminProvider>
        <IntranetProvider>
          <OrganizerProvider>
            <link
              href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700;800&display=swap"
              rel="stylesheet"
            />
            <AppRouter />
            {analyticsAllowed && <Analytics />}
            <CookieBanner />
          </OrganizerProvider>
        </IntranetProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}
