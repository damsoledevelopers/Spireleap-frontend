/**
 * Labeled address rows in form order: Street, Country, State, City, ZIP code.
 * @param {object|null|undefined} address
 * @returns {{ label: string, value: string }[]}
 */
export function getAddressLabeledRows(address) {
  if (!address || typeof address !== 'object') return []

  const street = String(address.street ?? '').trim()
  const city = String(address.city ?? '').trim()
  const state = String(address.state ?? '').trim()
  const country = String(address.country ?? '').trim()
  const zip = String(address.zipCode ?? address.zip ?? '').trim()

  const rows = []
  if (street) rows.push({ label: 'Street', value: street })
  if (country) rows.push({ label: 'Country', value: country })
  if (state) rows.push({ label: 'State', value: state })
  if (city) rows.push({ label: 'City', value: city })
  if (zip) rows.push({ label: 'ZIP code', value: zip })

  return rows
}

/**
 * Plain lines (values only), same order as labeled rows.
 * @param {object|null|undefined} address
 * @returns {string[]}
 */
export function getAddressDisplayLines(address) {
  return getAddressLabeledRows(address).map((r) => r.value)
}
