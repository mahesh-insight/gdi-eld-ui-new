// src/app/api/azure-invoice/route.js
import { NextResponse } from "next/server";
import {
  fetchInvoiceCredits,
  fetchInvoiceTrend,
  fetchInvoiceMonths,
  fetchInvoiceMonthDetail,
  fetchInvoiceSummary,
} from "@/lib/azureInvoiceApi";

export async function POST(req) {
  const body = await req.json();
  const { action, ...payload } = body;

  try {
    let data;

    switch (action) {
      case "summary":
        data = await fetchInvoiceSummary(payload);
        break;
      case "credits":
        data = await fetchInvoiceCredits(payload);
        break;
      case "trend":
        data = await fetchInvoiceTrend(payload);
        break;
      case "months":
        data = await fetchInvoiceMonths(payload);
        break;
      case "monthDetail":
        data = await fetchInvoiceMonthDetail(payload);
        break;
      default:
        return NextResponse.json(
          { message: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("azure-invoice api error", e);
    return NextResponse.json(
      { message: "Azure invoice API failed" },
      { status: 500 }
    );
  }
}
