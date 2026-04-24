import { describe, it, expect } from 'vitest'
import { pickDisplayModes, shuffle } from '../shuffle'

describe('shuffle', () => {
  it('returns a new array of the same length with the same members', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect(out).toHaveLength(input.length)
    expect([...out].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]
    shuffle(input)
    expect(input).toEqual(snapshot)
  })
})

describe('pickDisplayModes', () => {
  it('produces exactly `count` modes', () => {
    expect(pickDisplayModes(10)).toHaveLength(10)
  })

  it('includes at least one cover', () => {
    for (let i = 0; i < 20; i++) {
      const modes = pickDisplayModes(10)
      expect(modes.filter((m) => m === 'cover').length).toBeGreaterThanOrEqual(1)
    }
  })

  it('never places two covers adjacent to each other', () => {
    for (let i = 0; i < 50; i++) {
      const modes = pickDisplayModes(10)
      for (let j = 0; j < modes.length - 1; j++) {
        const adjacentCovers = modes[j] === 'cover' && modes[j + 1] === 'cover'
        expect(adjacentCovers).toBe(false)
      }
    }
  })
})
