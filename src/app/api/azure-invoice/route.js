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
import { 
  fetchInvoiceSummary,
  fetchInvoiceCredits, 
  fetchInvoiceTrend
} from '@/lib/azureInvoiceApi';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, soldToId, selectedMonth, month, currentMonth, previousMonth } = body;

    console.log('🚀 Azure Invoice API called with:', { action, soldToId, selectedMonth, month });
    console.log('🔍 Request URL:', request.url);
    console.log('🔍 Request method:', request.method);

    // Get authentication from cookies OR Authorization header
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    const userContextCookie = cookieStore.get('user_context');
    
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    console.log('🔐 Auth check:', {
      hasCookieToken: !!accessTokenCookie,
      hasCookieContext: !!userContextCookie,
      hasBearerToken: !!bearerToken,
      authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
    });
    
    // Use cookie authentication first, fallback to Bearer token
    let accessToken = accessTokenCookie;
    let userContext = userContextCookie;
    
    // If no cookie auth but we have Bearer token, create mock objects
    if ((!accessToken || !userContext) && bearerToken) {
      console.log('✅ Using Bearer token authentication for client-side call');
      accessToken = { value: bearerToken };
      userContext = { value: '{}' }; // Mock user context for Bearer auth
    }
    
    if (!accessToken || !userContext) {
      console.log('❌ No authentication available - neither cookies nor Bearer token');
      return NextResponse.json({
        error: 'Authentication required',
        success: false,
        data: null
      }, { status: 401 });
    }

    console.log('✅ Authentication successful:', {
      tokenSource: accessTokenCookie ? 'cookie' : 'bearer',
      tokenLength: accessToken.value?.length || 0
    });

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
      case 'combinedMonthData':
        // NEW: Single combined endpoint for month changes
        console.log('🚨🚨🚨 COMBINED MONTH DATA CASE REACHED 🚨🚨🚨');
        const monthValue = month || selectedMonth;
        if (!monthValue) {
          return NextResponse.json({
            error: 'Month parameter required',
            success: false,
            data: null
          }, { status: 400 });
        }
        
        console.log('🎯 Combined Month Data API called for month:', monthValue);
        console.log('🔐 Auth debugging for combined call:', {
          hasAccessToken: !!accessToken,
          hasUserContext: !!userContext,
          accessTokenType: typeof accessToken?.value,
          accessTokenLength: accessToken?.value?.length || 0,
          userContextType: typeof userContext?.value
        });
        
        // Extract soldToId from array if needed
        const soldToIdStr = Array.isArray(soldToId) ? soldToId[0] : soldToId;
        
        console.log('🔧 Making combined API calls for soldToId:', soldToIdStr);
        
        // For Bearer token auth, call the API functions directly instead of server actions
        if (bearerToken && !accessTokenCookie) {
          console.log('� TAKING BEARER TOKEN PATH 🚨');
          console.log('🔧 Using direct API calls with Bearer token for combined request');
          
          // Make all five calls directly with the Bearer token (including invoice details and monthly difference)
          const [summaryResult, creditsResult, trendsResult, invoiceDetailsResult, monthlyDifferenceResult] = await Promise.allSettled([
            fetchInvoiceSummary({ soldToId: soldToIdStr, value: monthValue, accessToken: bearerToken }),
            fetchInvoiceCredits({ soldToId: soldToIdStr, value: monthValue, accessToken: bearerToken }),
            fetchInvoiceTrend({ soldToId: soldToIdStr, months: 6, accessToken: bearerToken }),
            // Invoice details call
            (async () => {
              const { callAzureInvoiceAPI } = await import('@/lib/azureInvoiceApi');
              const formattedMonth = monthValue.replace('-', '');
              const apiPayload = {
                payload: [soldToIdStr],
                urlParam: `${formattedMonth}?page=0&size=20`
              };
              return await callAzureInvoiceAPI('invoiceMonthDetail', apiPayload, bearerToken);
            })(),
            // Monthly difference call
            (async () => {
              const { callAzureInvoiceAPI } = await import('@/lib/azureInvoiceApi');
              
              // Calculate previous month for monthly difference
              let year, month;
              if (monthValue.includes('-')) {
                [year, month] = monthValue.split('-');
              } else if (monthValue.length === 6) {
                year = monthValue.substring(0, 4);
                month = monthValue.substring(4, 6);
              } else {
                throw new Error('Invalid month format');
              }
              
              const currentMonthStr = year + (month.length === 1 ? '0' + month : month);
              let prevYear = parseInt(year);
              let prevMonth = parseInt(month) - 1;
              if (prevMonth < 1) {
                prevMonth = 12;
                prevYear -= 1;
              }
              const prevMonthStr = prevYear.toString() + (prevMonth < 10 ? '0' + prevMonth : prevMonth.toString());
              
              const apiPayload = {
                payload: [soldToIdStr],
                urlParam: `${prevMonthStr}/${currentMonthStr}?page=0&size=20`
              };
              return await callAzureInvoiceAPI('invoiceMonthlyDifferenceDetail', apiPayload, bearerToken);
            })()
          ]);
          
          console.log('🔍 DETAILED API RESULTS DEBUGGING:');
          console.log('📊 Summary result:', {
            status: summaryResult.status,
            hasValue: !!summaryResult.value,
            valueType: typeof summaryResult.value,
            hasError: !!summaryResult.value?.error,
            errorMessage: summaryResult.value?.error,
            valueKeys: summaryResult.value ? Object.keys(summaryResult.value) : 'none',
            fullValue: summaryResult.value
          });
          console.log('💰 Credits result:', {
            status: creditsResult.status,
            hasValue: !!creditsResult.value,
            valueType: typeof creditsResult.value,
            hasError: !!creditsResult.value?.error,
            errorMessage: creditsResult.value?.error,
            valueKeys: creditsResult.value ? Object.keys(creditsResult.value) : 'none'
          });
          console.log('📈 Trends result:', {
            status: trendsResult.status,
            hasValue: !!trendsResult.value,
            valueType: typeof trendsResult.value,
            hasError: !!trendsResult.value?.error,
            errorMessage: trendsResult.value?.error,
            valueKeys: trendsResult.value ? Object.keys(trendsResult.value) : 'none'
          });
          console.log('📋 Invoice Details result:', {
            status: invoiceDetailsResult.status,
            hasValue: !!invoiceDetailsResult.value,
            valueType: typeof invoiceDetailsResult.value,
            hasError: !!invoiceDetailsResult.value?.error,
            errorMessage: invoiceDetailsResult.value?.error,
            valueKeys: invoiceDetailsResult.value ? Object.keys(invoiceDetailsResult.value) : 'none'
          });
          console.log('📊 Monthly Difference result:', {
            status: monthlyDifferenceResult.status,
            hasValue: !!monthlyDifferenceResult.value,
            valueType: typeof monthlyDifferenceResult.value,
            hasError: !!monthlyDifferenceResult.value?.error,
            errorMessage: monthlyDifferenceResult.value?.error,
            valueKeys: monthlyDifferenceResult.value ? Object.keys(monthlyDifferenceResult.value) : 'none'
          });
          
          // Check if data has results even if it has error flag
          const summaryData = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
          const creditsData = creditsResult.status === 'fulfilled' ? creditsResult.value : null;
          const trendsData = trendsResult.status === 'fulfilled' ? trendsResult.value : null;
          const invoiceDetailsData = invoiceDetailsResult.status === 'fulfilled' ? invoiceDetailsResult.value : null;
          const monthlyDifferenceData = monthlyDifferenceResult.status === 'fulfilled' ? monthlyDifferenceResult.value : null;
          
          result = {
            error: null,
            success: true,
            data: {
              summary: summaryData,
              credits: creditsData,
              trend: trendsData,
              invoiceDetails: invoiceDetailsData,
              monthlyDifference: monthlyDifferenceData,
              monthValue: monthValue
            }
          };
        } else {
          console.log('🚨 TAKING COOKIE/SERVER ACTION PATH 🚨');
          console.log('🔧 Using server actions for cookie-based authentication');
          
          // Make all five calls via server actions (cookie auth)
          const [summaryResult, creditsResult, trendsResult, invoiceDetailsResult, monthlyDifferenceResult] = await Promise.allSettled([
            fetchSummaryDataServer(soldToIdStr, monthValue),
            fetchCreditsDataServer(soldToIdStr, monthValue), 
            fetchTrendsDataServer(soldToIdStr, monthValue),
            fetchInvoiceDetailsServer(soldToIdStr, monthValue),
            // Monthly difference server action
            (async () => {
              // Calculate previous month
              let year, month;
              if (monthValue.includes('-')) {
                [year, month] = monthValue.split('-');
              } else if (monthValue.length === 6) {
                year = monthValue.substring(0, 4);
                month = monthValue.substring(4, 6);
              } else {
                throw new Error('Invalid month format');
              }
              
              const currentMonthStr = year + (month.length === 1 ? '0' + month : month);
              let prevYear = parseInt(year);
              let prevMonth = parseInt(month) - 1;
              if (prevMonth < 1) {
                prevMonth = 12;
                prevYear -= 1;
              }
              const prevMonthStr = prevYear.toString() + (prevMonth < 10 ? '0' + prevMonth : prevMonth.toString());
              
              return await fetchMonthlyDifferenceServer(soldToIdStr, currentMonthStr, prevMonthStr);
            })()
          ]);
          
          console.log('🔍 DETAILED SERVER ACTION RESULTS DEBUGGING:');
          console.log('📊 Summary server result:', {
            status: summaryResult.status,
            hasValue: !!summaryResult.value,
            valueType: typeof summaryResult.value,
            hasError: !!summaryResult.value?.error,
            errorMessage: summaryResult.value?.error,
            hasData: !!summaryResult.value?.data,
            valueKeys: summaryResult.value ? Object.keys(summaryResult.value) : 'none',
            fullValue: summaryResult.value
          });
          console.log('💰 Credits server result:', {
            status: creditsResult.status,
            hasValue: !!creditsResult.value,
            valueType: typeof creditsResult.value,
            hasError: !!creditsResult.value?.error,
            errorMessage: creditsResult.value?.error,
            hasData: !!creditsResult.value?.data,
            valueKeys: creditsResult.value ? Object.keys(creditsResult.value) : 'none'
          });
          console.log('📈 Trends server result:', {
            status: trendsResult.status,
            hasValue: !!trendsResult.value,
            valueType: typeof trendsResult.value,
            hasError: !!trendsResult.value?.error,
            errorMessage: trendsResult.value?.error,
            hasData: !!trendsResult.value?.data,
            valueKeys: trendsResult.value ? Object.keys(trendsResult.value) : 'none'
          });
          console.log('📋 Invoice Details server result:', {
            status: invoiceDetailsResult.status,
            hasValue: !!invoiceDetailsResult.value,
            valueType: typeof invoiceDetailsResult.value,
            hasError: !!invoiceDetailsResult.value?.error,
            errorMessage: invoiceDetailsResult.value?.error,
            hasData: !!invoiceDetailsResult.value?.data,
            valueKeys: invoiceDetailsResult.value ? Object.keys(invoiceDetailsResult.value) : 'none'
          });
          console.log('📊 Monthly Difference server result:', {
            status: monthlyDifferenceResult.status,
            hasValue: !!monthlyDifferenceResult.value,
            valueType: typeof monthlyDifferenceResult.value,
            hasError: !!monthlyDifferenceResult.value?.error,
            errorMessage: monthlyDifferenceResult.value?.error,
            hasData: !!monthlyDifferenceResult.value?.data,
            valueKeys: monthlyDifferenceResult.value ? Object.keys(monthlyDifferenceResult.value) : 'none'
          });
          
          result = {
            error: null,
            success: true,
            data: {
              summary: summaryResult.status === 'fulfilled' && !summaryResult.value.error ? summaryResult.value.data : null,
              credits: creditsResult.status === 'fulfilled' && !creditsResult.value.error ? creditsResult.value.data : null,
              trend: trendsResult.status === 'fulfilled' && !trendsResult.value.error ? trendsResult.value.data : null,
              invoiceDetails: invoiceDetailsResult.status === 'fulfilled' && !invoiceDetailsResult.value.error ? invoiceDetailsResult.value.data : null,
              monthlyDifference: monthlyDifferenceResult.status === 'fulfilled' && !monthlyDifferenceResult.value.error ? monthlyDifferenceResult.value : null,
              monthValue: monthValue
            }
          };
        }
        
        console.log('✅ Combined month data results:', {
          summary: !!result.data.summary,
          credits: !!result.data.credits,
          trend: !!result.data.trend,
          invoiceDetails: !!result.data.invoiceDetails,
          monthlyDifference: !!result.data.monthlyDifference
        });
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
