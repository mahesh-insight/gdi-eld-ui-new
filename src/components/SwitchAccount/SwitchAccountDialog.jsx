"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setLoginResponse } from "@/store/authSlice";
import { clearDashboardData } from "@/store/dashboardSlice";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Window } from "@progress/kendo-react-dialogs";
import { Grid, GridColumn, GridToolbar } from "@progress/kendo-react-grid";
import { Input } from "@progress/kendo-react-inputs";
import { Button } from "@progress/kendo-react-buttons";
import { Loader } from "@progress/kendo-react-indicators";
import { process } from "@progress/kendo-data-query";
import request from "@/lib/api/request";
import { accountSearchAdminColumns } from "@/common/commonDataSets";
import styles from "./SwitchAccount.module.scss";
import { persistor } from "@/store/store";


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
  const router = useRouter();

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
    async (dataItem) => {
      console.log('🔘 SELECT BUTTON CLICKED - handleAccountSelect called with:', dataItem?.soldToName);
      setIsLoading(true);
      
      try {
        // Update loginResponse in Redux
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

        // Store in localStorage first (before Redux update)
        const soldToIdValue = dataItem.soldToId || dataItem.soldTo;
        localStorage.setItem("soldToId", JSON.stringify([soldToIdValue]));
        localStorage.setItem("soldto", dataItem.soldTo);
        
        // Call mpsaStatus to get widget flags (same pattern as DashboardClient)
        // This will call: /ccr-dashboard-service/context/{soldToId}
        console.log('🔄 Calling mpsaStatus for soldToId:', soldToIdValue);
        const mpsaResponse = await request.get("mpsaStatus", {
          pathParam: soldToIdValue
        });
        
        if (mpsaResponse?.status === 200) {
          // Store widget flags in localStorage for page reload
          const widgetFlags = {
            unlimitedCspTags: mpsaResponse?.data?.microsoft?.unlimitedCspTags || false,
            haveMPSAData: mpsaResponse?.data?.microsoft?.haveMPSAData || false,
            hasReservedInstanceOrAzureSavingsPlan: mpsaResponse?.data?.microsoft?.hasReservedInstanceOrAzureSavingsPlan || false,
            hasAzureSpendWidgetData: mpsaResponse?.data?.microsoft?.hasAzureSpendWidgetData || false,
            hasM365WidgetData: mpsaResponse?.data?.microsoft?.hasM365WidgetData || false,
            hasMSSpendWidgetData: mpsaResponse?.data?.microsoft?.hasMSSpendWidgetData || false,
            hasAwsSpendWidgetData: mpsaResponse?.data?.aws?.hasSpendWidgetData || false,
            hasAwsConsumptionData: mpsaResponse?.data?.aws?.hasConsumptionData || false,
            hasAdobeWidgetData: mpsaResponse?.data?.adobe?.hasSpendWidgetData || false,
            salesOrganizationCountryCode: mpsaResponse?.data?.salesOrganizationCountryCode || false,
          };
          
          localStorage.setItem("widgetFlags", JSON.stringify(widgetFlags));
        }
        
        console.log('✅ Account switched:', {
          newAccount: dataItem.soldToName,
          newSoldToId: soldToIdValue
        });
        
        // CRITICAL FIX: Pause Redux Persist to prevent it from overwriting our changes
        console.log('⏸️ Pausing Redux Persist...');
        persistor.pause();
        
        // Update Redux with new account (will NOT persist because we paused)
        dispatch(setLoginResponse(updatedLoginResponse));
        dispatch(clearDashboardData());
        
        console.log('🧹 Clearing Redux dashboard cache for account switch...');
        
        // Small delay to ensure Redux updates complete
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // NOW directly update persisted storage (Redux Persist won't overwrite it)
        try {
          const persistKey = 'persist:ccr-auth';
          const existingData = localStorage.getItem(persistKey);
          if (existingData) {
            const parsed = JSON.parse(existingData);
            
            // Log old soldToId for verification
            const oldLoginResponse = JSON.parse(parsed.loginResponse || '{}');
            const oldSoldTo = oldLoginResponse.userProfile?.defaultContext?.[0]?.soldToId || 'unknown';
            
            // Update with new account data
            parsed.loginResponse = JSON.stringify(updatedLoginResponse);
            localStorage.setItem(persistKey, JSON.stringify(parsed));
            
            // VERIFY the write worked
            const verifyData = localStorage.getItem(persistKey);
            const verifyParsed = JSON.parse(verifyData);
            const verifyLogin = JSON.parse(verifyParsed.loginResponse);
            const newSoldTo = verifyLogin.userProfile?.defaultContext?.[0]?.soldToId || 'unknown';
            
            console.log('✅ Persisted storage updated (Persist is PAUSED):');
            console.log('   OLD soldToId:', oldSoldTo);
            console.log('   NEW soldToId:', newSoldTo);
            console.log('   Expected soldToId:', soldToIdValue);
            console.log('   Verification:', newSoldTo === soldToIdValue ? '✅ MATCH' : '❌ MISMATCH');
            
            if (newSoldTo !== soldToIdValue) {
              console.error('❌ CRITICAL: localStorage update FAILED!');
            }
          }
          
          // CRITICAL: Also clear the dashboard persisted data
          const dashboardPersistKey = 'persist:ccr-dashboard';
          const dashboardData = localStorage.getItem(dashboardPersistKey);
          if (dashboardData) {
            console.log('🧹 Clearing persisted dashboard data for account switch...');
            localStorage.removeItem(dashboardPersistKey);
          }
          
        } catch (err) {
          console.error('⚠️ Failed to update persisted storage:', err);
        }
        
        // CRITICAL: Set cookies BEFORE navigation so server can read them
        console.log('🍪 Setting cookies for server-side rendering...');
        try {
          // Set access_token cookie
          const accessToken = loginResponse?.tokens?.bearerToken;
          if (accessToken) {
            document.cookie = `access_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          // Set soldToId cookie
          document.cookie = `soldToId=${encodeURIComponent(soldToIdValue)}; path=/; max-age=86400; SameSite=Lax`;
          
          // Set user_context cookie
          const userContext = {
            soldToId: soldToIdValue,
            userProfile: updatedLoginResponse.userProfile
          };
          document.cookie = `user_context=${encodeURIComponent(JSON.stringify(userContext))}; path=/; max-age=86400; SameSite=Lax`;
          
          console.log('✅ Cookies set successfully for new account:', soldToIdValue);
        } catch (cookieError) {
          console.error('❌ Failed to set cookies:', cookieError);
        }
        
        // Set flag to bypass server cache on next dashboard load
        sessionStorage.setItem('accountJustSwitched', 'true');
        sessionStorage.setItem('newSoldToId', soldToIdValue);
        console.log('🚩 Account switch flag set - dashboard will bypass cache');
        
        // Extra delay to ensure storage write is fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to dashboard with cache bypass flag
        console.log('🔄 Navigating to dashboard with cache bypass flag...');
        window.location.href = `/dashboard?bypassCache=true`;
        
      } catch (error) {
        console.error("Error switching account:", error);
        setError(true);
        setErrorMessage(t("search.error"));
        setIsLoading(false);
      }
    },
    [loginResponse, dispatch, onClose, t],
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
