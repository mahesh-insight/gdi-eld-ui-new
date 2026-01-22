"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setLoginResponse } from "@/store/authSlice";
import { useTranslation } from "react-i18next";
import { Window } from "@progress/kendo-react-dialogs";
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid";
import { Input } from "@progress/kendo-react-inputs";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { process } from "@progress/kendo-data-query";
import request from "@/lib/api/request";
import { accountSearchAdminColumns } from "@/common/commonDataSets";
import styles from "./SwitchAccount.module.scss";


const MySelectionCell = (props) => {
  const { dataItem, onSelect } = props;
  return (
    <td {...props.tdProps}>
      <Button onClick={() => onSelect(dataItem)}>
        Select
      </Button>
    </td>
  );
};

const SwitchAccountDialog = ({
  isOpen,
  onClose,
  initialWidth = 1200,
  initialHeight = 700,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const loginResponse = useSelector((state) => state.auth.loginResponse);
  const defaultContext = loginResponse?.userProfile?.defaultContext?.[0];
  const companyName = defaultContext?.soldToName || "";
  const accountNumber =
    defaultContext?.soldTo || defaultContext?.soldToId || "";

  const [ggp, setGgp] = useState("");
  const [soldto, setSoldto] = useState("");
  const [cspTenant, setCspTenant] = useState("");
  const [cspReseller, setCspReseller] = useState("");

  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);
  const [filterValue, setFilterValue] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [dataState, setDataState] = useState({ skip: 0, take: 10 });
  const [dataResult, setDataResult] = useState({ data: [], total: 0 });

  useEffect(() => {
    if (searchData.length > 0) {
      const filteredData = filterValue
        ? searchData.filter((item) =>
            Object.values(item).some((val) =>
              val
                ?.toString()
                ?.toLowerCase()
                ?.includes(filterValue.toLowerCase()),
            ),
          )
        : searchData;

      setDataResult(process(filteredData, dataState));
    }
  }, [searchData, dataState, filterValue]);

  const handleAccountSelect = useCallback(
    (dataItem) => {
      const updatedLoginResponse = {
        ...loginResponse,
        userProfile: {
          ...loginResponse.userProfile,
          defaultContext: [
            {
              soldTo: dataItem.soldTo,
              soldToId: dataItem.soldToId || dataItem.soldTo,
              soldToName: dataItem.soldToName,
              ggp: dataItem.ggp,
              ggpName: dataItem.ggpName,
              salesOrgId: dataItem.salesOrganizationCode,
              salesOrgName: dataItem.salesOrganizationName,
              regionCode: dataItem.regionCode,
              countryCode: dataItem.countryCode,
              geoName: dataItem.geoName,
              geoRegion: dataItem.geoRegion,
            },
          ],
        },
      };

      dispatch(setLoginResponse(updatedLoginResponse));
      onClose();
      setTimeout(() => window.location.reload(), 300);
    },
    [loginResponse, dispatch, onClose],
  );

  const handleSearch = async () => {
    const validInputRegex = RegExp(/^[a-zA-Z0-9\s\W]{3,50}$/);
    
    // Check if at least one field is filled
    if (
      !ggp.trim() &&
      !soldto.trim() &&
      !cspTenant.trim() &&
      !cspReseller.trim()
    ) {
      setError(true);
      setErrorMessage(t("search.atLeastOneField"));
      return;
    }

    // Validate filled fields
    const isGGPValidate = !ggp || validInputRegex.test(ggp);
    const isAccountNumberValidate = !soldto || validInputRegex.test(soldto);
    const isCSPTenant = !cspTenant || validInputRegex.test(cspTenant);
    const isCSPReseller = !cspReseller || validInputRegex.test(cspReseller);

    if (!isGGPValidate || !isAccountNumberValidate || !isCSPTenant || !isCSPReseller) {
      setError(true);
      setErrorMessage(t("search.requirements"));
      return;
    }

    setError(false);
    setErrorMessage("");
    setIsLoading(true);
    setShowResults(false);
    setFilterValue("");

    try {
      const params = new URLSearchParams();
      if (ggp.trim()) params.append("ggp", ggp.trim());
      if (soldto.trim()) params.append("soldto", soldto.trim());
      if (cspTenant.trim()) params.append("cspTenant", cspTenant.trim());
      if (cspReseller.trim()) params.append("cspReseller", cspReseller.trim());
      params.append("size", "100");

      const response = await request.get("customerSearch", {
        params: Object.fromEntries(params),
      });
      
      const searchResults = response?.data?.content || [];
      setSearchData(searchResults);
      setShowResults(true);
      
      if (searchResults.length === 0) {
        setError(true);
        setErrorMessage(t("search.noResults"));
      }
    } catch (err) {
      setError(true);
      setErrorMessage(err?.response?.data?.message || t("search.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setGgp("");
    setSoldto("");
    setCspTenant("");
    setCspReseller("");
    setError(false);
    setErrorMessage("");
    setFilterValue("");
    setShowResults(false);
    setSearchData([]);
  };

  // Get columns configuration
  const columns = accountSearchAdminColumns(t);

  if (!isOpen) return null;

  return (
    <Window
      title="ACCOUNT SWITCH"
      onClose={onClose}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      modal={true}
      className={styles.switchAccountWindow}
    >
      <div className={styles.dialogContent}>
        {/* Header and Search form remain the same... */}
        <div className={styles.accountHeader}>
          <div className={styles.accountHeaderItem}>
            <div className={styles.accountHeaderLabel}>Account Name</div>
            <div className={styles.accountHeaderValue}>{companyName}</div>
          </div>
          <div className={styles.accountHeaderItem}>
            <div className={styles.accountHeaderLabel}>Account Number</div>
            <div className={styles.accountHeaderValue}>{accountNumber}</div>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.searchSection}>
          <p className={styles.sectionTitle}>{t("search.searchForAccount")}</p>
          {error && <div className={styles.errorMessage}>{errorMessage}</div>}
          <div className={styles.searchForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Great Grand Parent (GGP Name or Number)
                </label>
                <Input value={ggp} onChange={(e) => setGgp(e.value)}  className={styles.formInput}/>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  CSP Tenant (ID, Name, or Domain)
                </label>
                <Input
                  value={cspTenant}
                  onChange={(e) => setCspTenant(e.value)}
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Account (SoldTo Name/Number)
                </label>
                <Input value={soldto} onChange={(e) => setSoldto(e.value)} className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  CSP Reseller (MPN ID or Name)
                </label>
                <Input
                  value={cspReseller}
                  onChange={(e) => setCspReseller(e.value)} className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <Button
                themeColor="primary"
                onClick={handleSearch}
                disabled={isLoading}
                className={styles.searchButton}
              >
                Search
              </Button>
              <Button onClick={handleClear} disabled={isLoading} className={styles.clearButton}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        {showResults && (
          <div className={styles.resultsSection}>
            <hr className={styles.divider} />
            <p className={styles.sectionTitle}>{t("search.searchResults")}</p>
            
            {searchData.length > 100 && (
              <div className={styles.infoMessage}>
                {t("search.searchResultsInfo")}
              </div>
            )}
            
            <Grid
              data={dataResult.data}
              total={dataResult.total}
              sortable={true}
              pageable={{
                pageSizes: [10, 20, 50]
              }}
              {...dataState}
              onDataStateChange={(e) => setDataState(e.dataState)}
              className={styles.resultsGrid}
            >
              <GridToolbar>
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.value)}
                  placeholder="Filter Table Results"
                  style={{ width: '250px' }}
                />
              </GridToolbar>

              {columns.map((column, index) => {
                if (column.isAction) {
                  return (
                    <GridColumn
                      key={index}
                      title={column.title || ""}
                      width={column.width || column.minWidth}
                      cells={{
                        data: (props) => (
                          <MySelectionCell
                            {...props}
                            onSelect={handleAccountSelect}
                          />
                        ),
                      }}
                    />
                  );
                }

                return (
                  <GridColumn
                    key={index}
                    field={column.field}
                    title={column.title}
                    minWidth={column.minWidth}
                  />
                );
              })}
            </Grid>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Loader size="large" type="converging-spinner" />
          </div>
        )}
      </div>
    </Window>
  );
};

export default SwitchAccountDialog;
