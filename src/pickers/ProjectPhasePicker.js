import React, { useState } from 'react';
import { TextField, Tooltip } from '@material-ui/core';
import {
  Autocomplete,
  decodeId,
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { phaseLabel } from '../util/project';

function ProjectPhasePicker({
  multiple,
  required,
  label,
  placeholder,
  withLabel = false,
  withPlaceholder = false,
  readOnly,
  value,
  onChange,
  filter,
  filterSelectedOptions,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('socialProtection', modulesManager);
  const [filters, setFilters] = useState({ isActive: true });

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query ProjectPhasePicker($search: String, $first: Int, $isActive: Boolean) {
      projectPhase(name_Icontains: $search, first: $first, isActive: $isActive, orderBy: "name") {
        edges {
          node {
            id
            name
            code
            phaseNumber
            isActive
          }
        }
      }
    }
    `,
    filters,
    { skip: false },
  );

  const phases = data?.projectPhase?.edges?.map((edge) => ({
    ...edge.node,
    id: decodeId(edge.node.id),
  })) ?? [];

  return (
    <Autocomplete
      multiple={multiple}
      error={error}
      readOnly={readOnly}
      options={phases}
      isLoading={isLoading}
      value={value ?? null}
      getOptionLabel={phaseLabel}
      onChange={(v) => onChange(v, phaseLabel(v))}
      filterOptions={filter}
      filterSelectedOptions={filterSelectedOptions}
      onInputChange={(search) => setFilters({ search, isActive: true })}
      renderInput={(inputProps) => (
        <Tooltip title="">
          <TextField
            /* eslint-disable-next-line react/jsx-props-no-spreading */
            {...inputProps}
            required={required}
            label={(withLabel && label) || formatMessage('project.phase')}
            placeholder={(withPlaceholder && placeholder) || formatMessage('project.phase')}
          />
        </Tooltip>
      )}
    />
  );
}

export default ProjectPhasePicker;
