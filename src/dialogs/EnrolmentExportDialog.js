import React, { useState } from 'react';
import {
  Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Button, FormControlLabel, Grid,
  FormHelperText,
} from '@material-ui/core';
import { PublishedComponent, formatMessage } from '@openimis/fe-core';

const activeFilters = (filters) => Object.values(filters)
  .map((filter) => filter?.filter)
  .filter(Boolean);

function EnrolmentExportDialog({
  open, onClose, onExport, intl, benefitPlan, status, allowSummaryOnly = false,
}) {
  const [filters, setFilters] = useState({});
  const [microCatchment, setMicroCatchment] = useState(null);
  const [summaryOnly, setSummaryOnly] = useState(false);

  const download = () => {
    const parameters = [
      `benefitPlan_Id: "${benefitPlan.id}"`,
      'isDeleted: false',
      ...activeFilters(filters),
      ...(status ? [`status: ${status}`] : []),
      ...(microCatchment ? [`microCatchmentUuid: "${microCatchment.uuid}"`] : []),
      // Only the household Phase export supports a primary-recipient summary.
      ...(allowSummaryOnly && summaryOnly ? ['phaseBeneficiarySummaryOnly: true'] : []),
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
          {allowSummaryOnly && (
            <Grid item xs={12}>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={summaryOnly}
                    onChange={(event) => setSummaryOnly(event.target.checked)}
                    color="primary"
                  />
                )}
                label={formatMessage(intl, 'socialProtection', 'export.enrolments.summaryOnly')}
              />
              <FormHelperText>
                {formatMessage(intl, 'socialProtection', 'export.enrolments.membersDefault')}
              </FormHelperText>
            </Grid>
          )}
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
