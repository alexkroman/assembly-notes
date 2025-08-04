import {
  ActionReducerMapBuilder,
  AsyncThunk,
  PayloadAction,
  Draft,
} from '@reduxjs/toolkit';

export interface AsyncState {
  loading: boolean;
  error: string | null;
}

export interface AsyncThunkHandlerOptions<S, R> {
  onPending?: (state: Draft<S>) => void;
  onFulfilled?: (state: Draft<S>, action: PayloadAction<R>) => void;
  onRejected?: (
    state: Draft<S>,
    action: { error?: { message?: string } }
  ) => void;
  errorMessage?: string;
}

/**
 * Handles standard async thunk lifecycle (pending, fulfilled, rejected)
 */
export function handleAsyncThunk<
  S extends AsyncState,
  R = unknown,
  A = unknown,
>(
  builder: ActionReducerMapBuilder<S>,
  thunk: AsyncThunk<R, A, object>,
  options: AsyncThunkHandlerOptions<S, R> = {}
) {
  const {
    onPending,
    onFulfilled,
    onRejected,
    errorMessage = 'Operation failed',
  } = options;

  builder
    .addCase(thunk.pending, (state) => {
      state.loading = true;
      state.error = null;
      if (onPending) {
        onPending(state);
      }
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      if (onFulfilled) {
        onFulfilled(state, action);
      }
    })
    .addCase(thunk.rejected, (state, action) => {
      state.loading = false;
      state.error =
        (action.error as { message?: string }).message ?? errorMessage;
      if (onRejected) {
        onRejected(state, action);
      }
    });
}

/**
 * Creates a standard async thunk handler for multiple operations
 */
export function createAsyncThunkHandlers<S extends AsyncState>(
  builder: ActionReducerMapBuilder<S>,
  thunks: {
    thunk: AsyncThunk<unknown, unknown, object>;
    onFulfilled?: (state: Draft<S>, action: PayloadAction<unknown>) => void;
    errorMessage?: string;
  }[]
) {
  thunks.forEach(({ thunk, onFulfilled, errorMessage }) => {
    const options: AsyncThunkHandlerOptions<S, unknown> = {};
    if (onFulfilled) {
      options.onFulfilled = onFulfilled;
    }
    if (errorMessage) {
      options.errorMessage = errorMessage;
    }
    handleAsyncThunk(builder, thunk, options);
  });
}
