import * as React from "react";
import { Button } from "@progress/kendo-react-buttons";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { downloadGridResponse, gridResponse, scheduledDownloadgridResponse } from "../../../src/recoil/gridAtoms";
import { errorState, fileNameState, plainLoadingState } from "../../../src/recoil/pageAtoms";
import request from "../../../src/library/api/request";
import { AnalyticsData } from "../Analytics/utils";
import { selectedAccountState } from "../../../src/recoil/userAtoms";
import exceptionHandler from "../../../src/library/api/exceptionHandler";

export const MyCommandCell = (props) => {
  const { dataItem } = props;
  const analytics = AnalyticsData();
  const { updateAnalytics } = analytics;
  const setPlainLoading = useSetRecoilState(plainLoadingState);
  const setErrorState = useSetRecoilState(errorState);
  const accountInfo = useRecoilValue(selectedAccountState);
  const fileName = useRecoilValue(fileNameState);
  const setDownloadGridResponse = useSetRecoilState(downloadGridResponse);
  const setScheduledDownloadgridResponse = useSetRecoilState(scheduledDownloadgridResponse);
  const setGridData = useSetRecoilState(gridResponse);

  const download = (dataItem) => {
    setPlainLoading(true);
    setDownloadGridResponse(true);
    try {
      request
        .post("downloadFile", {
          url: dataItem?.id,
          responseType: 'arraybuffer'
        })
        .then((response) => {
          setPlainLoading(false);
          const url = window?.URL?.createObjectURL(new Blob([response]));
          const link = document?.createElement("a");
          link.href = url;
          link.setAttribute("download", `${dataItem?.fileName}.xlsx`);
          document?.body?.appendChild(link);
          link?.click();
          setDownloadGridResponse(false);
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
          setPlainLoading(false);
          setErrorState(exceptionHandler(error));
        });
    } catch (error) {
      console.log(error);
    }
  };

  const remove = async (dataItem) => {
    setPlainLoading(true);
    try {
      await request
        .del("downloads", {
          url: dataItem?.id,
        })
        .then((response) => {
          setPlainLoading(false);
          setScheduledDownloadgridResponse(response?.content);
          setGridData(response);
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
