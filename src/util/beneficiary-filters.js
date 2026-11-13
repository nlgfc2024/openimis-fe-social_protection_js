// The beneficiary status chosen in a searcher's filters, from its query params
// (for example "status: ACTIVE"), or null when no status is chosen.
// eslint-disable-next-line import/prefer-default-export
export function statusFromQueryParams(params = []) {
  const param = params.find((entry) => typeof entry === 'string' && /^status:\s*\S/.test(entry));
  return param ? param.replace(/^status:\s*/, '').replace(/"/g, '') : null;
}
