import React from "react";
import exceptionHandler from "../../../src/library/api/exceptionHandler";
import { errorState, plainLoadingState } from "../../../src/recoil/pageAtoms";
import { useRecoilState, useSetRecoilState } from "recoil";
import axios from "axios";
import './gridTable.css';

export const DownloadLinksCell = (props) => {
const [isPlainLoading, setPlainLoading] = useRecoilState(plainLoadingState);

  const setErrorState = useSetRecoilState(errorState);

  const dataItem = props?.dataItem;
  const pdfUrl = dataItem?.pdfUrl;
  const parts = pdfUrl?.split('/');
  const invoicePDFUrlName = parts ? parts?.[parts?.length - 1] : "";

  const downloadPDF = async () => {
    setPlainLoading(true);
    const accessToken = localStorage?.getItem("initial_access_token");

    if (!accessToken) {
      setPlainLoading(false);
      setErrorState("Authentication token not found.");
      return;
    }

    try {
      const response = await axios.get(pdfUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: "arraybuffer",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      let filename = `Insight-Invoice-${invoicePDFUrlName}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download PDF error:", error);
      setErrorState(exceptionHandler(error));
    } finally {
      setPlainLoading(false);
    }
  };

  return (
    <td {...props.tdProps} className="k-command-cell">
      {pdfUrl && (
        <span className="redirect" onClick={downloadPDF}>
          Download PDF
        </span>
      )}
    </td>
  );
};
