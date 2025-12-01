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
import { MyProgressBar } from "./progressBar";
import GridFunctions from "../../../src/common/gridFunctions";
import { useTranslation } from "react-i18next";

const DownloadGridTable = (props) => {
  const { t } = useTranslation();
  const { setInitialColumnWidth } = GridFunctions();
  const accountInfo = useRecoilValue(selectedAccountState);
  const isScheduledDownloadgridResponse = useRecoilValue(scheduledDownloadgridResponse) || [];
  const [filterValue, setFilterValue] = useState();
  const { tenantIds } = accountInfo;
  const IsTenantId = tenantIds?.length > 0;
  const {
    className,
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
  
  const [updatedData, setUpdatedData] = useState(isScheduledDownloadgridResponse);
  const isConsumptionPage = name?.includes("Consumption");
  const isDownloadFile = name?.includes("downloadFile");
  const gridResponseData = data?.data || data;
  const [filteredData, setFilteredData] = useState(gridResponseData);
  const [dataStateObject, setDataStateObject] = useState(initialDataState);
  const [dataResult, setDataResult] = useState(process(filteredData, dataStateObject));
  const [products, setProducts] = useState({
    data: [],
    total: data?.total || 0,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newData = updatedData?.map((item) => {
        if (item.status === 'Complete') {
          return { ...item, isDownloadFile: true };
        } else {
          return item;
        }
      });
      setUpdatedData(newData);
    }, 2000);

    return () => clearTimeout(timeoutId); 
  }, [updatedData]);

  useEffect(() => {
    if (isScheduledDownloadgridResponse && isScheduledDownloadgridResponse.length > 0) {
      const processedData = isScheduledDownloadgridResponse.map(item => ({
        ...item,
        created: new Date(item.created),
      }));
      setDataResult(processedData);
      setProducts(processedData);
    }
  }, [isScheduledDownloadgridResponse]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {}); 
    return () => resizeObserver.disconnect(); 
  }, []); 

  const onFilterChange = ev => {
    let value = ev?.value;
    setFilterValue(ev?.value);
    let newData = data?.data?.filter(item => {
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
          className={className}
          style={{
            height: gridData?.length > 7 ? "450px" : ""
          }}
          name={name}
          filterable={true}
          sortable={sortable}
          pageable={true}
          {...dataState}
          // data={isDownloadFile ? isScheduledDownloadgridResponse : products}
          data={dataResult}
          page={page}
          onDataStateChange={dataStateChange}
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
          {columns?.map((key, index) => {
            return (
              <GridColumn
                field={key.field}
                title={key.title}
                key={index}
                width={setWidth(key.minWidth)}
                format={key.format}
              />
            );
          })}
          {isDownloadFile && <GridColumn title={t("common.fileStatus")} cells={{ data: MyProgressBar }} width="260px" />}
          {isDownloadFile && <GridColumn title={t("common.actions")} cells={{ data: MyCommandCell }} width="260px" />}
        </Grid>
      </ExcelExport>
    </>
  );
};

export default DownloadGridTable;