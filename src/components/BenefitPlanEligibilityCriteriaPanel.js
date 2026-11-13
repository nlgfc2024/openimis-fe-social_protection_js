import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  decodeId, fetchCustomFilter, PublishedComponent, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { makeStyles } from '@material-ui/styles';
import AddCircle from '@material-ui/icons/Add';
import {
  Button, Divider, Grid, Typography,
} from '@material-ui/core';
import {
  CLEARED_STATE_FILTER,
  DEFAULT_BENEFICIARY_STATUS,
  RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE,
} from '../constants';
import {
  isBase64Encoded,
  jsonExtWithPhaseCriteria,
  phaseCriteriaByStatus,
} from '../util/advanced-criteria-utils';
import BeneficiaryStatusPicker from '../pickers/BeneficiaryStatusPicker';

const useStyles = makeStyles((theme) => ({
  item: theme.paper.item,
  heading: { marginTop: theme.spacing(1) },
}));

// The enrolment rules for one status of a saved Phase, inside the Phase details:
// the fixed and profile rules (read-only, from the Enrolment module) and the
// Phase's own criteria, which the Phase form's save button saves.
function BenefitPlanEligibilityCriteriaPanel({
  edited,
  benefitPlan,
  onEditedChanged,
  rights,
  readOnly,
}) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('socialProtection', modulesManager);
  const customFilters = useSelector((state) => state.core.customFilters);
  const [status, setStatus] = useState(DEFAULT_BENEFICIARY_STATUS);
  // Rows still being filled in (no field yet) are kept here; the rest live in
  // the form's edited jsonExt, so the form's reset and save cover them.
  const [pending, setPending] = useState([]);
  const canUpdateCriteria = rights.includes(RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE) && !readOnly;
  const planId = edited?.id;

  useEffect(() => {
    if (!planId) return;
    dispatch(fetchCustomFilter([
      'moduleName: "individual"',
      'objectTypeName: "Individual"',
      `uuidOfObject: "${isBase64Encoded(planId) ? decodeId(planId) : planId}"`,
      `additionalParams: ${JSON.stringify(JSON.stringify({ benefitPlan: `${planId}` }))}`,
    ]));
  }, [planId]);

  useEffect(() => {
    setPending([]);
  }, [planId, status]);

  const rows = [...(phaseCriteriaByStatus(edited, benefitPlan)[status] || []), ...pending];

  const changeRows = (next) => {
    const updated = typeof next === 'function' ? next(rows) : next;
    setPending(updated.filter((row) => !row?.field));
    const jsonExt = jsonExtWithPhaseCriteria(edited, benefitPlan, status, updated);
    if (jsonExt !== null) onEditedChanged({ ...edited, jsonExt });
  };

  return (
    <Grid container className={classes.item}>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={9} className={classes.heading}>
        <Typography variant="h6">{formatMessage('benefitPlan.eligibilityRules.title')}</Typography>
      </Grid>
      <Grid item xs={3} className={classes.heading}>
        <BeneficiaryStatusPicker withNull={false} value={status} onChange={setStatus} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="caption" display="block">
          {formatMessage('benefitPlan.eligibilityRules.rulesHelp')}
        </Typography>
        <PublishedComponent
          pubRef="enrolment.ProgrammeProfileSummary"
          benefitPlanId={planId}
          status={status}
          household={edited?.type === 'GROUP'}
        />
      </Grid>
      <Grid item xs={12} className={classes.heading}>
        <Typography variant="subtitle1">{formatMessage('benefitPlan.eligibilityRules.customTitle')}</Typography>
        <Typography variant="caption" display="block">
          {formatMessage('benefitPlan.eligibilityRules.customHelp')}
        </Typography>
        {!rows.length && !canUpdateCriteria && (
          <Typography variant="body2">{formatMessage('benefitPlan.eligibilityRules.noCustomCriteria')}</Typography>
        )}
      </Grid>
      {rows.map((filter, index) => (
        <PublishedComponent
          // eslint-disable-next-line react/no-array-index-key
          key={`${status}-${index}`}
          pubRef="enrolment.AdvancedCriteriaRowValue"
          customFilters={customFilters}
          currentFilter={filter}
          index={index}
          setCurrentFilter={() => {}}
          filters={rows}
          setFilters={changeRows}
          readOnly={!canUpdateCriteria}
        />
      ))}
      {canUpdateCriteria && (
        <Grid item xs={12}>
          <Button
            startIcon={<AddCircle />}
            onClick={() => changeRows([...rows, { ...CLEARED_STATE_FILTER }])}
            color="primary"
          >
            {formatMessage('benefitPlan.eligibilityRules.addCriteria')}
          </Button>
          <Button onClick={() => changeRows([])} disabled={!rows.length} color="primary">
            {formatMessage('benefitPlan.eligibilityRules.clearCriteria')}
          </Button>
        </Grid>
      )}
    </Grid>
  );
}

export default BenefitPlanEligibilityCriteriaPanel;
