import { parseTripData } from '../domain/parseTripData'
import type { TripData } from '../domain/types'
import rawSampleData from './sample-data.json'

// The JSON import is checked at runtime by the very same parser used on
// anything read back from localStorage.
//
// Why bother, when the file sits right there in the repo? Because TypeScript
// widens a JSON import: it types `"type": "equal"` as `string`, not as the
// literal the Split union needs. Running it through parseTripData both proves
// the file is well formed and narrows it to real TripData with no cast.
const parsed = parseTripData(rawSampleData)

if (parsed === null) {
  // A startup crash with a clear message beats an app that boots with no data.
  throw new Error('src/data/sample-data.json does not match the TripData shape')
}

export const SAMPLE_TRIP_DATA: TripData = parsed
