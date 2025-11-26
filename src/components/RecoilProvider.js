// src/components/RecoilProvider.js
"use client"; // <--- REQUIRED DIRECTIVE

import { RecoilRoot } from "recoil";
import EffectHandler from "./EffectHandler"; // Import the handler below

export default function RecoilProvider({ children }) {
  // RecoilRoot must be in a client component to manage state
  return (
    <RecoilRoot>
      <EffectHandler>{children}</EffectHandler>
    </RecoilRoot>
  );
}