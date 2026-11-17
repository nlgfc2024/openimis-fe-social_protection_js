import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tooltip,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  coreAlert,
  formatMessage,
  ProgressOrError,
  PublishedComponent,
} from '@openimis/fe-core';
import {
  assignBenefitPlanUser,
  fetchBenefitPlanUserAccess,
  revokeBenefitPlanUserAccess,
} from '../actions';
import {
  BENEFIT_PLAN_USERS_TAB_VALUE,
  RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE,
} from '../constants';
import { ACTION_TYPE } from '../reducer';

function BenefitPlanUsersTabLabel({
  intl, rights, onChange, tabStyle, isSelected,
}) {
  if (!rights.includes(RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE)) return null;
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(BENEFIT_PLAN_USERS_TAB_VALUE)}
      selected={isSelected(BENEFIT_PLAN_USERS_TAB_VALUE)}
      value={BENEFIT_PLAN_USERS_TAB_VALUE}
      label={formatMessage(intl, 'socialProtection', 'benefitPlan.users.label')}
    />
  );
}

const userDisplayName = (user) => (
  [user?.iUser?.otherNames, user?.iUser?.lastName].filter(Boolean).join(' ').trim()
  || user?.username
  || ''
);

function BenefitPlanUsersTabPanel({
  intl,
  rights,
  value,
  benefitPlan,
  fetchingBenefitPlanUserAccess,
  benefitPlanUserAccess,
  errorBenefitPlanUserAccess,
  submittingMutation,
  mutation,
  fetchBenefitPlanUserAccess,
  assignBenefitPlanUser,
  revokeBenefitPlanUserAccess,
  coreAlert,
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const previousSubmitting = useRef(false);
  const authorised = rights.includes(RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE);

  const reload = () => {
    if (authorised && benefitPlan?.id) {
      fetchBenefitPlanUserAccess([
        `benefitPlanId: "${benefitPlan.id}"`,
        'first: 100',
      ]);
    }
  };

  useEffect(() => {
    if (value === BENEFIT_PLAN_USERS_TAB_VALUE) reload();
  }, [value, benefitPlan?.id, authorised]);

  useEffect(() => {
    const assignmentMutation = [
      ACTION_TYPE.ASSIGN_BENEFIT_PLAN_USER,
      ACTION_TYPE.REVOKE_BENEFIT_PLAN_USER_ACCESS,
    ].includes(mutation?.actionType);
    if (previousSubmitting.current && !submittingMutation && assignmentMutation) {
      setSelectedUser(null);
      reload();
      if (mutation?.id) {
        coreAlert(
          formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.success'),
          formatMessage(
            intl,
            'socialProtection',
            mutation.actionType === ACTION_TYPE.ASSIGN_BENEFIT_PLAN_USER
              ? 'benefitPlan.users.assign.success'
              : 'benefitPlan.users.revoke.success',
          ),
        );
      }
    }
    previousSubmitting.current = submittingMutation;
  }, [submittingMutation]);

  if (!authorised || value !== BENEFIT_PLAN_USERS_TAB_VALUE) return null;

  const assign = () => {
    if (!selectedUser?.id || !benefitPlan?.id || submittingMutation) return;
    assignBenefitPlanUser(
      benefitPlan.id,
      selectedUser.id,
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.assign.mutationLabel'),
    );
  };

  const revoke = (assignment) => {
    if (submittingMutation) return;
    revokeBenefitPlanUserAccess(
      assignment.id,
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke.mutationLabel'),
    );
  };

  return (
    <Grid container spacing={2} style={{ padding: 16 }}>
      <Grid item xs={10} md={6}>
        <PublishedComponent
          pubRef="admin.UserPicker"
          module="socialProtection"
          value={selectedUser}
          onChange={setSelectedUser}
          withLabel
          label={formatMessage(intl, 'socialProtection', 'benefitPlan.users.select')}
        />
      </Grid>
      <Grid item xs={2} md={2}>
        <Button
          color="primary"
          variant="contained"
          disabled={!selectedUser || submittingMutation}
          onClick={assign}
        >
          {formatMessage(intl, 'socialProtection', 'benefitPlan.users.assign')}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{formatMessage(intl, 'socialProtection', 'benefitPlan.users.user')}</TableCell>
                <TableCell>{formatMessage(intl, 'socialProtection', 'benefitPlan.users.username')}</TableCell>
                <TableCell align="right">
                  {formatMessage(intl, 'socialProtection', 'benefitPlan.users.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <ProgressOrError
                progress={fetchingBenefitPlanUserAccess}
                error={errorBenefitPlanUserAccess}
              />
              {!fetchingBenefitPlanUserAccess && !benefitPlanUserAccess.length && (
                <TableRow>
                  <TableCell colSpan={3}>
                    {formatMessage(intl, 'socialProtection', 'benefitPlan.users.empty')}
                  </TableCell>
                </TableRow>
              )}
              {benefitPlanUserAccess.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{userDisplayName(assignment.user)}</TableCell>
                  <TableCell>{assignment.user?.username}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke')}>
                      <span>
                        <IconButton
                          disabled={submittingMutation}
                          onClick={() => revoke(assignment)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  fetchingBenefitPlanUserAccess: state.socialProtection.fetchingBenefitPlanUserAccess,
  benefitPlanUserAccess: state.socialProtection.benefitPlanUserAccess,
  errorBenefitPlanUserAccess: state.socialProtection.errorBenefitPlanUserAccess,
  submittingMutation: state.socialProtection.submittingMutation,
  mutation: state.socialProtection.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchBenefitPlanUserAccess,
  assignBenefitPlanUser,
  revokeBenefitPlanUserAccess,
  coreAlert,
}, dispatch);

const ConnectedBenefitPlanUsersTabPanel = connect(
  mapStateToProps,
  mapDispatchToProps,
)(BenefitPlanUsersTabPanel);

export {
  BenefitPlanUsersTabLabel,
  ConnectedBenefitPlanUsersTabPanel as BenefitPlanUsersTabPanel,
  userDisplayName,
};
