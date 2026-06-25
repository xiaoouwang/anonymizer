import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { UiLocaleProvider } from "./context/UiLocaleContext.jsx";
import { registerServiceWorker } from "./registerPwa.js";
import "./styles.css";

registerServiceWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UiLocaleProvider>
      <App />
    </UiLocaleProvider>
  </StrictMode>,
);
