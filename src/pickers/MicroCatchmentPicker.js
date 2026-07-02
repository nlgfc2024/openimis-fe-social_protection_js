import React, { useState } from 'react';
import { TextField, Tooltip } from '@material-ui/core';
import {
  Autocomplete,
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { projectLookupLabel } from '../util/project';

function MicroCatchmentPicker({
  multiple,
  required,
  label,
  placeholder,
  withLabel = false,
  withPlaceholder = false,
  readOnly,
  value,
  onChange,
  district,
  filter,
  filterSelectedOptions,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('socialProtection', modulesManager);
  const [filters, setFilters] = useState({});

  const queryFilters = {
    ...filters,
    districtUuid: district?.uuid,
  };

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query MicroCatchmentPicker($search: String, $first: Int, $districtUuid: String) {
      projectMicroCatchments(name_Icontains: $search, first: $first, district_Uuid: $districtUuid, orderBy: "name") {
        edges {
          node {
            id
            uuid
            code
            name
            district {
              id
              uuid
              code
              name
            }
          }
        }
      }
    }
    `,
    queryFilters,
    { skip: !district?.uuid },
  );

  const microCatchments = data?.projectMicroCatchments?.edges?.map((edge) => edge.node) ?? [];

  return (
    <Autocomplete
      multiple={multiple}
      error={error}
      readOnly={readOnly || !district}
      options={microCatchments}
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
            label={(withLabel && label) || formatMessage('project.microCatchment')}
            placeholder={(withPlaceholder && placeholder) || formatMessage('project.microCatchment')}
          />
        </Tooltip>
      )}
    />
  );
}

export default MicroCatchmentPicker;
