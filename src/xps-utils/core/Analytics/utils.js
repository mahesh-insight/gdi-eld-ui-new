/**
 * This method will setup the creation of dynamic digitalData object across the site pages.
 * @param {Object} response
 * @returns {*}
 * @project:    ELD
 * @date:       2023-11-01
 * @author:     Mahesh
 */

export const AnalyticsData = () => {
  const constVal = {
    LINK: "link",
    BUTTON: "button",
    DOWNLOAD: "download",
    SELECT_ACCOUNT: "selectAccount",
    APPLY_FILTER: "applyFilter",
    IMPERSONATE: "impersonate",
    DOWNLOAD_EXCEL: "downloadExcel",
    ACCOUNT_SEARCH: "accountSearch",
    GEN_CLICK_RULE: "generalClickRule",
    ECOMM_CLICK_RULE: "ecommClickRule",
  };

  const updateAnalytics = (operation, eveObj) => {
    if (eveObj) {
      operation.data = operation?.data || [];
      operation.level = operation?.level || [];
      operation?.data?.push(createEventObj(eveObj));
      operation?.level?.push("event");
    }
    // Looping and updating digitalData
    for (let i = 0; i < operation?.level?.length; i++) {
      const root = operation?.level[i];
      window.digitalData[root] = operation?.data[i];
    }

    if (operation?.trackMsg) {
      // Triggering analytics observer service mechanism
      triggerObserverService(operation);
    }

    if (operation?.pageLoad) {
      // Triggering analytics onload since data is available after some time(ajax calls)
      triggerObserverService();
    }
  };

  // This is used to trigger _satellite service with relevant track msg
  const triggerObserverService = (data) => {
    if (data) {
      // Case of click event
      window?._satellite?.track("clickEventSuccess", data);
    } else {
      // Case of page load
      window?._satellite?.track("pageLoadSuccess");
    }
  };

  const createEventObj = (obj) => {
    const eveObj = {
      type: obj?.type || "click",
      subType: obj?.subType || "button",
      eventInfo: {},
    };

    switch (obj?.target) {
      case "form":
        eveObj.type = "form";
        break;

      case "accountSearch":
        eveObj.type = "accountSearch";
        eveObj.eventInfo.searchObj = obj?.searchObj;
        break;

      case "download":
        eveObj.type = "download";
        eveObj.eventInfo.fileName = obj?.fileName;
        break;

      case "selectAccount":
        eveObj.type = "selectAccount";
        eveObj.eventInfo.soldToSelect = obj?.soldToSelect;
        break;

      case "applyFilter":
        eveObj.type = "applyFilter";
        eveObj.eventInfo.applyFilter = obj?.applyFilter;
        break;

      case "impersonate":
        eveObj.type = "impersonate";
        eveObj.eventInfo.impersonate = obj?.impersonate;
        break;

      default:
        eveObj.type = "default";
    }

    return eveObj;
  };

  const updateSearchAnalyticsData = (props) => {
    const { params, response } = props;
    if (params) {
      const searchData = {
        ggp: params?.ggp || "",
        soldto: params?.soldto || "",
        status: response?.length ? true : false,
      };
      updateAnalytics({
        pageLoad: false,
        level: ["search"],
        data: [createSearchObject(searchData)],
      });
    }
  };

  const updateFilterAnalyticsData = (props) => {
    const {
      productName,
      subscriptionID,
      subscriptionName,
      productCategory,
      offerName,
      status,
      entitlement,
      meterCategory,
      consumptionStatus,
      summaryTags
    } = props;

      const filterData = {
        ...(productName?.length ? { productName: productName } : {}),
        ...(subscriptionID?.length ? { subscriptionID: subscriptionID } : {}),
        ...(subscriptionName?.length ? { subscriptionName: subscriptionName } : {}),
        ...(productCategory?.length ? { productCategory: productCategory } : {}),
        ...(offerName?.length ? { offerName: offerName } : {}),
        ...(status?.length ? { status: status } : {}),
        ...(entitlement?.length ? { entitlement: entitlement } : {}),
        ...(meterCategory?.length ? { meterCategory: meterCategory } : {}),
        ...(consumptionStatus?.length ? { consumptionStatus: consumptionStatus } : {}),
        ...(summaryTags?.length ? { summaryTags: summaryTags } : {}),
      };
      
      updateAnalytics({
        pageLoad: false,
        level: ["filter"],
        data: [filterData],
      });
  };

  const createSearchObject = (data) => {
    const searchData = {
      ggp: data?.ggp || "",
      soldto: data?.soldto || "",
      status: data?.status ? true : false,
    };
    // add conditionally check the search type (account search, filter search) to allocate the proper values
    return searchData;
  };

  return {
    constVal,
    createSearchObject,
    updateSearchAnalyticsData,
    updateAnalytics,
    updateFilterAnalyticsData
  };
};
