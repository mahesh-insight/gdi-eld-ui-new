'use client';

import React from 'react';
import { Button } from '@progress/kendo-react-buttons';
import { useDownload } from './useDownload';

/**
 * Action Cell for Download Grid
 * Displays Download and Remove buttons for completed reports
 */
export function ActionCell(props) {
  const { dataItem } = props;
  console.log('🔍 ActionCell props:', props);
  console.log('🔍 ActionCell dataItem:', dataItem);
  console.log('🔍 ActionCell status:', dataItem?.status);
  
  const { downloadFile, removeFile } = useDownload();
  const status = dataItem?.status || '';
  const isComplete = status === 'Complete';
  
  console.log('🔍 ActionCell isComplete:', isComplete, 'status:', status);

  const handleDownload = () => {
    downloadFile(dataItem);
  };

  const handleRemove = () => {
    removeFile(dataItem);
  };

  if (!isComplete) {
    console.log('❌ ActionCell: Not complete, returning empty cell');
    return <td></td>;
  }

  console.log('✅ ActionCell: Rendering buttons!');
  return (
    <td className="k-command-cell">
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button
          onClick={handleDownload}
          size="small"
        >
          Download
        </Button>
        <Button
          onClick={handleRemove}
          size="small"
          fillMode="outline"
        >
          Remove
        </Button>
      </div>
    </td>
  );
}
