import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  context: null
};

const navigationContextSlice = createSlice({
  name: 'navigationContext',
  initialState,
  reducers: {
    setNavigationContext(state, action) {
      state.context = action.payload;
    },
    clearNavigationContext(state) {
      state.context = null;
    }
  }
});

export const { setNavigationContext, clearNavigationContext } = navigationContextSlice.actions;
export default navigationContextSlice.reducer;
