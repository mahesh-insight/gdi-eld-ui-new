import React, { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@progress/kendo-react-progressbars";
import './progressBar.css';

export const MyProgressBar = (props) => {
  const { status, percentComplete } = props?.dataItem;
  const [progressValue, setProgressValue] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (status === "Downloading") {
      setProgressValue(0);
      startInterval();
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setProgressValue(percentComplete || 0);
    }

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [status, percentComplete]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setProgressValue((prevValue) => {
        const nextValue = Math.min(prevValue + 1, percentComplete);
        if (nextValue >= percentComplete) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return nextValue;
      });
    }, 30000);
  }, [percentComplete]);

  if (status === "Pending" || status === "Complete" || status === "Failed") {
    return <td>{status}</td>;
  } else {
    return (
      <td>
        <div className="progress-container">
          <ProgressBar value={progressValue} />
         <span className="progress-label">{progressValue}%</span>
      </div>
      </td>
    );
  }
};