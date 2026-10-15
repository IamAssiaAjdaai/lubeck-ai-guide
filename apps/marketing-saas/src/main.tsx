import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AuthPreview from "./auth/AuthPreview";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Marketing onboarding root is missing");
// This is a local UI preview route, NOT an authenticated private route.
const isAuthPreview = ["/auth", "/auth/"].includes(window.location.pathname);
createRoot(root).render(<StrictMode>{isAuthPreview ? <AuthPreview /> : <App />}</StrictMode>);
