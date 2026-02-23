'use server';

import { cookies } from 'next/headers';
import { serverApiClient } from '@/lib/api/request';
import { getService } from '@/lib/api/services';

/**
 * Get access token from cookies
 * @returns {string|null} Access token or null
 */
async function getAccessToken() {
  try {
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get('access_token');
    return accessTokenCookie?.value || null;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Get base URL for API requests
 * @returns {string} Base URL
 */
function getBaseURL() {
  const serviceConfig = getService('providers'); // Use providers service config
  return serviceConfig.baseURL;
}

/**
 * Fetch user's download requests history
 * @param {string} requestTypeID - The request type identifier
 * @returns {Promise<Object>} Download history response
 */
export async function fetchDownloadHistory(requestTypeID) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }
    
    const baseURL = getBaseURL();
    const url = `${baseURL}/ccr-download-service/user?requestTypeID=${requestTypeID}`;
    
    console.log('📥 Fetching download history:', { requestTypeID, url });
    
    const response = await serverApiClient.get(url, accessToken);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('fetchDownloadHistory error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch download history',
    };
  }
}

/**
 * Check for pending download requests
 * @param {string} requestTypeID - The request type identifier
 * @returns {Promise<Object>} Pending status response
 */
export async function checkPendingDownloads(requestTypeID) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        hasPending: false,
        error: 'Authentication required',
      };
    }
    
    const baseURL = getBaseURL();
    const url = `${baseURL}/ccr-download-service/open?requestTypeID=${requestTypeID}`;
    
    console.log('🔍 Checking pending downloads:', { requestTypeID, url });
    
    const response = await serverApiClient.get(url, accessToken);
    
    const hasPending = response.data?.content?.length > 0;
    
    return {
      success: true,
      hasPending,
      data: response.data,
    };
  } catch (error) {
    console.error('checkPendingDownloads error:', error);
    return {
      success: false,
      hasPending: false,
      error: error.message || 'Failed to check pending downloads',
    };
  }
}

/**
 * Submit a new download request using Quartz scheduler
 * @param {Object} payload - The Quartz download payload
 * @returns {Promise<Object>} Download request response
 */
export async function submitDownloadRequest(payload) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }
    
    const baseURL = getBaseURL();
    const url = `${baseURL}/ccr-task-service/schedulereport`;
    
    console.log('📤 Submitting download request:', { url, payload });
    
    const response = await serverApiClient.post(url, payload, accessToken);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('submitDownloadRequest error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit download request',
    };
  }
}

/**
 * Delete a download request
 * @param {string} downloadId - The download ID to delete
 * @returns {Promise<Object>} Delete response
 */
export async function deleteDownloadRequest(downloadId) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }
    
    const baseURL = getBaseURL();
    const url = `${baseURL}/ccr-download-service/downloads/${downloadId}`;
    
    console.log('🗑️ Deleting download request:', { url, downloadId });
    
    const response = await serverApiClient.delete(url, accessToken);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('deleteDownloadRequest error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete download request',
    };
  }
}

/**
 * Download a file by ID
 * @param {string} downloadId - The download ID
 * @returns {Promise<Object>} Download response with file data
 */
export async function downloadFileById(downloadId) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }
    
    const baseURL = getBaseURL();
    const url = `${baseURL}/ccr-download-service/download/${downloadId}`;
    
    console.log('📥 Downloading file:', { url, downloadId });
    
    // Use serverApiClient to download blob with proper authentication
    const response = await serverApiClient.downloadBlob(url, accessToken);
    
    // Convert ArrayBuffer to Uint8Array for serialization
    const uint8Array = new Uint8Array(response.data);
    
    return {
      success: true,
      data: Array.from(uint8Array), // Convert to regular array for serialization
      contentType: response.headers['content-type'],
    };
  } catch (error) {
    console.error('downloadFileById error:', error);
    return {
      success: false,
      error: error.message || 'Failed to download file',
    };
  }
}
