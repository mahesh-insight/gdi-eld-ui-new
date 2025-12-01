import React from "react";
import { Link } from "react-router-dom";
import {
  detailLoadingState,
  filterQuery,
  locationObjectState,
} from "../../../src/recoil/pageAtoms";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { formatDateToJSON } from "../../../src/library/api/chartDataUtils";

const ViewDetailLinkCell = (props) => {
  const setDetailLoadingState = useSetRecoilState(detailLoadingState);
  const setLocationObjectState = useSetRecoilState(locationObjectState);
  const setFilterQuery = useSetRecoilState(filterQuery);

  const dataItem = props?.dataItem;
  const haveDetails = dataItem?.haveDetail;
  const isLocationState = useRecoilValue(locationObjectState) || JSON.parse(sessionStorage?.location_state);

  const redirectToBilled = async (e) => {
    let providerObject;
    setDetailLoadingState(false);
    let provider = dataItem.provider;
    const invoiceNumber = dataItem.invoiceNumber;
    const invoiceNumberObject = {
      label: invoiceNumber,
      value: invoiceNumber,
    };
    const invoiceMonth = formatDateToJSON(dataItem?.invoiceDate);

    providerObject = {
      provider: provider,
      dataExists: {
        exists: true,
        existsForDate: false,
      },
      abbreviation: provider?.toLowerCase(),
    };
    const newLocationState = {
      ...isLocationState,
      nestedRedirect: "Invoice History",
      providerObject: providerObject,
      invoiceNumber: invoiceNumberObject,
      invoiceMonth: invoiceMonth,
      currentMonthObject: invoiceMonth,
    };
    setLocationObjectState(newLocationState);
    setFilterQuery([]);
  };

  return (
    <td {...props.tdProps} className="k-command-cell">
      {haveDetails && (
        <Link className="redirect" to="/Invoices" onClick={redirectToBilled}>
          View Details
        </Link>
      )}
    </td>
  );
};

export default ViewDetailLinkCell;
