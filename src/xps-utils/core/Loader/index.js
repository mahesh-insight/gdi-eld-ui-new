/**
 * This method will show the Loader.
 * @param {Object} response 
 * @returns {*}
 * @project:    ELD
 * @date:       2023-10-09
 * @author:     Mahesh
 */

import React from 'react';
import './loader.scss';

function Loader(props) {
  if (!props.isLoading) return null
  return (
    <div className='page-loader-wrapper'>
      <svg className="page-loader-spinner" viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="2"></circle>
      </svg>
    </div>
  )
}

function PlainLoader(props) {
  if (!props.isPlainLoading) return null
  return (
    <div className='page-loader-wrapper'>
      <svg className="page-loader-spinner" viewBox="0 0 50 50">
        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="2"></circle>
      </svg>
    </div>
  )
}


export { PlainLoader };
export default Loader;