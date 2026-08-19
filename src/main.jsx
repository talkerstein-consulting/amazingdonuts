import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import "./styles/tailwind.css";
import "./styles/styles.css";
import "./styles/home.css";
import "./styles/modules.css";
import "./styles/builder.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
