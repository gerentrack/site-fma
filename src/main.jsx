import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
const style = document.createElement("style");
style.textContent = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f7f7f7; }
img { max-width: 100%; }
button { font-family: inherit; }
a { color: inherit; }

/* ── Responsive Utilities ─────────────────────────────── */
.show-mobile { display: none !important; }
.show-mobile-flex { display: none !important; }
.hamburger { display: none !important; }

.sidebar { transition: transform 0.25s ease; }

@media (max-width: 768px) {
  .hide-mobile { display: none !important; }
  .show-mobile { display: block !important; }
  .show-mobile-flex { display: flex !important; }
  .hamburger { display: flex !important; }

  .sidebar {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 1000 !important;
    transform: translateX(-100%);
    height: 100vh !important;
    width: 260px !important;
    box-shadow: 4px 0 24px rgba(0,0,0,0.25);
    overflow-y: auto !important;
  }
  .sidebar.open { transform: translateX(0); }

  .sidebar-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 999; display: block !important;
  }

  .layout-main { margin-left: 0 !important; width: 100% !important; }

  .table-responsive { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
  .table-responsive > table, .table-responsive > div { min-width: 600px; }

  .grid-stack-mobile { grid-template-columns: 1fr !important; }

  .desktop-nav { display: none !important; }
  .desktop-cta { display: none !important; }

  .mobile-padding { padding: 16px 12px !important; }
}

@media (min-width: 769px) {
  .sidebar-overlay { display: none !important; }
}
`;
document.head.appendChild(style);
createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
