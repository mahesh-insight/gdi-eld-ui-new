"use client"; // Needed if it contains interactive behavior

import React from "react";
import classNames from "classnames";
import "./panel.css";

export default function Panel({ children, className }) {
  return (
    <div className={classNames("panel-container", className)}>
      {children}
    </div>
  );
}
