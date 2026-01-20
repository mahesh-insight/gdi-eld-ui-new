"use client";

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Window } from '@progress/kendo-react-dialogs';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { process } from '@progress/kendo-data-query';
import styles from './SwitchAccount.module.scss';

const SwitchAccountDialog = ({ 
  isOpen, 
  onClose, 
  initialWidth = 1200, 
  initialHeight = 700 
}) => {
  // Get data from Redux store
  const loginResponse = useSelector((state) => state.auth.loginResponse);
  const defaultContext = loginResponse?.userProfile?.defaultContext?.[0];
  const companyName = defaultContext?.soldToName || '';
  const accountNumber = defaultContext?.soldTo || defaultContext?.soldToId || '';
  
  // Get user role from Redux
  const userRole = loginResponse?.persona || loginResponse?.role || '';
  const haveTargetedSoldTos = loginResponse?.userProfile?.haveTargetedSoldTos || false;
  
  // Form state
  const [ggp, setGgp] = useState('');
  const [soldto, setSoldto] = useState('');
  const [cspTenant, setCspTenant] = useState('');
  const [cspReseller, setCspReseller] = useState('');
  
  // Results state
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);
  const [filterValue, setFilterValue] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Grid state
  const [dataState, setDataState] = useState({
    skip: 0,
    take: 10,
  });
  const [dataResult, setDataResult] = useState({ data: [], total: 0 });

  // Update data result when search data or filter changes
  useEffect(() => {
    if (searchData.length > 0) {
      const filteredData = filterValue
        ? searchData.filter((item) => {
            return Object.values(item).some(val => 
              val?.toString()?.toLowerCase()?.includes(filterValue.toLowerCase())
            );
          })
        : searchData;
      
      setDataResult(process(filteredData, dataState));
    }
  }, [searchData, dataState, filterValue]);

  const handleSearch = async () => {
    // Validation
    if (!ggp.trim() && !soldto.trim() && !cspTenant.trim() && !cspReseller.trim()) {
      setError(true);
      setErrorMessage('At least one of the form fields should be filled.');
      return;
    }

    const validInputRegex = RegExp(/^[a-zA-Z0-9\s\W]{3,50}$/);
    const isValid = 
      (!ggp || validInputRegex.test(ggp)) &&
      (!soldto || validInputRegex.test(soldto)) &&
      (!cspTenant || validInputRegex.test(cspTenant)) &&
      (!cspReseller || validInputRegex.test(cspReseller));

    if (!isValid) {
      setError(true);
      setErrorMessage('Search requirements: 3-50 characters');
      return;
    }

    setError(false);
    setErrorMessage('');
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // Simulating API response for now
      const mockData = [
        {
          soldToName: '3E Company Environmental',
          soldTo: '0011275637',
          ggpName: '3E COMPANY ENVIRONMENTAL, ECOLOGICA',
          ggp: '0009736692',
          salesOrg: '2400',
          salesOrgName: 'Insight USA'
        },
        {
          soldToName: '3E Company Environmental',
          soldTo: '0011290301',
          ggpName: '3E COMPANY ENVIRONMENTAL, ECOLOGICA',
          ggp: '0009736692',
          salesOrg: '2400',
          salesOrgName: 'Insight USA'
        },
        {
          soldToName: '3E Company Environmental',
          soldTo: '0011365079',
          ggpName: '3E COMPANY ENVIRONMENTAL, ECOLOGICA',
          ggp: '0009736692',
          salesOrg: '2400',
          salesOrgName: 'Insight USA'
        }
      ];

      // Filter mock data based on search criteria
      const filtered = mockData.filter(item => {
        return (
          (!ggp || item.ggpName?.toLowerCase().includes(ggp.toLowerCase()) || item.ggp?.includes(ggp)) &&
          (!soldto || item.soldToName?.toLowerCase().includes(soldto.toLowerCase()) || item.soldTo?.includes(soldto)) &&
          (!cspTenant || false) && // Add CSP Tenant logic when available
          (!cspReseller || false) // Add CSP Reseller logic when available
        );
      });

      setSearchData(filtered);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setError(true);
      setErrorMessage('An error occurred during search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setGgp('');
    setSoldto('');
    setCspTenant('');
    setCspReseller('');
    setError(false);
    setErrorMessage('');
    setFilterValue('');
    setShowResults(false);
    setSearchData([]);
  };

  const handleAccountSelect = (dataItem) => {
    console.log('Selected account:', dataItem);
    // TODO: Implement account switching logic
    // This should update Redux store with new account
    onClose();
  };

  const dataStateChange = (event) => {
    setDataState(event.dataState);
  };

  const onFilterChange = (e) => {
    setFilterValue(e.value);
  };

  const SelectButton = (props) => {
    return (
      <td>
        <Button
          themeColor="primary"
          onClick={() => handleAccountSelect(props.dataItem)}
        >
          Select
        </Button>
      </td>
    );
  };

  if (!isOpen) return null;

  return (
    <Window
      title="ACCOUNT SWITCH"
      onClose={onClose}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}
      modal={true}
      className={styles.switchAccountWindow}
    >
      <div className={styles.dialogContent}>
        {/* Current Account Display */}
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

        {/* Search Form */}
        <div className={styles.searchSection}>
          <p className={styles.sectionTitle}>SEARCH FOR AN ACCOUNT</p>
          
          {error && (
            <div className={styles.errorMessage}>
              {errorMessage}
            </div>
          )}

          <div className={styles.searchForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Great Grand Parent (GGP Name or Number)
                </label>
                <Input
                  value={ggp}
                  onChange={(e) => setGgp(e.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  CSP Tenant (Tenant ID, Tenant Name, or Domain)
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
                  Account (SoldTo Name or Number)
                </label>
                <Input
                  value={soldto}
                  onChange={(e) => setSoldto(e.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  CSP Reseller (MPN ID or Reseller Name)
                </label>
                <Input
                  value={cspReseller}
                  onChange={(e) => setCspReseller(e.value)}
                  className={styles.formInput}
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
              <Button
                onClick={handleClear}
                disabled={isLoading}
                className={styles.clearButton}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {showResults && (
          <div className={styles.resultsSection}>
            <hr className={styles.divider} />
            <h3 className={styles.sectionTitle}>SEARCH RESULTS</h3>
            
            {searchData.length > 100 && (
              <div className={styles.infoMessage}>
                Search returned more than 100 results. Showing first 100.
              </div>
            )}

            <Grid
              data={dataResult}
              sortable={true}
              pageable={{
                pageSizes: [10, 20, 50]
              }}
              {...dataState}
              onDataStateChange={dataStateChange}
              className={styles.resultsGrid}
            >
              <GridToolbar>
                <Input
                  value={filterValue}
                  onChange={onFilterChange}
                  placeholder="Filter Table Results"
                  style={{ width: '250px' }}
                />
              </GridToolbar>
              <GridColumn
                field=""
                title=""
                width="100px"
                cell={SelectButton}
              />
              <GridColumn
                field="soldToName"
                title="Account Name"
                width="200px"
              />
              <GridColumn
                field="soldTo"
                title="Account Number"
                width="150px"
              />
              <GridColumn
                field="ggpName"
                title="GGP Name"
                width="250px"
              />
              <GridColumn
                field="ggp"
                title="GGP"
                width="150px"
              />
              <GridColumn
                field="salesOrg"
                title="Sales Org"
                width="100px"
              />
              <GridColumn
                field="salesOrgName"
                title="Sales Org Name"
                width="150px"
              />
            </Grid>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loader}>Loading...</div>
          </div>
        )}
      </div>
    </Window>
  );
};

export default SwitchAccountDialog;
