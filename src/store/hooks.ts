import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

// Pre-typed versions of the react-redux hooks. Components use these instead of
// the plain ones, so `useAppSelector((state) => state.expenses)` knows the
// shape of the store and a typo in a slice name is a compile error.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
