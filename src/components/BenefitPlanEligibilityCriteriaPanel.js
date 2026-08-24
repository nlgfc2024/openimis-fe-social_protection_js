import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  decodeId, fetchCustomFilter, PublishedComponent, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { makeStyles } from '@material-ui/styles';
import AddCircle from '@material-ui/icons/Add';
import {
  Button, Divider, Grid, Paper, Typography,
} from '@material-ui/core';
import {
  CLEARED_STATE_FILTER,
  BENEFICIARY_STATUS,
  RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE,
} from '../constants';
import {
  isBase64Encoded,
  normalizeAdvancedCriteria,
  safeParseJsonObject,
} from '../util/advanced-criteria-utils';

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  paperHeader: theme.paper.paperHeader,
  tableTitle: theme.table.title,
  item: theme.paper.item,
}));

function BenefitPlanEligibilityCriteriaPanel({
  confirmed,
  edited,
  benefitPlan,
  onEditedChanged,
  activeTab,
  rights,
}) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const editedBenefitPlan = edited;
  const additionalParams = editedBenefitPlan ? { benefitPlan: `${editedBenefitPlan.id}` } : null;
  const moduleFilterName = 'individual';
  const objectFilterType = 'Individual';
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('socialProtection', modulesManager);
  const customFilters = useSelector((state) => state.core.customFilters);
  const [filters, setFilters] = useState([]);
  const canUpdateCriteria = rights.includes(RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE) && !confirmed;

  const status = Object.values(BENEFICIARY_STATUS).find((value) => (
    activeTab.toUpperCase().includes(value)
  ));
  const show = status !== undefined;

  const getAdvancedCriteria = useCallback((status) => {
    const jsonData = safeParseJsonObject(benefitPlan?.jsonExt);
    const criteria = normalizeAdvancedCriteria(
      benefitPlan?.advancedCriteria ?? jsonData?.advanced_criteria,
    );

    return criteria[status] || [];
  }, [benefitPlan?.advancedCriteria, benefitPlan?.jsonExt]);
  const phaseJsonExt = safeParseJsonObject(benefitPlan?.jsonExt);
  const ranking = phaseJsonExt?.enrolment_ranking?.[status]
    ?? phaseJsonExt?.enrolment_ranking?.['*'];
  const rankingOrder = (ranking?.order_by || []).map((entry) => (
    typeof entry === 'string'
      ? entry
      : `${entry.field} ${entry.direction || 'asc'}${entry.cast ? ` (${entry.cast})` : ''}`
  )).join(', ');

  const handleRemoveFilter = () => {
    setFilters([]);
  };
  const handleAddFilter = () => {
    setFilters([...filters, CLEARED_STATE_FILTER]);
  };

  const fetchFilters = (params) => {
    dispatch(fetchCustomFilter(params));
  };

  const createParams = (moduleName, objectTypeName, uuidOfObject = null, additionalParams = null) => {
    const params = [
      `moduleName: "${moduleName}"`,
      `objectTypeName: "${objectTypeName}"`,
    ];
    if (uuidOfObject) {
      params.push(`uuidOfObject: "${uuidOfObject}"`);
    }
    if (additionalParams) {
      params.push(`additionalParams: ${JSON.stringify(JSON.stringify(additionalParams))}`);
    }
    return params;
  };

  const arraysAreEqual = (arr1, arr2) => JSON.stringify(arr1) === JSON.stringify(arr2);

  useEffect(() => {
    if (editedBenefitPlan?.id) {
      const criteria = getAdvancedCriteria(status);
      if (!arraysAreEqual(criteria, filters)) {
        setFilters(criteria);
      }
      const paramsToFetchFilters = createParams(
        moduleFilterName,
        objectFilterType,
        isBase64Encoded(editedBenefitPlan.id) ? decodeId(editedBenefitPlan.id) : editedBenefitPlan.id,
        additionalParams,
      );
      fetchFilters(paramsToFetchFilters);
    }
  }, [editedBenefitPlan?.id, status]);

  useEffect(() => {
    if (editedBenefitPlan?.id && canUpdateCriteria) {
      const { jsonExt } = editedBenefitPlan;
      const jsonData = safeParseJsonObject(jsonExt);
      const advancedCriteria = normalizeAdvancedCriteria(
        jsonData?.advanced_criteria ?? benefitPlan?.advancedCriteria,
      );
      const editedAdvancedCriteria = { ...advancedCriteria, [status]: filters };
      const json = { ...jsonData, advanced_criteria: editedAdvancedCriteria };

      if (!filters.length) {
        delete json.advanced_criteria[status];
      } else if (!!filters.length && !filters[0].field) {
        delete json.advanced_criteria[status];
      }

      const appendedJsonExt = Object.keys(json).length === 0 ? benefitPlan.jsonExt : JSON.stringify(json);

      onEditedChanged({ ...editedBenefitPlan, jsonExt: appendedJsonExt });
    }
  }, [filters, status, canUpdateCriteria]);

  const beneficiaryStatus = formatMessage(`benefitPlan.${activeTab.replace('Tab', '')}.label`);

  return (
    show && (
    <Paper className={classes.paper}>
      <Grid container alignItems="center" direction="row" className={classes.paperHeader}>
        <Grid item xs={12}>
          <Typography variant="h6" className={classes.tableTitle}>
            {formatMessageWithValues('benefitPlan.BenefitPlanEligibilityCriteriaPanel.title', {
              beneficiaryStatus,
            })}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid container className={classes.item}>
          {ranking && (
          <Grid item xs={12} style={{ marginBottom: '16px' }}>
            <Paper elevation={1} style={{ padding: '16px' }}>
              <Typography variant="subtitle1">
                {formatMessage('benefitPlan.enrolmentRanking.title')}
              </Typography>
              <Typography variant="body2">
                {formatMessage('benefitPlan.enrolmentRanking.order')}
                {': '}
                {rankingOrder || ranking.tie_breaker || 'id'}
              </Typography>
              <Typography variant="body2">
                {formatMessage('benefitPlan.enrolmentRanking.limit')}
                {': '}
                {ranking.limit?.percentage
                  ? `${ranking.limit.percentage}%`
                  : formatMessage('benefitPlan.enrolmentRanking.allEligible')}
              </Typography>
              <Typography variant="caption">
                {formatMessage('benefitPlan.enrolmentRanking.readOnly')}
              </Typography>
            </Paper>
          </Grid>
          )}
          {filters.map((filter, index) => (
            // eslint-disable-next-line react/react-in-jsx-scope
            <PublishedComponent
              pubRef="individual.AdvancedCriteriaRowValue"
              customFilters={customFilters}
              currentFilter={filter}
              index={index}
              setCurrentFilter={() => {}}
              filters={filters}
              setFilters={setFilters}
              readOnly={!canUpdateCriteria}
            />
          ))}
          {canUpdateCriteria && (
          <div style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}>
            <AddCircle
              style={{
                border: 'thin solid',
                borderRadius: '40px',
                width: '16px',
                height: '16px',
              }}
              onClick={handleAddFilter}
              disabled={!canUpdateCriteria}
            />
            <Button
              onClick={handleAddFilter}
              variant="outlined"
              style={{
                border: '0px',
                marginBottom: '6px',
                fontSize: '0.8rem',
              }}
              disabled={!canUpdateCriteria}
            >
              {formatMessage('individual.enrollment.addFilters')}
            </Button>
          </div>
          )}
          {canUpdateCriteria && (
          <div style={{ float: 'left' }}>
            <Button
              onClick={handleRemoveFilter}
              variant="outlined"
              style={{
                border: '0px',
              }}
              disabled={!canUpdateCriteria}
            >
              {formatMessage('individual.enrollment.clearAllFilters')}
            </Button>
          </div>
          )}
        </Grid>
      </Grid>
    </Paper>
    )
  );
}

export default BenefitPlanEligibilityCriteriaPanel;
