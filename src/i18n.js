"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  lng: "en",
  resources: {
    en: {
      translation: {
        // Example placeholder translations
        common: {
          invoice: "Invoice",
          applyFilters: "Apply Filters",
        },
      },
    },
  },
});

export default i18n;
