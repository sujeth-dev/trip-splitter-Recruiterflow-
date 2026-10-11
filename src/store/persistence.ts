import { parseTripData } from '../domain/parseTripData'
import type { TripData } from '../domain/types'
import { SAMPLE_TRIP_DATA } from '../data/sampleTripData'

// Versioned on purpose: if the stored shape ever changes, bumping to v2 means
// old browsers fall back to the sample data instead of loading something the
// new code cannot read.
export const STORAGE_KEY = 'hisaab.trip.v1'

/**
 * Only the two methods this module uses. Depending on the narrow shape rather
 * than the whole Storage interface lets a test hand in a plain object, so no
 * test ever touches a real browser store or leaks data into the next test.
 */
export type SimpleStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/**
 * Reads the saved trip, falling back to the sample data on any problem at all:
 * nothing saved, storage blocked by the browser, text that is not JSON, or
 * JSON that does not match the shape. The app always starts usable.
 */
export function loadTripData(storage: SimpleStorage): TripData {
  let saved: string | null

  try {
    // Reading localStorage throws outright in some privacy modes.
    saved = storage.getItem(STORAGE_KEY)
  } catch {
    return SAMPLE_TRIP_DATA
  }

  if (saved === null) {
    return SAMPLE_TRIP_DATA
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(saved)
  } catch {
    return SAMPLE_TRIP_DATA
  }

  const parsed = parseTripData(decoded)
  if (parsed === null) {
    return SAMPLE_TRIP_DATA
  }

  return parsed
}

/**
 * Writes the trip. Returns whether it worked, so a caller could tell the user,
 * but failing to save is never allowed to break the running app: a full disk
 * should not stop you adding an expense.
 */
export function saveTripData(storage: SimpleStorage, data: TripData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
