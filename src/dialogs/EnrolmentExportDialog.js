import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Grid } from '@material-ui/core';
import { PublishedComponent, formatMessage } from '@openimis/fe-core';

const activeFilters = (filters) => Object.values(filters)
  .map((filter) => filter?.filter)
  .filter(Boolean);

function EnrolmentExportDialog({ open, onClose, onExport, intl, benefitPlan, status }) {
  const [filters, setFilters] = useState({});
  const [microCatchment, setMicroCatchment] = useState(null);

  const download = () => {
    const parameters = [
      `benefitPlan_Id: "${benefitPlan.id}"`,
      'isDeleted: false',
      ...activeFilters(filters),
      ...(status ? [`status: ${status}`] : []),
      ...(microCatchment ? [`microCatchmentUuid: "${microCatchment.uuid}"`] : []),
      'fileFormat: "xlsx"',
      'fields: ["id"]',
      'fieldsColumns: "{}"',
    ];
    onExport(parameters);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{formatMessage(intl, 'socialProtection', 'export.enrolments.title')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <PublishedComponent
              pubRef="location.MicroCatchmentPicker"
              value={microCatchment}
              onChange={setMicroCatchment}
            />
          </Grid>
          <Grid item xs={12}>
            <PublishedComponent
              pubRef="location.DetailedLocationFilter"
              withNull
              split
              filters={filters}
              onChangeFilters={(changes) => setFilters((previous) => changes.reduce(
                (next, change) => ({ ...next, [change.id]: change }), previous,
              ))}
              anchor="parentLocation"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{formatMessage(intl, 'socialProtection', 'export.enrolments.cancel')}</Button>
        <Button color="primary" variant="contained" onClick={download}>
          {formatMessage(intl, 'socialProtection', 'export.enrolments.download')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EnrolmentExportDialog;
