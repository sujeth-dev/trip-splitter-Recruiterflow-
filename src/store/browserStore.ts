import { loadTripData } from './persistence'
import { connectPersistence, makeStore } from './index'

// The single live store for the running app, wired to the real localStorage.
//
// It lives in its own module so that importing makeStore (which every test
// does) never creates this store as a side effect, and so no test can read or
// write the browser's real storage by accident.
export const browserStore = makeStore(loadTripData(window.localStorage))

connectPersistence(browserStore, window.localStorage)
