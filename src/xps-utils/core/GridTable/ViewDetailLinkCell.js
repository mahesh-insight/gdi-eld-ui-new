import React from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { setDetailLoadingState, setLocationObjectState, setFilterQuery } from "../../../src/lib/store/slices/pageSlice";
import { formatDateToJSON } from "../../../src/library/api/chartDataUtils";

const ViewDetailLinkCell = (props) => {
  const dispatch = useDispatch();
  const locationObjectState = useSelector(state => state.page.locationObjectState);

  const dataItem = props?.dataItem;
  const haveDetails = dataItem?.haveDetail;
  const isLocationState = locationObjectState || JSON.parse(sessionStorage?.location_state || '{}');

  const redirectToBilled = async (e) => {
    let providerObject;
    dispatch(setDetailLoadingState(false));
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
    dispatch(setLocationObjectState(newLocationState));
    dispatch(setFilterQuery([]));
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
