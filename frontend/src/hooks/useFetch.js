import { useCallback, useEffect, useState } from 'react'
import { subscribe } from '../services/workflowStore'

export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fetcher().then((result) => { if (!cancelled) setData(result) }).catch((err) => { if (!cancelled) setError(err) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  // Any central workflow mutation invalidates API-backed mock reads so every
  // open page immediately reflects the same request/plan lifecycle.
  useEffect(() => subscribe(() => setReloadToken((t) => t + 1)), [])

  return { data, loading, error, refetch }
}
