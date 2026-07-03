import React, { useState } from 'react';
import { TextField, Tooltip } from '@material-ui/core';
import {
  Autocomplete,
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { projectLookupLabel } from '../util/project';

function HotspotPicker({
  required,
  label,
  placeholder,
  withLabel = false,
  withPlaceholder = false,
  readOnly,
  value,
  onChange,
  microCatchment,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('socialProtection', modulesManager);
  const [filters, setFilters] = useState({});

  const { isLoading, data, error } = useGraphqlQuery(
    `
    query HotspotPicker($search: String, $first: Int) {
      hotspots(name_Icontains: $search, first: $first, orderBy: "name") {
        edges {
          node {
            id
            name
            microCatchment {
              uuid
            }
          }
        }
      }
    }
    `,
    { ...filters, first: 100 },
    { skip: !microCatchment },
  );

  const allHotspots = data?.hotspots?.edges?.map((edge) => ({
    ...edge.node,
    id: edge.node.id,
  })) ?? [];

  // Filter hotspots by selected microCatchment on the frontend
  const hotspots = microCatchment
    ? allHotspots.filter((h) => h.microCatchment?.uuid === microCatchment.uuid)
    : [];

  return (
    <Autocomplete
      readOnly={readOnly || !microCatchment}
      options={hotspots}
      isLoading={isLoading}
      error={error}
      value={value ?? null}
      getOptionLabel={projectLookupLabel}
      onChange={(v) => onChange(v, projectLookupLabel(v))}
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

export default HotspotPicker;
