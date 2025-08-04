import { PayloadAction } from '@reduxjs/toolkit';

export interface Identifiable {
  id: string;
}

export interface Timestamped {
  updated_at?: number;
}

/**
 * Updates an entity in multiple arrays by ID
 * Automatically adds updated_at timestamp if the entity has that field
 */
export function updateEntityInArrays<T extends Identifiable & Timestamped>(
  updates: {
    id: string;
    changes: Partial<T>;
  },
  ...arrays: (T[] | null | undefined)[]
): void {
  const { id, changes } = updates;
  const timestamp = Date.now();

  arrays.forEach((array) => {
    if (!array) return;

    const index = array.findIndex((item) => item.id === id);
    if (index !== -1 && array[index]) {
      Object.assign(array[index], changes, { updated_at: timestamp });
    }
  });
}

/**
 * Removes an entity from multiple arrays by ID
 */
export function removeEntityFromArrays<T extends Identifiable>(
  id: string,
  ...arrayRefs: { array: T[]; setter: (newArray: T[]) => void }[]
): void {
  arrayRefs.forEach(({ array, setter }) => {
    setter(array.filter((item) => item.id !== id));
  });
}

/**
 * Creates a payload action handler for updating entities
 */
export function createUpdateHandler<
  State,
  T extends Identifiable & Timestamped,
>(getArrays: (state: State, id: string) => (T[] | null | undefined)[]) {
  return (
    state: State,
    action: PayloadAction<{ id: string; changes: Partial<T> }>
  ) => {
    const arrays = getArrays(state, action.payload.id);
    updateEntityInArrays(action.payload, ...arrays);
  };
}
