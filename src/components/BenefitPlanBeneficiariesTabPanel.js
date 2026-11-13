import React from 'react';
import {
  Grid, Tab, Button, Tooltip,
} from '@material-ui/core';
import {
  Contributions,
  formatMessage,
  useHistory,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import {
  MODULE_NAME,
  BENEFIT_PLAN_BENEFICIARIES_TAB_WRAPPER_VALUE,
  BENEFIT_PLAN_TYPE,
  DEDUPLICATION_SELECT_FIELD_DIALOG_CONTRIBUTION_KEY,
  PAYROLL_CREATE_RIGHTS_PUB_REF,
  PAYROLL_PAYROLL_ROUTE,
} from '../constants';
import BenefitPlanBeneficiariesUploadDialog from '../dialogs/BenefitPlanBeneficiariesUploadDialog';
import BenefitPlanBeneficiariesUploadHistoryDialog from '../dialogs/BenefitPlanBeneficiariesUploadHistoryDialog';
import BenefitPlanBeneficiariesSearcher from './BenefitPlanBeneficiariesSearcher';
import BenefitPlanGroupBeneficiariesSearcher from './BenefitPlanGroupBeneficiariesSearcher';

function BenefitPlanBeneficiariesTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(BENEFIT_PLAN_BENEFICIARIES_TAB_WRAPPER_VALUE)}
      selected={isSelected(BENEFIT_PLAN_BENEFICIARIES_TAB_WRAPPER_VALUE)}
      value={BENEFIT_PLAN_BENEFICIARIES_TAB_WRAPPER_VALUE}
      label={formatMessage(intl, 'socialProtection', 'benefitPlan.beneficiaries.tabGroup.label')}
    />
  );
}

// One list of the Phase's beneficiaries, filtered by status in its search
// criteria. The Phase's beneficiary actions sit with Export in the list header.
function BenefitPlanBeneficiariesTabPanel({
  intl, rights, benefitPlan, value, classes,
}) {
  if (value !== BENEFIT_PLAN_BENEFICIARIES_TAB_WRAPPER_VALUE) {
    return null;
  }

  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const payrollCreateRights = modulesManager.getRef(PAYROLL_CREATE_RIGHTS_PUB_REF);

  const handleCreatePayrollButton = () => {
    history.push(
      `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/null/null/${benefitPlan.id}`,
    );
  };

  const beneficiaryActions = [
    {
      authorized: rights.includes(payrollCreateRights),
      render: () => (
        <Tooltip
          title={formatMessage('benefitPlan.benefitPlanTabPanel.createPayroll.tooltip')}
          disableHoverListener={benefitPlan?.hasPaymentPlans}
        >
          <span>
            <Button
              onClick={handleCreatePayrollButton}
              variant="outlined"
              disabled={!benefitPlan?.hasPaymentPlans}
              className={classes.button}
              style={{ border: '0px', marginTop: '6px' }}
            >
              {formatMessage('benefitPlan.benefitPlanTabPanel.createPayroll')}
            </Button>
          </span>
        </Tooltip>
      ),
    },
    {
      authorized: true,
      render: () => (
        <Contributions
          contributionKey={DEDUPLICATION_SELECT_FIELD_DIALOG_CONTRIBUTION_KEY}
          intl={intl}
          benefitPlan={benefitPlan}
        />
      ),
    },
    { authorized: true, render: () => <BenefitPlanBeneficiariesUploadDialog benefitPlan={benefitPlan} /> },
    { authorized: true, render: () => <BenefitPlanBeneficiariesUploadHistoryDialog benefitPlan={benefitPlan} /> },
  ];

  return (
    <Grid container>
      <Grid item xs={12}>
        {benefitPlan?.type === BENEFIT_PLAN_TYPE.INDIVIDUAL ? (
          <BenefitPlanBeneficiariesSearcher benefitPlan={benefitPlan} extraActions={beneficiaryActions} />
        ) : (
          <BenefitPlanGroupBeneficiariesSearcher benefitPlan={benefitPlan} extraActions={beneficiaryActions} />
        )}
      </Grid>
    </Grid>
  );
}

export { BenefitPlanBeneficiariesTabLabel, BenefitPlanBeneficiariesTabPanel };
