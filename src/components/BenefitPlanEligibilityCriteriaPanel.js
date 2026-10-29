import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  decodeId, fetchCustomFilter, PublishedComponent, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { makeStyles } from '@material-ui/styles';
import AddCircle from '@material-ui/icons/Add';
import {
  Button, Divider, Grid, Paper, TextField, Typography,
} from '@material-ui/core';
import {
  CLEARED_STATE_FILTER,
  BENEFICIARY_STATUS,
  RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE,
} from '../constants';
import {
  isBase64Encoded,
  mandatoryEligibilityRuleKeys,
  normalizeAdvancedCriteria,
  parseEnrollmentRankingText,
  rankingEditorContextKey,
  rankingTextForStatus,
  resolveEnrollmentRanking,
  safeParseJsonObject,
  updateEnrollmentRanking,
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
  const [rankingText, setRankingText] = useState('');
  const [rankingError, setRankingError] = useState('');
  const editedBenefitPlanRef = useRef(editedBenefitPlan);
  const savedPlanContextRef = useRef(null);
  const canUpdateCriteria = rights.includes(RIGHT_BENEFIT_PLAN_CRITERIA_UPDATE) && !confirmed;

  useEffect(() => {
    editedBenefitPlanRef.current = editedBenefitPlan;
  }, [editedBenefitPlan]);

  const updateEditedBenefitPlan = useCallback((changes) => {
    const updatedBenefitPlan = {
      ...(editedBenefitPlanRef.current || {}),
      ...changes,
    };
    editedBenefitPlanRef.current = updatedBenefitPlan;
    onEditedChanged(updatedBenefitPlan);
  }, [onEditedChanged]);

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
  const editedJsonData = safeParseJsonObject(editedBenefitPlan?.jsonExt);
  const hasEditedRanking = Object.prototype.hasOwnProperty.call(editedJsonData, 'enrolment_ranking');
  const ranking = hasEditedRanking
    ? resolveEnrollmentRanking(editedJsonData.enrolment_ranking, null, status)
    : resolveEnrollmentRanking(benefitPlan?.enrolmentRanking, benefitPlan?.jsonExt, status);
  const rankingContextKey = rankingEditorContextKey(benefitPlan, status);
  const savedPlanContextKey = rankingEditorContextKey(benefitPlan, null);
  const rankingOrder = (ranking?.order_by || []).map((entry) => (
    typeof entry === 'string'
      ? entry
      : `${entry.field} ${entry.direction || 'asc'}${entry.cast ? ` (${entry.cast})` : ''}`
  )).join(', ');

  useEffect(() => {
    const savedPlanChanged = savedPlanContextRef.current !== savedPlanContextKey;
    setRankingText(rankingTextForStatus(
      savedPlanChanged ? null : editedBenefitPlanRef.current,
      benefitPlan,
      status,
    ));
    savedPlanContextRef.current = savedPlanContextKey;
    setRankingError('');
    if (editedBenefitPlanRef.current?.enrolmentRankingInvalid) {
      updateEditedBenefitPlan({
        enrolmentRankingInvalid: false,
      });
    }
  }, [rankingContextKey]);

  const handleRankingChange = (event) => {
    const { value } = event.target;
    setRankingText(value);

    if (!value.trim()) {
      setRankingError('');
      const currentBenefitPlan = editedBenefitPlanRef.current || {};
      updateEditedBenefitPlan({
        jsonExt: updateEnrollmentRanking(
          currentBenefitPlan.jsonExt,
          benefitPlan?.enrolmentRanking,
          status,
          null,
        ),
        enrolmentRankingInvalid: false,
      });
      return;
    }

    const { ranking: parsed, error } = parseEnrollmentRankingText(value);
    if (!error) {
      setRankingError('');
      const currentBenefitPlan = editedBenefitPlanRef.current || {};
      updateEditedBenefitPlan({
        jsonExt: updateEnrollmentRanking(
          currentBenefitPlan.jsonExt,
          benefitPlan?.enrolmentRanking,
          status,
          parsed,
        ),
        enrolmentRankingInvalid: false,
      });
    } else {
      setRankingError(error);
      updateEditedBenefitPlan({
        enrolmentRankingInvalid: true,
      });
    }
  };

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
      const currentBenefitPlan = editedBenefitPlanRef.current || {};
      const { jsonExt } = currentBenefitPlan;
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

      if (appendedJsonExt !== jsonExt) {
        updateEditedBenefitPlan({ jsonExt: appendedJsonExt });
      }
    }
  }, [filters, status, canUpdateCriteria]);

  const beneficiaryStatus = formatMessage(`benefitPlan.${activeTab.replace('Tab', '')}.label`);
  const mandatoryRules = mandatoryEligibilityRuleKeys(benefitPlan?.type);

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
          <Grid item xs={12} style={{ marginBottom: '16px' }}>
            <Paper elevation={1} style={{ padding: '16px' }}>
              <Typography variant="subtitle1">
                {formatMessage('benefitPlan.eligibilityRules.mandatoryTitle')}
              </Typography>
              <Typography variant="caption" display="block">
                {formatMessage('benefitPlan.eligibilityRules.mandatoryHelp')}
              </Typography>
              {mandatoryRules.map((key) => (
                <Typography variant="body2" key={key}>{formatMessage(key)}</Typography>
              ))}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1">
              {formatMessage('benefitPlan.eligibilityRules.programCriteriaTitle')}
            </Typography>
            <Typography variant="caption" display="block">
              {formatMessage('benefitPlan.eligibilityRules.programCriteriaHelp')}
            </Typography>
          </Grid>
          {(ranking || canUpdateCriteria) && (
          <Grid item xs={12} style={{ marginBottom: '16px' }}>
            <Paper elevation={1} style={{ padding: '16px' }}>
              <Typography variant="subtitle1">
                {formatMessage('benefitPlan.enrolmentRanking.title')}
              </Typography>
              {canUpdateCriteria ? (
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  variant="outlined"
                  value={rankingText}
                  onChange={handleRankingChange}
                  error={Boolean(rankingError)}
                  helperText={rankingError || formatMessage('benefitPlan.enrolmentRanking.editorHelp')}
                  aria-label={formatMessage('benefitPlan.enrolmentRanking.editorLabel')}
                />
              ) : (
                <>
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
                </>
              )}
            </Paper>
          </Grid>
          )}
          {filters.map((filter, index) => (
            // eslint-disable-next-line react/react-in-jsx-scope
            <PublishedComponent
              pubRef="enrolment.AdvancedCriteriaRowValue"
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
              {formatMessage('benefitPlan.eligibilityRules.addCriteria')}
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
              {formatMessage('benefitPlan.eligibilityRules.clearCriteria')}
            </Button>
          </div>
          )}
          <Grid item xs={12} style={{ marginTop: '16px' }}>
            <Typography variant="subtitle1">
              {formatMessage('benefitPlan.eligibilityRules.additionalFiltersTitle')}
            </Typography>
            <Typography variant="caption">
              {formatMessage('benefitPlan.eligibilityRules.additionalFiltersHelp')}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
    )
  );
}

export default BenefitPlanEligibilityCriteriaPanel;
