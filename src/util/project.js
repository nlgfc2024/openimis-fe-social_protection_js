export const projectLookupLabel = (option) => {
  if (!option) return '';
  return option.name || option.code || '';
};

export const generatedProjectName = (project = {}) => {
  const catchmentArea = projectLookupLabel(project.hotspot) || projectLookupLabel(project.microCatchment);
  const sector = projectLookupLabel(project.sector || project.activity);
  const knownPlace = project.knownPlace || '';

  const prefix = [catchmentArea, sector].filter(Boolean).join('-');
  return [prefix, knownPlace].filter(Boolean).join(' - ');
};
