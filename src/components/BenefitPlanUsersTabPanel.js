import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  Button,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tab,
  Tooltip,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { makeStyles } from '@material-ui/core/styles';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  coreAlert,
  decodeId,
  formatMessage,
  journalize,
  ProgressOrError,
  PublishedComponent,
  waitForMutation,
} from '@openimis/fe-core';
import {
  assignBenefitPlanUser,
  fetchBenefitPlanUserAccess,
  revokeBenefitPlanUserAccess,
} from '../actions';
import {
  BENEFIT_PLAN_ACCESS_CONTROL_CONFIG,
  BENEFIT_PLAN_USERS_TAB_VALUE,
  DEFAULT_PAGE_SIZE,
  RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { ACTION_TYPE } from '../reducer';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}));

const isBenefitPlanAccessControlEnabled = (modulesManager) => modulesManager?.getConf(
  'fe-social_protection',
  BENEFIT_PLAN_ACCESS_CONTROL_CONFIG,
  false,
) === true;

function BenefitPlanUsersTabLabel({
  intl, rights, onChange, tabStyle, isSelected, modulesManager,
}) {
  const authorised = isBenefitPlanAccessControlEnabled(modulesManager)
    && rights.includes(RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE);
  if (!authorised) return null;
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
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  || user?.username
  || ''
);

function BenefitPlanUsersTabPanel({
  intl,
  modulesManager,
  rights,
  value,
  benefitPlan,
  fetchingBenefitPlanUserAccess,
  benefitPlanUserAccess,
  benefitPlanUserAccessPageInfo,
  benefitPlanUserAccessTotalCount,
  errorBenefitPlanUserAccess,
  submittingMutation,
  mutation,
  fetchBenefitPlanUserAccess,
  assignBenefitPlanUser,
  revokeBenefitPlanUserAccess,
  coreAlert,
  journalize,
  waitForMutation,
}) {
  const classes = useStyles();
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [pendingMutation, setPendingMutation] = useState(null);
  const previousSubmitting = useRef(false);
  const authorised = isBenefitPlanAccessControlEnabled(modulesManager)
    && rights.includes(RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE);
  const mutationInProgress = submittingMutation || !!pendingMutation;

  const loadAssignments = useCallback((pagination) => {
    if (authorised && benefitPlan?.id) {
      fetchBenefitPlanUserAccess([
        `benefitPlanId: "${benefitPlan.id}"`,
        ...pagination,
      ]);
    }
  }, [authorised, benefitPlan?.id, fetchBenefitPlanUserAccess]);

  const loadFirstPage = useCallback(() => {
    setPage(0);
    loadAssignments([`first: ${rowsPerPage}`]);
  }, [loadAssignments, rowsPerPage]);

  useEffect(() => {
    if (value === BENEFIT_PLAN_USERS_TAB_VALUE) loadFirstPage();
  }, [value, loadFirstPage]);

  useEffect(() => {
    const assignmentMutation = [
      ACTION_TYPE.ASSIGN_BENEFIT_PLAN_USER,
      ACTION_TYPE.REVOKE_BENEFIT_PLAN_USER_ACCESS,
    ].includes(mutation?.actionType);
    if (
      previousSubmitting.current
      && !submittingMutation
      && assignmentMutation
      && mutation?.id
      && mutation?.clientMutationId
    ) {
      journalize(mutation);
      setPendingMutation({
        actionType: mutation.actionType,
        clientMutationId: mutation.clientMutationId,
      });
    }
    previousSubmitting.current = submittingMutation;
  }, [submittingMutation, mutation, journalize]);

  useEffect(() => {
    if (!pendingMutation) return undefined;
    let cancelled = false;

    const waitForFinalStatus = async () => {
      try {
        const result = await waitForMutation(pendingMutation.clientMutationId);
        if (cancelled) return;
        if (result?.status === 2) {
          setSelectedUser(null);
          loadFirstPage();
          coreAlert(
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.success'),
            formatMessage(
              intl,
              'socialProtection',
              pendingMutation.actionType === ACTION_TYPE.ASSIGN_BENEFIT_PLAN_USER
                ? 'benefitPlan.users.assign.success'
                : 'benefitPlan.users.revoke.success',
            ),
          );
        }
      } finally {
        if (!cancelled) setPendingMutation(null);
      }
    };

    waitForFinalStatus();
    return () => { cancelled = true; };
  }, [pendingMutation, waitForMutation, loadFirstPage, coreAlert, intl]);

  if (!authorised || value !== BENEFIT_PLAN_USERS_TAB_VALUE) return null;

  const assign = () => {
    if (!selectedUser?.id || !benefitPlan?.id || mutationInProgress) return;
    assignBenefitPlanUser(
      benefitPlan.id,
      decodeId(selectedUser.id),
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.assign.mutationLabel'),
    );
  };

  const revoke = (assignment) => {
    if (mutationInProgress) return;
    revokeBenefitPlanUserAccess(
      assignment.id,
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke.mutationLabel'),
    );
  };

  const changePage = (_, newPage) => {
    if (newPage === page) return;
    const movingForward = newPage > page;
    const cursor = movingForward
      ? benefitPlanUserAccessPageInfo?.endCursor
      : benefitPlanUserAccessPageInfo?.startCursor;
    if (!cursor) return;
    setPage(newPage);
    loadAssignments(movingForward
      ? [`first: ${rowsPerPage}`, `after: "${cursor}"`]
      : [`last: ${rowsPerPage}`, `before: "${cursor}"`]);
  };

  const changeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
  };

  return (
    <Grid container spacing={2} className={classes.root}>
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
          disabled={!selectedUser || mutationInProgress}
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
                          disabled={mutationInProgress}
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
        <TablePagination
          component="div"
          count={benefitPlanUserAccessTotalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          onChangePage={changePage}
          onChangeRowsPerPage={changeRowsPerPage}
        />
      </Grid>
    </Grid>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  fetchingBenefitPlanUserAccess: state.socialProtection.fetchingBenefitPlanUserAccess,
  benefitPlanUserAccess: state.socialProtection.benefitPlanUserAccess,
  benefitPlanUserAccessPageInfo: state.socialProtection.benefitPlanUserAccessPageInfo,
  benefitPlanUserAccessTotalCount: state.socialProtection.benefitPlanUserAccessTotalCount,
  errorBenefitPlanUserAccess: state.socialProtection.errorBenefitPlanUserAccess,
  submittingMutation: state.socialProtection.submittingMutation,
  mutation: state.socialProtection.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchBenefitPlanUserAccess,
  assignBenefitPlanUser,
  revokeBenefitPlanUserAccess,
  coreAlert,
  journalize,
  waitForMutation,
}, dispatch);

const ConnectedBenefitPlanUsersTabPanel = connect(
  mapStateToProps,
  mapDispatchToProps,
)(BenefitPlanUsersTabPanel);

export {
  BenefitPlanUsersTabLabel,
  ConnectedBenefitPlanUsersTabPanel as BenefitPlanUsersTabPanel,
  isBenefitPlanAccessControlEnabled,
  userDisplayName,
};
