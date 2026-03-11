import { BrowserRouter } from "react-router-dom";
import { AdminProvider } from "./context/AdminContext";
import { IntranetProvider } from "./context/IntranetContext";
import { OrganizerProvider } from "./context/OrganizerContext";
import { initializeData } from "./data/api";
import AppRouter from "./router/index";

// Seed localStorage with initial data on first run
initializeData();

export default function App() {
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
          </OrganizerProvider>
        </IntranetProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}
