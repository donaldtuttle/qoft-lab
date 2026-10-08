import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LabApp } from "@/components/lab/lab-app";
import { PlainLanguageContext } from "@/components/lab/edition";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlainLanguageContext.Provider value={document.documentElement.dataset.edition === "plain"}>
      <LabApp />
    </PlainLanguageContext.Provider>
  </StrictMode>,
);
