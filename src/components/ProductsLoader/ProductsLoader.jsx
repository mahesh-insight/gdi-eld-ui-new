// src/components/ProductsLoader/ProductsLoader.jsx
"use client";

import { useRef, useEffect } from 'react';
import { Skeleton } from '@progress/kendo-react-indicators';

export const ProductsLoader = (props) => {
  const {
    filterQuery,
    usageMonth,
    page = 0,
    pageSize = 20,
    apiEndPoint,
    tenantId,
    status,
    callType = 'post',
    requestTypeID,
    name,
    onDataReceived,
    dataState,
    data,
    loading = false
  } = props;

  const lastSuccess = useRef("");
  const pending = useRef("");

  const requestDataIfNeeded = async () => {
    // For Azure Invoice, we already have the data from SSR, so just pass it through
    if (!usageMonth && name?.includes('azureInvoice')) {
      return;
    }

    const requestSignature = `${page}|${pageSize}|${filterQuery}|${usageMonth}|${status}|${apiEndPoint}`;
    
    if (pending?.current || requestSignature === lastSuccess?.current) {
      return;
    }

    pending.current = requestSignature;

    try {
      // For now, we'll use the data passed as props (from SSR)
      // In the future, this can be extended to make actual API calls
      if (data && onDataReceived) {
        const products = {
          data: Array.isArray(data) ? data : data.data || [],
          total: Array.isArray(data) ? data.length : data.total || data.data?.length || 0,
        };
        
        lastSuccess.current = pending?.current;
        pending.current = "";
        
        onDataReceived.call(undefined, products);
      }
    } catch (error) {
      console.error("ProductsLoader error:", error);
      pending.current = "";
    }
  };

  useEffect(() => {
    requestDataIfNeeded();
  }, [page, pageSize, usageMonth, data]);

  return loading && pending.current ? (
    <Skeleton
      shape="rectangle"
      style={{
        width: "100%",
        height: 50,
        marginTop: -3,
      }}
    />
  ) : null;
};