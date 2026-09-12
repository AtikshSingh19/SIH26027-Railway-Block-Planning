import { useCallback, useState } from 'react'

// For imperative, user-triggered calls (approve, reject, generate plan,
// run simulation) rather than data that loads on mount.
//
// Usage:
//   const { run, loading, error, result } = useApiAction(api.approvePlan)
//   <Button onClick={() => run(planId)}>Approve</Button>
export function useApiAction(actionFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const run = useCallback(
    async (...args) => {
      setLoading(true)
      setError(null)
      try {
        const res = await actionFn(...args)
        setResult(res)
        return res
      } catch (err) {
        setError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [actionFn],
  )

  return { run, loading, error, result }
}
