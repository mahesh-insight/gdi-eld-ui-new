"use client";

import React from "react";
import classNames from "classnames";
import "./panel.css";

export default function PanelBody({ children, className }) {
  return (
    <div className={classNames("panel-body", className)}>
      {children}
    </div>
  );
}
