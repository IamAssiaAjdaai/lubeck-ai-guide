import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./PilotApp";
import AuthPreview from "./auth/AuthPreview";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Marketing onboarding root is missing");
// This is a local UI preview route, NOT an authenticated private route.
const isAuthPreview = window.location.pathname === "/design/auth";
createRoot(root).render(<StrictMode>{isAuthPreview ? <AuthPreview /> : <App />}</StrictMode>);
