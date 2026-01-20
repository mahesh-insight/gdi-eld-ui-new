"use client";

import React from 'react';
import { Input } from '@progress/kendo-react-inputs';
import styles from './SwitchAccount.module.scss';

const SearchInput = ({ value, onChange, placeholder = "Search accounts..." }) => {
  return (
    <div className={styles.searchContainer}>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.searchInput}
      />
    </div>
  );
};

export default SearchInput;
