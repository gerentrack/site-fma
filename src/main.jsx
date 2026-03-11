import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
const style = document.createElement("style");
style.textContent = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #f7f7f7; } img { max-width: 100%; } button { font-family: inherit; } a { color: inherit; }`;
document.head.appendChild(style);
createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
