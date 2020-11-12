export interface AuthResult {
  [guard: string]: {
    authorized: boolean
    authenticated: boolean
    permissions: {
      granted: string[]
      required: {
        forOperation: string[]
        forProperty: {
          [propertyPath: string]: string[]
        }
      }
      missing: {
        forOperation: string[]
        forProperty: {
          [propertyPath: string]: string[]
        }
      }
    }
  }
}
