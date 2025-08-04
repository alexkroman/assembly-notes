import { PayloadAction } from '@reduxjs/toolkit';

export interface ErrorState {
  error: string | null;
}

export interface LoadingState {
  loading: boolean;
}

export interface AsyncState extends ErrorState, LoadingState {}

/**
 * Creates standard error handling reducers
 */
export function createErrorHandlers(sliceName: string) {
  return {
    [`set${sliceName}Error`]: (
      state: ErrorState,
      action: PayloadAction<string>
    ) => {
      state.error = action.payload;
    },
    [`clear${sliceName}Error`]: (state: ErrorState) => {
      state.error = null;
    },
  };
}

/**
 * Creates a standard clear/reset reducer
 */
export function createResetHandler<S>(initialState: S) {
  return (): S => initialState;
}

/**
 * Standard loading state reducers
 */
export const loadingReducers = {
  startLoading: (state: LoadingState) => {
    state.loading = true;
  },
  stopLoading: (state: LoadingState) => {
    state.loading = false;
  },
};
