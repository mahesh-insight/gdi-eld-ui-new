// src/components/EffectHandler.js
"use client"; // <--- REQUIRED DIRECTIVE

import React, { useEffect } from "react";

export default function EffectHandler({ children }) {
  // Logic from your original App.js/index.js that uses useEffect
  useEffect(() => {
    // Analytics script injection logic from original App.js
    const analyticsScript = window?.CCR_ANALYTICS_SCRIPT;
    if (analyticsScript) {
        const head = document?.getElementsByTagName("head")[0];
        const script = document?.createElement("script");
        script.src = analyticsScript;
        script.id = 'analyticsScript';
        head.insertBefore(script, head?.firstChild);
    }
    
    // Also call global initializations like loadCldr() here if it's client-dependent
    // import { loadCldr } from "@/common/culture.js";
    // loadCldr(); 
    
  }, []);

  return <>{children}</>;
}