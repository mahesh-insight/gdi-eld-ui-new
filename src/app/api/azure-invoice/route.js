// src/app/api/azure-invoice/route.js
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { 
  fetchInvoiceMonthsServer,
  fetchSummaryDataServer,
  fetchCreditsDataServer,
  fetchTrendsDataServer,
  fetchAzureInvoiceDataForMonth,
  fetchInvoiceDetailsServer,
  fetchMonthlyDifferenceServer
} from '../../azure-invoice/actions';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, soldToId, selectedMonth, month, currentMonth, previousMonth } = body;

    console.log('🚀 Azure Invoice API called with:', { action, soldToId, selectedMonth, month });

    // Get authentication from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token');
    const userContext = cookieStore.get('user_context');
    
    if (!accessToken || !userContext) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false,
        data: null
      }, { status: 401 });
    }

    let result;
    
    switch (action) {
      case 'months':
        result = await fetchInvoiceMonthsServer(soldToId);
        break;
      case 'summary':
        result = await fetchSummaryDataServer(soldToId, selectedMonth);
        break;
      case 'credits':
        result = await fetchCreditsDataServer(soldToId, selectedMonth);
        break;
      case 'trends':
        result = await fetchTrendsDataServer(soldToId, selectedMonth);
        break;
      case 'invoiceDetails':
        result = await fetchInvoiceDetailsServer(soldToId, month);
        break;
      case 'monthlyDifference':
        result = await fetchMonthlyDifferenceServer(soldToId, currentMonth, previousMonth);
        break;
      case 'monthData':
        const monthParam = month || selectedMonth;
        if (!monthParam) {
          return NextResponse.json({
            error: 'Month parameter required',
            success: false,
            data: null
          }, { status: 400 });
        }
        // Use consolidated function that fetches all data for the month
        const monthObject = typeof monthParam === 'string' ? { value: monthParam } : monthParam;
        // Extract soldToId from array if needed (client sends it as array)
        const soldToIdString = Array.isArray(soldToId) ? soldToId[0] : soldToId;
        console.log('🔧 API Route: Converting soldToId from', soldToId, 'to', soldToIdString);
        result = await fetchAzureInvoiceDataForMonth(soldToIdString, monthObject);
        break;
      case 'getAllData':
        // Consolidated endpoint that fetches months + first month data
        const monthsResult = await fetchInvoiceMonthsServer(soldToId);
        if (monthsResult.error || !monthsResult.data?.invoiceMonths?.length) {
          result = monthsResult;
        } else {
          const firstMonth = monthsResult.data.invoiceMonths[0];
          const monthDataResult = await fetchAzureInvoiceDataForMonth(soldToId, firstMonth);
          result = {
            error: null,
            data: {
              invoiceMonths: monthsResult.data.invoiceMonths,
              selectedMonth: firstMonth,
              ...monthDataResult.data
            }
          };
        }
        break;
      default:
        return NextResponse.json({
          error: 'Invalid action parameter',
          success: false,
          data: null
        }, { status: 400 });
    }

    console.log('✅ API call completed for action:', action);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Azure Invoice API Error:', error);
    return NextResponse.json({
      error: error.message || 'Internal server error',
      success: false,
      data: null
    }, { status: 500 });
  }
}
