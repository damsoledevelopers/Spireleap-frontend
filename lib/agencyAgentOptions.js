/** Shared agency / agent dropdown helpers */

export const NONE_AGENCY_VALUE = '__none__'
export const NONE_AGENT_VALUE = '__none__'

export function buildAgencySelectOptions(agencies = [], { includeNone = true, noneLabel = 'No agency' } = {}) {
  const list = (agencies || []).map((a) => ({
    value: a._id,
    label: a.name || 'Unnamed agency'
  }))
  if (!includeNone) return list
  return [{ value: NONE_AGENCY_VALUE, label: noneLabel }, ...list]
}

export function buildAgentSelectOptions(agents = [], { includeNone = true, noneLabel = 'No agent' } = {}) {
  const list = (agents || []).map((a) => ({
    value: a._id,
    label: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || 'Agent'
  }))
  if (!includeNone) return list
  return [{ value: NONE_AGENT_VALUE, label: noneLabel }, ...list]
}

/** Map select value to API payload (`null` clears on update; omit only when field unchanged). */
export function agencyValueForSubmit(value) {
  if (!value || value === NONE_AGENCY_VALUE) return null
  return value
}

export function agentValueForSubmit(value) {
  if (!value || value === NONE_AGENT_VALUE) return null
  return value
}

/** Normalize stored agency/agent id for controlled select value. */
export function agencyValueForSelect(stored) {
  if (!stored) return NONE_AGENCY_VALUE
  return typeof stored === 'object' ? stored._id || NONE_AGENCY_VALUE : stored
}

export function agentValueForSelect(stored) {
  if (!stored) return NONE_AGENT_VALUE
  return typeof stored === 'object' ? stored._id || NONE_AGENT_VALUE : stored
}

/** Single state update when agency changes (avoids stale closure overwriting agency). */
export function agencyAgentFieldsAfterAgencyChange(prev, agencyValue) {
  const prevAgency = prev?.agency ?? ''
  return {
    agency: agencyValue,
    agent:
      agencyValue === NONE_AGENCY_VALUE
        ? NONE_AGENT_VALUE
        : agencyValue !== prevAgency
          ? ''
          : (prev?.agent ?? '')
  }
}

export function selectValueForAgency(stored) {
  if (!stored || stored === NONE_AGENCY_VALUE) return NONE_AGENCY_VALUE
  return stored
}

export function selectValueForAgent(stored) {
  if (!stored || stored === NONE_AGENT_VALUE) return NONE_AGENT_VALUE
  return stored
}
