import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Clear any cached analysis results on app start to prevent showing stale data
localStorage.removeItem("causal-analysis-results");

createRoot(document.getElementById("root")!).render(<App />);
