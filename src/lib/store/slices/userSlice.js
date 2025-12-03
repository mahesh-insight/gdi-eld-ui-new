// src/lib/store/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Logged in state
  isLoggedInState: false,
  
  // User state
  userState: [{
    userID: "XX12345",
    role: "",
    isImpersonated: "",
    isSuperUser: "",
    firstName: "",
    lastName: "",
    haveTargetedSoldTos: "",
    soldToList: [{
      soldToName: "",
      soldTo: "",
      soldToID: ""
    }]
  }],
  
  // Selected account state
  selectedAccountState: [{
    reseller: "",
    soldToID: "",
    soldToName: "",
    soldTo: "",
    ggp: "",
    ggpName: "",
    tenantIds: "",
  }],
  
  // Customer search state
  customerSearchState: [{
    data: [],
    value: "",
    opened: false,
    suggest: ""
  }],
  
  // Invoice month state
  invoiceMonthState: [],
  
  // Login response state
  loginResponseState: [{
    soldToID: "",
    soldToName: "",
    soldTo: "",
    ggp: "",
    ggpName: "",
    userType: "",
  }],
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Logged in state actions
    setIsLoggedInState: (state, action) => {
      state.isLoggedInState = action.payload;
    },
    
    // User state actions
    setUserState: (state, action) => {
      state.userState = action.payload;
    },
    updateUserState: (state, action) => {
      state.userState[0] = { ...state.userState[0], ...action.payload };
    },
    
    // Selected account actions
    setSelectedAccountState: (state, action) => {
      state.selectedAccountState = action.payload;
    },
    updateSelectedAccountState: (state, action) => {
      state.selectedAccountState[0] = { ...state.selectedAccountState[0], ...action.payload };
    },
    
    // Customer search actions
    setCustomerSearchState: (state, action) => {
      state.customerSearchState = action.payload;
    },
    updateCustomerSearchState: (state, action) => {
      state.customerSearchState[0] = { ...state.customerSearchState[0], ...action.payload };
    },
    
    // Invoice month actions
    setInvoiceMonthState: (state, action) => {
      state.invoiceMonthState = action.payload;
    },
    addInvoiceMonth: (state, action) => {
      state.invoiceMonthState.push(action.payload);
    },
    removeInvoiceMonth: (state, action) => {
      state.invoiceMonthState = state.invoiceMonthState.filter((_, index) => index !== action.payload);
    },
    
    // Login response actions
    setLoginResponseState: (state, action) => {
      state.loginResponseState = action.payload;
    },
    updateLoginResponseState: (state, action) => {
      state.loginResponseState[0] = { ...state.loginResponseState[0], ...action.payload };
    },
    
    // Clear all user state (utility action)
    clearUserState: (state) => {
      return initialState;
    },
    
    // Logout action (clears all user data)
    logoutUser: (state) => {
      state.isLoggedInState = false;
      state.userState = initialState.userState;
      state.selectedAccountState = initialState.selectedAccountState;
      state.customerSearchState = initialState.customerSearchState;
      state.invoiceMonthState = [];
      state.loginResponseState = initialState.loginResponseState;
    }
  },
});

export const {
  // Logged in state actions
  setIsLoggedInState,
  
  // User state actions
  setUserState,
  updateUserState,
  
  // Selected account actions
  setSelectedAccountState,
  updateSelectedAccountState,
  
  // Customer search actions
  setCustomerSearchState,
  updateCustomerSearchState,
  
  // Invoice month actions
  setInvoiceMonthState,
  addInvoiceMonth,
  removeInvoiceMonth,
  
  // Login response actions
  setLoginResponseState,
  updateLoginResponseState,
  
  // Utility actions
  clearUserState,
  logoutUser
} = userSlice.actions;

export default userSlice.reducer;