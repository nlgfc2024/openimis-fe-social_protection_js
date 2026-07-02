export const projectLookupLabel = (option) => {
  if (!option) return '';
  return option.name || option.code || '';
};

export const phaseLabel = (phase) => {
  if (!phase) return '';
  return phase.number || phase.phaseNumber || phase.code || phase.name || '';
};

export const generatedProjectName = (project = {}) => {
  const microCatchment = projectLookupLabel(project.microCatchment);
  const sector = projectLookupLabel(project.sector || project.activity);
  const phase = phaseLabel(project.phase);
  const knownPlace = project.knownPlace || '';

  const prefix = [microCatchment, sector, phase].filter(Boolean).join('-');
  return [prefix, knownPlace].filter(Boolean).join(' - ');
};
