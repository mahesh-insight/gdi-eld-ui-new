import React from "react";
import exceptionHandler from "../../../src/library/api/exceptionHandler";
import { useSelector, useDispatch } from 'react-redux';
import { setErrorState, setPlainLoadingState } from "../../../src/lib/store/slices/pageSlice";
import axios from "axios";
import './gridTable.css';

export const DownloadLinksCell = (props) => {
  const dispatch = useDispatch();
  const isPlainLoading = useSelector(state => state.page.plainLoadingState);

  const dataItem = props?.dataItem;
  const pdfUrl = dataItem?.pdfUrl;
  const parts = pdfUrl?.split('/');
  const invoicePDFUrlName = parts ? parts?.[parts?.length - 1] : "";

  const downloadPDF = async () => {
    dispatch(setPlainLoadingState(true));
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
      dispatch(setErrorState(exceptionHandler(error)));
    } finally {
      dispatch(setPlainLoadingState(false));
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
