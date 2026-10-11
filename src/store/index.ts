import { configureStore } from '@reduxjs/toolkit'
import type { TripData } from '../domain/types'
import expensesReducer from './expensesSlice'
import membersReducer from './membersSlice'
import { saveTripData, type SimpleStorage } from './persistence'

/**
 * Builds a store. Every test makes its own, so no test can be affected by
 * what another one dispatched.
 *
 * The state shape is exactly TripData -- { members, expenses } -- which is
 * also exactly what gets saved, so loading and saving need no translation.
 */
export function makeStore(preloadedState?: TripData) {
  return configureStore({
    reducer: {
      members: membersReducer,
      expenses: expensesReducer,
    },
    preloadedState,
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

/**
 * The one and only place the app writes to storage.
 *
 * Keeping it here means reducers stay pure and no component ever has to
 * remember to save. The reference check matters: a store notifies on every
 * dispatch, but Immer only replaces an array when it actually changed, so
 * comparing references saves a JSON.stringify on unrelated updates.
 */
export function connectPersistence(store: AppStore, storage: SimpleStorage): () => void {
  let lastMembers = store.getState().members
  let lastExpenses = store.getState().expenses

  return store.subscribe(() => {
    const state = store.getState()

    if (state.members === lastMembers && state.expenses === lastExpenses) {
      return
    }

    lastMembers = state.members
    lastExpenses = state.expenses

    saveTripData(storage, { members: state.members, expenses: state.expenses })
  })
}
