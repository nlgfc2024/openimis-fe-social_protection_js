import React, { useState } from 'react';
import { TextField, Tooltip } from '@material-ui/core';
import {
  Autocomplete,
  decodeId,
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { projectLookupLabel } from '../util/project';

function ProjectSectorPicker({
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
  const [filters, setFilters] = useState({});

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query ProjectSectorPicker($search: String, $first: Int) {
      activity(name_Icontains: $search, first: $first, orderBy: "name") {
        edges {
          node {
            id
            name
          }
        }
      }
    }
    `,
    filters,
    { skip: false },
  );

  const sectors = data?.activity?.edges?.map((edge) => ({
    ...edge.node,
    id: decodeId(edge.node.id),
  })) ?? [];

  return (
    <Autocomplete
      multiple={multiple}
      error={error}
      readOnly={readOnly}
      options={sectors}
      isLoading={isLoading}
      value={value ?? null}
      getOptionLabel={projectLookupLabel}
      onChange={(v) => onChange(v, projectLookupLabel(v))}
      filterOptions={filter}
      filterSelectedOptions={filterSelectedOptions}
      onInputChange={(search) => setFilters({ search })}
      renderInput={(inputProps) => (
        <Tooltip title="">
          <TextField
            /* eslint-disable-next-line react/jsx-props-no-spreading */
            {...inputProps}
            required={required}
            label={(withLabel && label) || formatMessage('project.sector')}
            placeholder={(withPlaceholder && placeholder) || formatMessage('project.sector')}
          />
        </Tooltip>
      )}
    />
  );
}

export default ProjectSectorPicker;
