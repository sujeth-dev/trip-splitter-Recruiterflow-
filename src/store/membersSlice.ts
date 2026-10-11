import { createSlice } from '@reduxjs/toolkit'
import type { Member } from '../domain/types'

// The trip's people. This app has no "add a friend" feature, so the slice has
// no reducers: the list arrives once as preloaded state and never changes.
// It still lives in the store because the expenses pages need it, and because
// adding members later should not mean moving state around.
const initialState: Member[] = []

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {},
})

export default membersSlice.reducer
