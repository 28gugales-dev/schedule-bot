import { describe, it, expect } from 'vitest'
import { FIELD_REGISTRY } from '../formSchema.js'

describe('formSchema module', () => {
  it('exports FIELD_REGISTRY', () => {
    expect(FIELD_REGISTRY).toBeTruthy()
  })
})
