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

function ProjectHotspotPicker({
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
  microCatchment,
  filter,
  filterSelectedOptions,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('socialProtection', modulesManager);
  const [filters, setFilters] = useState({});

  const queryFilters = {
    ...filters,
    districtUuid: district?.uuid,
    microCatchmentUuid: microCatchment?.uuid,
  };

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query ProjectHotspotPicker(
      $search: String,
      $first: Int,
      $districtUuid: String,
      $microCatchmentUuid: String
    ) {
      projectHotspot(
        name_Icontains: $search,
        first: $first,
        district_Uuid: $districtUuid,
        microCatchment_Uuid: $microCatchmentUuid,
        orderBy: "name"
      ) {
        edges {
          node {
            id
            name
            district {
              id
              uuid
              code
              name
            }
            microCatchment {
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

  const hotspots = data?.projectHotspot?.edges?.map((edge) => ({
    ...edge.node,
    id: decodeId(edge.node.id),
  })) ?? [];

  return (
    <Autocomplete
      multiple={multiple}
      error={error}
      readOnly={readOnly || !district}
      options={hotspots}
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
            label={(withLabel && label) || formatMessage('project.hotspot')}
            placeholder={(withPlaceholder && placeholder) || formatMessage('project.hotspot')}
          />
        </Tooltip>
      )}
    />
  );
}

export default ProjectHotspotPicker;
