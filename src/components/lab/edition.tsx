import { createContext, useContext } from "react";

// Presentation choice only. Both editions use the same store and simulation.
export const PlainLanguageContext = createContext(false);
export const usePlainLanguage = () => useContext(PlainLanguageContext);
