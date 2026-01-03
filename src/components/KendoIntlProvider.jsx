"use client";

import { IntlProvider } from '@progress/kendo-react-intl';

export const KendoIntlProvider = ({ children }) => {
  // IntlProvider can work without CLDR data for basic functionality
  // If advanced localization is needed, CLDR data should be loaded server-side
  return <IntlProvider locale="en">{children}</IntlProvider>;
};
