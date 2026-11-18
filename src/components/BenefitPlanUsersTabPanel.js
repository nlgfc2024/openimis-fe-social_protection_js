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
  coreConfirm,
  decodeId,
  formatMessage,
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
  BENEFIT_PLAN_USERS_TAB_VALUE,
  DEFAULT_PAGE_SIZE,
  RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { ACTION_TYPE } from '../reducer';
import {
  applyAssignmentMutationOutcome,
  assignmentMutationError,
  canManageBenefitPlanUsers,
  isBenefitPlanAccessControlEnabled,
} from '../util/benefit-plan-users';
import { createRevokeConfirmedAction } from '../util/confirmation-actions';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}));

let benefitPlanAccessRequestSequence = 0;

function BenefitPlanUsersTabLabel({
  intl, rights, onChange, tabStyle, isSelected, modulesManager,
}) {
  const authorised = canManageBenefitPlanUsers(
    modulesManager,
    rights,
    RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE,
  );
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
  coreConfirm,
  waitForMutation,
  setConfirmedAction,
}) {
  const classes = useStyles();
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [pendingMutation, setPendingMutation] = useState(null);
  const previousSubmitting = useRef(false);
  const latestAccessRequest = useRef(0);
  const authorised = canManageBenefitPlanUsers(
    modulesManager,
    rights,
    RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE,
  );
  const mutationInProgress = submittingMutation || !!pendingMutation;

  const loadAssignments = useCallback(async (pagination) => {
    if (authorised && benefitPlan?.id) {
      benefitPlanAccessRequestSequence += 1;
      const requestId = benefitPlanAccessRequestSequence;
      latestAccessRequest.current = requestId;
      try {
        const response = await fetchBenefitPlanUserAccess([
          `benefitPlanId: "${benefitPlan.id}"`,
          ...pagination,
        ], requestId);
        const failed = response?.error || response?.payload?.errors?.length;
        return requestId === latestAccessRequest.current && !failed;
      } catch (error) {
        if (requestId === latestAccessRequest.current) {
          coreAlert(
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.list.failed'),
            assignmentMutationError(
              error,
              formatMessage(intl, 'socialProtection', 'benefitPlan.users.list.failed.message'),
              (key) => formatMessage(intl, 'socialProtection', key),
            ),
          );
        }
        return false;
      }
    }
    return false;
  }, [authorised, benefitPlan?.id, coreAlert, fetchBenefitPlanUserAccess, intl]);

  const loadFirstPage = useCallback(async () => {
    const loaded = await loadAssignments([`first: ${rowsPerPage}`]);
    if (loaded) setPage(0);
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
      setPendingMutation({
        actionType: mutation.actionType,
        clientMutationId: mutation.clientMutationId,
      });
    }
    previousSubmitting.current = submittingMutation;
  }, [submittingMutation, mutation]);

  useEffect(() => {
    if (!pendingMutation) return undefined;
    let cancelled = false;

    const waitForFinalStatus = async () => {
      try {
        const result = await waitForMutation(pendingMutation.clientMutationId);
        if (cancelled) return;
        applyAssignmentMutationOutcome(result, {
          onSuccess: () => {
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
          },
          onFailure: (error) => coreAlert(
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.failed'),
            assignmentMutationError(
              error,
              formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.failed.message'),
              (key) => formatMessage(intl, 'socialProtection', key),
            ),
          ),
          onPending: () => coreAlert(
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.pending'),
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.pending.message'),
          ),
        });
      } catch (error) {
        if (!cancelled) {
          coreAlert(
            formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.failed'),
            assignmentMutationError(
              error,
              formatMessage(intl, 'socialProtection', 'benefitPlan.users.alert.polling.message'),
              (key) => formatMessage(intl, 'socialProtection', key),
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

  const confirmRevoke = (assignment) => {
    if (mutationInProgress) return;
    const revokeAction = createRevokeConfirmedAction(
      revokeBenefitPlanUserAccess,
      assignment.id,
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke.mutationLabel'),
    );
    setConfirmedAction(() => revokeAction);
    coreConfirm(
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke.confirm.title'),
      formatMessage(intl, 'socialProtection', 'benefitPlan.users.revoke.confirm.message'),
      null,
      'warning',
    );
  };

  const changePage = async (_, newPage) => {
    if (newPage === page) return;
    const movingForward = newPage > page;
    const cursor = movingForward
      ? benefitPlanUserAccessPageInfo?.endCursor
      : benefitPlanUserAccessPageInfo?.startCursor;
    if (!cursor) return;
    const loaded = await loadAssignments(movingForward
      ? [`first: ${rowsPerPage}`, `after: "${cursor}"`]
      : [`last: ${rowsPerPage}`, `before: "${cursor}"`]);
    if (loaded) setPage(newPage);
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
              {(fetchingBenefitPlanUserAccess || errorBenefitPlanUserAccess) && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <ProgressOrError
                      progress={fetchingBenefitPlanUserAccess}
                      error={errorBenefitPlanUserAccess}
                    />
                  </TableCell>
                </TableRow>
              )}
              {!fetchingBenefitPlanUserAccess
                && !errorBenefitPlanUserAccess
                && !benefitPlanUserAccess.length && (
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
                          onClick={() => confirmRevoke(assignment)}
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
          onPageChange={changePage}
          onRowsPerPageChange={changeRowsPerPage}
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
  coreConfirm,
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
