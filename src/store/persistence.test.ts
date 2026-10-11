import { beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_TRIP_DATA } from '../data/sampleTripData'
import type { TripData } from '../domain/types'
import { loadTripData, saveTripData, STORAGE_KEY, type SimpleStorage } from './persistence'

/** A localStorage stand-in, so no test depends on a real browser store. */
function makeFakeStorage(initial: Record<string, string> = {}): SimpleStorage & {
  contents: Record<string, string>
} {
  const contents = { ...initial }

  return {
    contents,
    getItem: (key) => (Object.hasOwn(contents, key) ? contents[key] : null),
    setItem: (key, value) => {
      contents[key] = value
    },
  }
}

const SAVED_TRIP: TripData = {
  members: [
    { id: 'm1', name: 'Aarav' },
    { id: 'm2', name: 'Diya' },
  ],
  expenses: [
    {
      id: 'e1',
      description: 'Chai',
      amount: 5000,
      paidBy: 'm1',
      date: '2026-03-12',
      category: 'Food',
      split: { type: 'equal', memberIds: ['m1', 'm2'] },
    },
  ],
}

describe('loadTripData', () => {
  let storage: ReturnType<typeof makeFakeStorage>

  beforeEach(() => {
    storage = makeFakeStorage()
  })

  it('falls back to the sample data when nothing is saved', () => {
    expect(loadTripData(storage)).toEqual(SAMPLE_TRIP_DATA)
  })

  it('uses valid saved data', () => {
    storage.contents[STORAGE_KEY] = JSON.stringify(SAVED_TRIP)

    expect(loadTripData(storage)).toEqual(SAVED_TRIP)
  })

  it('falls back when the saved text is not JSON', () => {
    storage.contents[STORAGE_KEY] = '{ not json at all'

    expect(loadTripData(storage)).toEqual(SAMPLE_TRIP_DATA)
  })

  it('falls back when the saved JSON has the wrong shape', () => {
    storage.contents[STORAGE_KEY] = JSON.stringify({ members: 'nope' })

    expect(loadTripData(storage)).toEqual(SAMPLE_TRIP_DATA)
  })

  it('falls back when an amount was hand-edited into a string', () => {
    storage.contents[STORAGE_KEY] = JSON.stringify({
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [
        {
          id: 'e1',
          description: 'Chai',
          amount: '12',
          paidBy: 'm1',
          date: '2026-03-12',
          category: 'Food',
          split: { type: 'equal', memberIds: ['m1'] },
        },
      ],
    })

    expect(loadTripData(storage)).toEqual(SAMPLE_TRIP_DATA)
  })

  it('falls back when reading storage throws, as it does in some privacy modes', () => {
    const blocked: SimpleStorage = {
      getItem: () => {
        throw new Error('access denied')
      },
      setItem: () => undefined,
    }

    expect(loadTripData(blocked)).toEqual(SAMPLE_TRIP_DATA)
  })

  it('ignores anything stored under a different key', () => {
    storage.contents['something.else'] = JSON.stringify(SAVED_TRIP)

    expect(loadTripData(storage)).toEqual(SAMPLE_TRIP_DATA)
  })
})

describe('saveTripData', () => {
  it('writes the trip under the versioned key', () => {
    const storage = makeFakeStorage()

    expect(saveTripData(storage, SAVED_TRIP)).toBe(true)
    expect(storage.contents[STORAGE_KEY]).toBe(JSON.stringify(SAVED_TRIP))
  })

  it('round-trips through load', () => {
    const storage = makeFakeStorage()
    saveTripData(storage, SAVED_TRIP)

    expect(loadTripData(storage)).toEqual(SAVED_TRIP)
  })

  it('reports failure instead of throwing when the store is full', () => {
    const full: SimpleStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }

    expect(saveTripData(full, SAVED_TRIP)).toBe(false)
  })
})
