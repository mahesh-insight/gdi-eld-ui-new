'use client';

import React from 'react';
import { ProgressBar } from '@progress/kendo-react-progressbars';

/**
 * Progress Bar Cell for Download Grid
 * Displays progress percentage with visual progress bar
 */
export function ProgressBarCell(props) {
  const { dataItem } = props;
  const percentComplete = dataItem?.percentComplete || 0;
  const processTimespan = dataItem?.processTimespan || '';
  const status = dataItem?.status || 'Pending';
  const currentStep = dataItem?.currentStep || 0;
  const totalSteps = dataItem?.totalSteps || 1;

  // If completed (100%), show only status text
  if (status === 'Complete' && percentComplete === 100) {
    return (
      <td>
        <span>
          Complete
        </span>
      </td>
    );
  }

  // Determine progress bar color based on status
  let progressColor = '#ae0a46'; // Dark pink/magenta (in progress)
  if (status === 'Failed' || status === 'Error') {
    progressColor = '#d13438'; // Red
  }

  return (
    <td>
      <div style={{ position: 'relative', width: '100%', height: '20px' }}>
        <ProgressBar
          value={percentComplete}
          style={{ 
            width: '100%',
            height: '20px',
          }}
          progressStyle={{
            backgroundColor: progressColor,
          }}
          label={() => null}
        />
        <span style={{ 
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          fontSize: '12px', 
          color: '#5f5753',
          fontWeight: '500',
          pointerEvents: 'none'
        }}>
          {percentComplete}%
        </span>
      </div>
    </td>
  );
}
