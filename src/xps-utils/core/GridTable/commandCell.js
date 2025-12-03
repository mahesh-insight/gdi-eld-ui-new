import * as React from "react";
import { Button } from "@progress/kendo-react-buttons";
import { useSelector, useDispatch } from "react-redux";
import request from "../../../src/library/api/request";
import { AnalyticsData } from "../Analytics/utils";
import exceptionHandler from "../../../src/library/api/exceptionHandler";
import { setErrorState, setPlainLoadingState } from "../../../src/lib/store/slices/pageSlice";
import { setDownloadGridResponse, setScheduledDownloadgridResponse, setGridResponse } from "../../../src/lib/store/slices/gridSlice";

export const MyCommandCell = (props) => {
  const { dataItem } = props;
  const dispatch = useDispatch();
  const analytics = AnalyticsData();
  const { updateAnalytics } = analytics;
  
  // Redux selectors
  const accountInfo = useSelector(state => state.user.selectedAccount);
  const fileName = useSelector(state => state.page.fileNameState);

  const download = (dataItem) => {
    dispatch(setPlainLoadingState(true));
    dispatch(setDownloadGridResponse(true));
    try {
      request
        .post("downloadFile", {
          url: dataItem?.id,
          responseType: 'arraybuffer'
        })
        .then((response) => {
          dispatch(setPlainLoadingState(false));
          const url = window?.URL?.createObjectURL(new Blob([response]));
          const link = document?.createElement("a");
          link.href = url;
          link.setAttribute("download", `${dataItem?.fileName}.xlsx`);
          document?.body?.appendChild(link);
          link?.click();
          dispatch(setDownloadGridResponse(false));
          updateAnalytics(
            {
              trackMsg: analytics?.constVal?.DOWNLOAD_EXCEL,
            },
            {
              fileName: fileName,
              target: analytics?.constVal?.DOWNLOAD,
            }
          );
        })
        .catch((error) => {
          dispatch(setPlainLoadingState(false));
          dispatch(setErrorState(exceptionHandler(error)));
        });
    } catch (error) {
      console.log(error);
    }
  };

  const remove = async (dataItem) => {
    dispatch(setPlainLoadingState(true));
    try {
      await request
        .del("downloads", {
          url: dataItem?.id,
        })
        .then((response) => {
          dispatch(setPlainLoadingState(false));
          dispatch(setScheduledDownloadgridResponse(response?.content));
          dispatch(setGridResponse(response));
        })
        .catch((error) => {
          console.error("remove error -> ", error);
        });
    } catch (error) {
      console.log(error);
    }
  };


  return (
    <td className="k-command-cell">
      {dataItem?.status === "Complete" && (
        <React.Fragment>
          <Button
            className="c-button c-button--secondary"
            type="button"
            onClick={() => download(dataItem)}
          >
            Download
          </Button>
          <Button
            className="c-button c-button--secondary"
            type="button"
            onClick={() => remove(dataItem)}
          >
            Remove
          </Button>
        </React.Fragment>
      )}
    </td>
  );
};
