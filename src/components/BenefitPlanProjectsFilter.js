import React from 'react';
import { Filter } from '@openimis/fe-core';
import { CONTAINS_LOOKUP, MODULE_NAME } from '../constants';
import ProjectStatusPicker from '../pickers/ProjectStatusPicker';
import ProjectSectorPicker from '../pickers/ProjectSectorPicker';

function ProjectFilter({
  filters, onChangeFilters,
}) {
  const filterFields = [
    { name: 'name', label: 'project.name', lookup: CONTAINS_LOOKUP },
  ];

  const pickerFields = [
    { name: 'status', component: ProjectStatusPicker, props: { nullLabel: 'any', withNull: true } },
    { name: 'sector', component: ProjectSectorPicker },
  ];

  const checkboxFields = [
    { name: 'isDeleted', label: 'project.isDeleted' },
  ];

  return (
    <Filter
      moduleName={MODULE_NAME}
      filters={filters}
      onChangeFilters={onChangeFilters}
      filterFields={filterFields}
      pickerFields={pickerFields}
      checkboxFields={checkboxFields}
    />
  );
}

export default ProjectFilter;
