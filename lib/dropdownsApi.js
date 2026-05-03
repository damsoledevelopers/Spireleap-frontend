import { api } from './api'

let cache = null
let inflight = null

export function clearDropdownOptionsCache() {
  cache = null
  inflight = null
}

export async function getDropdownOptions() {
  if (cache) return cache
  if (inflight) return inflight

  inflight = api
    .get('/settings/dropdown-options')
    .then((res) => {
      cache = res.data || {}
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

