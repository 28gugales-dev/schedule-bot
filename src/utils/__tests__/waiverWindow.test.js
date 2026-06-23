import { describe, it, expect } from 'vitest'
import { isWaiverOpen, waiverWindowStatus, todayStr, windowStatusLabel } from '../waiverWindow.js'

const TODAY = '2026-06-23'

describe('waiverWindowStatus', () => {
  it('inactive forms are inactive regardless of dates', () => {
    expect(waiverWindowStatus({ active: false, openAt: null, closeAt: null }, TODAY)).toBe('inactive')
    expect(waiverWindowStatus({ active: false, openAt: '2020-01-01', closeAt: '2030-01-01' }, TODAY)).toBe('inactive')
  })

  it('unbounded active form is open', () => {
    expect(waiverWindowStatus({ active: true, openAt: null, closeAt: null }, TODAY)).toBe('open')
  })

  it('before the open date is scheduled', () => {
    expect(waiverWindowStatus({ active: true, openAt: '2026-07-01', closeAt: null }, TODAY)).toBe('scheduled')
  })

  it('after the close date is closed', () => {
    expect(waiverWindowStatus({ active: true, openAt: null, closeAt: '2026-06-01' }, TODAY)).toBe('closed')
  })

  it('open and close bounds are inclusive', () => {
    expect(waiverWindowStatus({ active: true, openAt: TODAY, closeAt: TODAY }, TODAY)).toBe('open')
  })

  it('within an explicit window is open', () => {
    expect(waiverWindowStatus({ active: true, openAt: '2026-06-01', closeAt: '2026-06-30' }, TODAY)).toBe('open')
  })
})

describe('isWaiverOpen', () => {
  it('true only for open status', () => {
    expect(isWaiverOpen({ active: true, openAt: null, closeAt: null }, TODAY)).toBe(true)
    expect(isWaiverOpen({ active: true, openAt: '2026-07-01' }, TODAY)).toBe(false)
    expect(isWaiverOpen({ active: true, closeAt: '2026-06-01' }, TODAY)).toBe(false)
    expect(isWaiverOpen({ active: false }, TODAY)).toBe(false)
  })
})

describe('todayStr', () => {
  it('formats a date as local YYYY-MM-DD zero-padded', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayStr(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('windowStatusLabel', () => {
  it('maps known statuses', () => {
    expect(windowStatusLabel('open')).toBe('Open')
    expect(windowStatusLabel('scheduled')).toBe('Opens later')
    expect(windowStatusLabel('closed')).toBe('Closed')
    expect(windowStatusLabel('inactive')).toBe('Inactive')
  })
})
