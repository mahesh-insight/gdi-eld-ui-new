/**
 * This method will setup the initial digitalData object across the site pages.
 * @param {Object} response
 * @returns {*}
 * @project:    ELD
 * @date:       2023-10-27
 * @author:     Mahesh
 */

export default function Analytics(props) {
  const { countryCode, ggp, regionCode, persona, isLoggedIn, soldToID, soldTo, soldToName, userType } = props || {};
  let digitalData;
  const title = window?.document?.title;
  const domain = window?.location?.host;
  const siteLanguage = "en";
  const url = window?.location?.href;
  const pathName = window?.location?.pathname?.slice(1);
  const updatedRegionCode = regionCode || 'NA';
  const updatedSiteLanguage = siteLanguage || 'en';
  const updatedCountryCode = countryCode || 'US';
  const pageName = `${domain}|${updatedRegionCode}|${updatedCountryCode}|${updatedSiteLanguage}|${title}`;

  digitalData = {
    authentication: {
      authenticatedSession: isLoggedIn || false,
      businessType: "",
      ggp: ggp || '',
      repId: soldToID || '',
      soldTo: soldTo || '',
      soldToName: soldToName || '',
      userType: userType || '',
      webAccount: "",
      webGroup: "",
    },
    category: {
      pageType: "",
      siteSection: "ELD",
      siteSection2: pathName || '',
      siteSection3: "",
      siteSection4: "",
    },
    pageInfo: {
      pageName: pageName || '',
      domain: domain || '',
      siteCountry: updatedCountryCode,
      siteLanguage: updatedSiteLanguage,
      siteRegion: updatedRegionCode,
      url: url || '',
    },
  };

  return digitalData;
};
