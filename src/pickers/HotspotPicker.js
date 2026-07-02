import React from 'react';
import { TextField, Tooltip } from '@material-ui/core';
import {
  Autocomplete,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { projectLookupLabel } from '../util/project';

const SAMPLE_HOTSPOTS = [
  { id: 'sample-hotspot-1', name: 'Sample Hotspot 1' },
  { id: 'sample-hotspot-2', name: 'Sample Hotspot 2' },
  { id: 'sample-hotspot-3', name: 'Sample Hotspot 3' },
];

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

  return (
    <Autocomplete
      readOnly={readOnly || !microCatchment}
      options={microCatchment ? SAMPLE_HOTSPOTS : []}
      value={value ?? null}
      getOptionLabel={projectLookupLabel}
      onChange={(v) => onChange(v, projectLookupLabel(v))}
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
