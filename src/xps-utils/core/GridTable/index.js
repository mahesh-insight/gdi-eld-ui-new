/**
 * This method will return the Grid Table.
 * @param {Object} response
 * @returns {*}
 * @project:    ELD
 * @date:       2023-10-10
 * @author:     Mahesh
 */

import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid";
import { Input } from '@progress/kendo-react-inputs';
import { process } from "@progress/kendo-data-query";
import { ExcelExport } from "@progress/kendo-react-excel-export";
import { selectedAccountState } from "../../../src/recoil/userAtoms";
import "../../../src/common/override.scss";
import { scheduledDownloadgridResponse } from "../../../src/recoil/gridAtoms";
import { MyCommandCell } from "./commandCell";
import { MyProgressBar } from "../../core/GridTable/progressBar";
import { DownloadLinksCell } from "./DownloadLinksCell";
import ViewDetailLinkCell from "./ViewDetailLinkCell";
import { useTranslation } from "react-i18next";

const GridTable = (props) => {
  const { t } = useTranslation();
  const accountInfo = useRecoilValue(selectedAccountState);
  const isScheduledDownloadgridResponse = useRecoilValue(scheduledDownloadgridResponse) || [];
  const [filterValue, setFilterValue] = useState();
  const { tenantIds } = accountInfo;
  const IsTenantId = tenantIds?.length > 0;
  const {
    data,
    gridData,
    _export,
    sortable,
    gridSort,
    page,
    columns,
    tenantId,
    setWidth,
    name,
    dataState,
    dataStateChange,
  } = props;

  const initialDataState = {
    take: 10,
    skip: 0,
    group: []
  };
  
  const [updatedData, setUpdatedData] = useState(isScheduledDownloadgridResponse?.data);
  const isConsumptionPage = name?.includes("Consumption");
  const isHistoryPage = name?.includes("History");
  const isDownloadFile = name?.includes("downloadFile");
  const isLegacyPage = name?.includes('legacy');
  // const gridHeight = isLegacyPage ? "700px" : gridData?.length > 7 ? "450px" : "";
  const gridResponseData = data?.data || data;
  const [filteredData, setFilteredData] = useState(gridResponseData);
  const [dataStateObject, setDataStateObject] = useState(initialDataState);
  const [gridHeight, setGridHeight] = useState('450px');
  const [dataResult, setDataResult] = useState(process(filteredData, dataStateObject));
  const [products, setProducts] = useState({
    data: [],
    total: data?.length || 0,
  });

  useEffect(() => {
    setTimeout(() => {
      const newData = updatedData?.map((item) => {
        if (item.status === 'Complete') {
          return { ...item, isDownloadFile: true };
        } else {
          return item;
        }
      });
      setUpdatedData(newData);
    }, 2000);
  }, []);

  useEffect(() => {
    setDataResult(gridResponseData);
    setProducts(data);
  }, [gridResponseData, data]);

  useEffect(() => {
    if(gridData?.length){
      if(isLegacyPage && gridData?.length > 7 && !isDownloadFile){
        setGridHeight('700px');
      }else if(gridData?.length > 7){
        setGridHeight('450px');
      }else{
        setGridHeight('');
      }
    }
  }, [gridData, isLegacyPage, isDownloadFile]);

  const onFilterChange = ev => {
    let value = ev?.value;
    setFilterValue(ev?.value);
    let newData = gridResponseData?.filter(item => {
      let match = false;
      for (const property in item) {
        if (item[property]?.toString()?.toLocaleLowerCase()?.indexOf(value?.toLocaleLowerCase()) >= 0) {
          match = true;
        }
        if (item[property]?.toLocaleDateString && item[property]?.toLocaleDateString()?.indexOf(value) >= 0) {
          match = true;
        }
      }
      return match;
    });
    setFilteredData(newData);
    let clearedPagerDataState = {
      ...dataState,
      take: 8,
      skip: 0
    };
    let processedData = process(newData, clearedPagerDataState);
    setDataResult(processedData);
    setDataStateObject(clearedPagerDataState);
  };

  return (
    <>
      <ExcelExport data={gridData} ref={_export}>
        <Grid
          style={{
            height: gridHeight,
          }}
          name={name}
          filterable={true}
          sortable={sortable}
          // pageable={true}
          {...dataState}
          data={products}
          page={page}
          onDataStateChange={dataStateChange}
          defaultTake={10}
          pageable={{
              buttonCount: 4,
              pageSizes: [20, 50, 100]
          }}
        >
          { isDownloadFile && <GridToolbar>
            <Input
              value={filterValue}
              onChange={onFilterChange}
              style={{
                border: "2px solid #ccc",
                boxShadow: "inset 0px 0px 0.5px 0px rgba(0,0,0,0.0.1)",
                width: "235px",
                height: "30px",
              }}
              placeholder={t("common.filterTableResults")}
            />
          </GridToolbar> }
          {IsTenantId && isConsumptionPage && ( <GridColumn field={"tenantName"} title={t("common.customerName")} width={"200"} /> )}
          {IsTenantId && isConsumptionPage && ( <GridColumn field={"tenantId"} title={t("common.tenantId")} width={"200"} /> )}
          {IsTenantId && isConsumptionPage && ( <GridColumn field={"subscriptionDescription"} title={t("common.subscriptionName")} width={"200"} /> )}
          {IsTenantId && isConsumptionPage && ( <GridColumn field={"subscriptionId"} title={t("common.subscriptionId")} width={"200"} /> )}
          {columns?.map((key, index) => {
            return (
              <GridColumn
                field={key.field}
                title={key.title}
                key={index}
                width={setWidth(key.minWidth)}
                format={key.format}
                cell={key.cell}
              />
            );
          })}
          {IsTenantId && !isConsumptionPage && (<GridColumn field={"mpnId"} title={t("common.mpnId")} width={"300"} />)}
          {isDownloadFile && <GridColumn title={t("common.fileStatus")} cells={{ data: MyProgressBar }} width="260px" />}
          {isDownloadFile && <GridColumn title={t("common.actions")} cells={{ data: MyCommandCell }} width="300px" />}
          {isHistoryPage && <GridColumn title={t("common.pdfLink")} cells={{ data: DownloadLinksCell }} width="150px" />}
          {isHistoryPage && <GridColumn title={t("common.viewDetails")} cells={{ data: ViewDetailLinkCell }} width="150px" />}
        </Grid>
      </ExcelExport>
    </>
  );
};

export default GridTable;
