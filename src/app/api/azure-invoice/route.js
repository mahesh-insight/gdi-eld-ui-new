// src/app/api/azure-invoice/route.js
// THIS FILE IS NO LONGER NEEDED
// All Azure Invoice API calls now go through the centralized request system
// defined in src/lib/api/request.js and services.js

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Azure Invoice API calls now use centralized request system",
    redirect: "Use services defined in src/lib/api/services.js"
  }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({
    message: "Azure Invoice API calls now use centralized request system", 
    redirect: "Use services defined in src/lib/api/services.js"
  }, { status: 200 });
}
