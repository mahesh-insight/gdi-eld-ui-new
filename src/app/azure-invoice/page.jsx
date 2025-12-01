// src/app/azure-invoice/page.jsx
import AzureInvoiceClient from "./AzureInvoiceClient";
import { getInitialAzureInvoiceData } from "@/lib/azureInvoiceApi";
import { getUiProperties } from "@/lib/server-config";

// optional SEO metadata
export const metadata = {
  title: "Azure Invoice",
};

export default async function AzureInvoicePage() {
  // TODO: get soldToId from your auth/session on the server
  const soldToId = ["Insight|SAP|0011290301|2400"];

  const uiProps = await getUiProperties();
  const initialData = await getInitialAzureInvoiceData({
    soldToId,
    locationState: null,
  });

  return (
    <AzureInvoiceClient
      soldToId={soldToId}
      uiProps={uiProps}
      initialData={initialData}
    />
  );
}
