import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Expense } from '../domain/types'

const initialState: Expense[] = []

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    /**
     * Takes a complete Expense, id included.
     *
     * The id is made by the page, not here, because crypto.randomUUID() is a
     * different answer every call. A reducer must be a pure function of its
     * arguments so Redux can replay actions and so tests are repeatable.
     */
    expenseAdded(state, action: PayloadAction<Expense>) {
      // Redux Toolkit wraps reducers in Immer, so this "mutation" is recorded
      // against a draft and turned into a brand new array.
      state.push(action.payload)
    },

    expenseDeleted(state, action: PayloadAction<string>) {
      const index = state.findIndex((expense) => expense.id === action.payload)
      if (index !== -1) {
        state.splice(index, 1)
      }
    },
  },
})

export const { expenseAdded, expenseDeleted } = expensesSlice.actions

export default expensesSlice.reducer
