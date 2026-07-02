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
  const selectedDistrict = district || value?.district;
  const districtUuid = selectedDistrict?.uuid
    || (/^[0-9a-f-]{36}$/i.test(selectedDistrict?.id) ? selectedDistrict.id : null);

  const queryFilters = {
    ...filters,
    first: 100,
    showHistory: true,
  };

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query MicroCatchmentPicker($search: String, $first: Int, $showHistory: Boolean) {
      microCatchments(
        name_Icontains: $search,
        first: $first,
        showHistory: $showHistory,
        orderBy: "name"
      ) {
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
    { skip: !districtUuid },
  );

  const microCatchments = data?.microCatchments?.edges
    ?.map((edge) => ({
      ...edge.node,
      id: decodeId(edge.node.id),
    }))
    ?.filter((microCatchment) => microCatchment?.district?.uuid === districtUuid) ?? [];

  return (
    <Autocomplete
      multiple={multiple}
      error={error}
      readOnly={readOnly || !districtUuid}
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
