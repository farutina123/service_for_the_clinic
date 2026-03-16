import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  retry: () => void
}

/**
 * Хук для загрузки данных через API.
 * Автоматически обрабатывает loading/error состояния и отмену при размонтировании.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcherRef.current()
      .then(result => { if (!cancelled) setData(result) })
      .catch(err  => { if (!cancelled) setError(err.message ?? 'Неизвестная ошибка') })
      .finally(()  => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryCount])

  return { data, loading, error, retry }
}
