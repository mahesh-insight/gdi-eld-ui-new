// src/app/azure-invoice/loading.js
"use client";
import { Skeleton } from '@progress/kendo-react-indicators';

export default function Loading() {
  return (
    <div>
      <div style={{
        padding: '20px 40px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: '#f8f9fa'
      }}>
        <h1 style={{ 
          margin: '0', 
          color: '#2c3e50',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Azure Invoice Dashboard
        </h1>
      </div>
      
      <div className="main_content_container azure-invoice-component">
        <div className="c-container" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Summary Cards Skeleton */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '40px', 
            marginBottom: '30px',
            paddingTop: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Skeleton shape="rectangle" style={{ width: '200px', height: '80px', marginBottom: '10px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <Skeleton shape="rectangle" style={{ width: '200px', height: '80px', marginBottom: '10px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <Skeleton shape="rectangle" style={{ width: '200px', height: '80px', marginBottom: '10px' }} />
            </div>
          </div>

          {/* Month Selector Skeleton */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <Skeleton shape="rectangle" style={{ width: '250px', height: '40px' }} />
          </div>

          {/* Filters Skeleton */}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginBottom: '20px',
            alignItems: 'end'
          }}>
            <Skeleton shape="rectangle" style={{ width: '200px', height: '40px' }} />
            <Skeleton shape="rectangle" style={{ width: '200px', height: '40px' }} />
            <Skeleton shape="rectangle" style={{ width: '200px', height: '40px' }} />
            <Skeleton shape="rectangle" style={{ width: '120px', height: '40px' }} />
          </div>

          {/* Charts Section Skeleton */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1 }}>
              <Skeleton shape="text" style={{ width: '300px', height: '20px', marginBottom: '20px' }} />
              <Skeleton shape="rectangle" style={{ width: '100%', height: '300px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <Skeleton shape="text" style={{ width: '300px', height: '20px', marginBottom: '20px' }} />
              <Skeleton shape="rectangle" style={{ width: '100%', height: '300px' }} />
            </div>
          </div>

          {/* Table Skeleton */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              <div style={{ padding: '20px' }}>
                <Skeleton shape="text" style={{ width: '200px', height: '20px', marginBottom: '20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} shape="rectangle" style={{ width: '100%', height: '30px' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}