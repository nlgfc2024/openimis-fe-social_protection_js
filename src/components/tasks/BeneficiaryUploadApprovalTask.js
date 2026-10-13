/* eslint-disable eqeqeq */
/* eslint-disable no-prototype-builtins */
/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
/* eslint-disable no-return-assign */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Paper, Fab, makeStyles, Grid, Checkbox, FormControlLabel, Divider, GridItem,
} from '@material-ui/core';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import {
  Table, coreConfirm, SelectDialog,
  withModulesManager,
  decodeId,
  PublishedComponent,
  ControlledField,
  TextInput,
  formatMessage,
  formatMessageWithValues,
} from '@openimis/fe-core';
import ClearIcon from '@material-ui/icons/Clear';
import CheckIcon from '@material-ui/icons/Check';

import { useIntl } from 'react-intl';
import { TASK_STATUS, APPROVED, FAILED } from '../../constants';
import { fetchPendingBeneficiaryUploads, resolveTask } from '../../actions';

const LOCATION_FIELDS = ['district', 'traditional_authority', 'gvh', 'village'];
const PRIMARY_FIELDS = ['first_name', 'last_name', 'dob'];
const PREFERRED_FIELDS = [
  ...LOCATION_FIELDS,
  ...PRIMARY_FIELDS,
  'gender',
  'form_number',
  'national_id',
  'fit_for_work',
  'validation_status',
  'household_mobile_number',
  'household_wealth_quintile',
  'household_pmt_score',
];
const LAST_FIELDS = ['business_period', 'type_of_business', 'validation_notes', 'business_experience'];
const HIDDEN_FIELDS = [
  'uuid', 'ID', 'Unnamed: 0', 'ubr_id', 'location_code', 'location_name',
  'traditional_authority_code', 'traditional_authority_name',
  'group_village_head_code', 'group_village_head_name',
];
const FIELD_LABELS = {
  district: 'approvalTable.district',
  traditional_authority: 'approvalTable.traditionalAuthority',
  gvh: 'approvalTable.gvh',
  village: 'approvalTable.village',
  last_name: 'approvalTable.lastName',
  first_name: 'approvalTable.firstName',
  dob: 'approvalTable.dateOfBirth',
  form_number: 'approvalTable.formNumber',
  national_id: 'approvalTable.nationalId',
  fit_for_work: 'approvalTable.fitForWork',
  validation_status: 'approvalTable.validationStatus',
  household_mobile_number: 'approvalTable.householdMobileNumber',
  household_wealth_quintile: 'approvalTable.householdWealthQuintile',
  household_pmt_score: 'approvalTable.householdPmtScore',
  business_period: 'approvalTable.businessPeriod',
  type_of_business: 'approvalTable.typeOfBusiness',
  validation_notes: 'approvalTable.validationNotes',
  business_experience: 'approvalTable.businessExperience',
};

const humanizeFieldName = (fieldName) => fieldName
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const locationColumns = (location) => {
  const village = location;
  const gvh = village?.parent;
  const traditionalAuthority = gvh?.parent;
  const district = traditionalAuthority?.parent;

  return {
    district: district?.name || '',
    traditional_authority: traditionalAuthority?.name || '',
    gvh: gvh?.name || '',
    village: village?.name || '',
  };
};

const formatCellValue = (key, value) => {
  if (key !== 'fit_for_work') return value;
  if ([1, '1', true, 'true', 'yes', 'YES'].includes(value)) return 'Yes';
  if ([0, '0', false, 'false', 'no', 'NO'].includes(value)) return 'No';
  return value;
};

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  title: theme.paper.title,
  button: theme.paper.button,
  fabContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  fabHeaderContainer: {
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  fab: {
    margin: theme.spacing(1),
  },

}));

function BeneficiaryUploadTaskDisplay({
  businessData, setAdditionalData, jsonExt,
}) {
  const {
    errorPendingBeneficiaries,
    pendingBeneficiaries,
    fetchedPendingBeneficiaries,
    fetchingPendingBeneficiaries,
    pendingBeneficiariesPageInfo,
  } = useSelector((state) => state.socialProtection);
  const intl = useIntl();
  const [pending, setPending] = useState([]);
  const [keys, setKeys] = useState([]);
  const [state, setState] = useState({
    page: 0,
    pageSize: 10,
    afterCursor: null,
    beforeCursor: null,
  });

  const isTaskResolved = () => ![TASK_STATUS.RECEIVED, TASK_STATUS.ACCEPTED].includes(task?.status);
  const dispatch = useDispatch();
  const queryPrms = () => ({
    upload_Id: jsonExt?.data_upload_id,
    isDeleted: isTaskResolved() ? undefined : false,
  });

  const { task } = useSelector((state) => state.tasksManagement);
  const currentUser = useSelector((state) => state.core.user);

  const [selectedRecords, setSelectedRecords] = useState([]);
  const query = () => {
    const prms = queryPrms();
    if (!state.pageSize || !prms) return;
    prms.pageSize = state.pageSize;
    if (state.afterCursor) {
      prms.after = state.afterCursor;
    }
    if (state.beforeCursor) {
      prms.before = state.beforeCursor;
    }

    dispatch(fetchPendingBeneficiaryUploads(prms));
  };

  const currentPage = () => state.page;
  const currentPageSize = () => state.pageSize;

  useEffect(() => {
    query();
  }, []);

  useEffect(() => {
    query();
  }, [state]);

  const organizeData = (data) => {
    const uniqueKeys = [...PREFERRED_FIELDS];

    data.forEach((i) => Object.keys(i).forEach((k) => {
      if (!uniqueKeys.includes(k)) {
        uniqueKeys.push(k);
      }
    }));

    // Remove internal identifiers
    // Unnamed 0 is ordinal often found in the uploaded CSVs, it shoun't appear in new
    // version but is added for backward compatibility s
    const visibleKeys = uniqueKeys.filter((key) => !HIDDEN_FIELDS.includes(key));
    const orderedKeys = PREFERRED_FIELDS.filter((key) => visibleKeys.includes(key));
    const remainingKeys = visibleKeys.filter((key) => !PREFERRED_FIELDS.includes(key) && !LAST_FIELDS.includes(key));
    const trailingKeys = LAST_FIELDS.filter((key) => visibleKeys.includes(key));
    return [...orderedKeys, ...remainingKeys, ...trailingKeys];
  };

  const [storedIndividuals, setStoredIndividuals] = useState({});

  useEffect(() => {
    // eslint-disable-next-line max-len
    setPending(pendingBeneficiaries.map((x) => ({
      ...(x.jsonExt ? JSON.parse(x.jsonExt) : {}),
      ...locationColumns(x.individual?.location),
      uuid: x.uuid,
    })));
    const withIndividuals = {};
    pendingBeneficiaries.map((x) => withIndividuals[x.id] = x.individual?.id);
    setStoredIndividuals(withIndividuals);
  }, [pendingBeneficiaries]);

  useEffect(() => setKeys(organizeData(pending)), [pending]);

  const classes = useStyles();
  const beneficiaryUuids = (businessData?.ids || []).map((id) => id.uuid);
  const beneficiaries = (businessData?.ids || []).map((id) => {
    // eslint-disable-next-line camelcase
    const { individual, json_ext, ...rest } = id;
    return {
      ...rest,
      ...individual,
      // eslint-disable-next-line camelcase
      ...json_ext,
      individual: individual.uuid,
    };
  });

  const headers = () => [
    task?.status === TASK_STATUS.ACCEPTED
      ? formatMessage(intl, 'socialProtection', 'selectForEvaluation') : formatMessage(intl, 'socialProtection', 'evaluated'),
    ...keys.map((key) => (FIELD_LABELS[key]
      ? formatMessage(intl, 'socialProtection', FIELD_LABELS[key])
      : humanizeFieldName(key)))] || [];

  const changeCheckboxState = (pending) => {
    setSelectedRecords(selectedRecords.includes(pending.uuid)
      ? selectedRecords.filter((x) => x !== pending.uuid) : [...selectedRecords, pending.uuid]);
  };

  const itemFormatters = () => {
    const items = [
      (pending) => (
        <>
          {!isTaskResolved() ? (
            <Checkbox
              color="primary"
              checked={selectedRecords.includes(pending.uuid)}
              onChange={(event) => changeCheckboxState(pending)}
              disabled={isRowDisabled()}
            />
          ) : (
            <Checkbox
              color="primary"
              checked={storedIndividuals[pending.uuid] != undefined}
              onChange={(event) => {}}
              disabled
            />
          )}

        </>
      ),
    ];

    keys.map((key) => items.push((pending) => (
      pending.hasOwnProperty(key) ? formatCellValue(key, pending[key]) : '-'
    )));
    return items;
  };

  const onChangeRowsPerPage = (rows) => {
    setState({
      ...state,
      pageSize: rows,
    });
  };

  const onChangeSelection = (rows) => {
    setSelectedRecords(rows.map((row) => row.uuid));
  };

  const onChangePage = (page, nbr) => {
    const next = nbr > state.page;

    setState(
      {
        page: next ? state.page + 1 : state.page - 1,
        pageSize: state.pageSize,
        afterCursor: next ? pendingBeneficiariesPageInfo.endCursor : null,
        beforeCursor: !next ? pendingBeneficiariesPageInfo.startCursor : null,
      },
    );
  };

  const isCurrentUserInTaskGroup = () => {
    const taskExecutors = task?.taskGroup?.taskexecutorSet?.edges.map((edge) => decodeId(edge.node.user.id)) ?? [];
    return taskExecutors && taskExecutors.includes(currentUser?.id);
  };

  const isRowDisabled = (_) => !isCurrentUserInTaskGroup() || task?.status !== TASK_STATUS.ACCEPTED;

  const [approveOrFail, setApproveOrFail] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const [openModal, setOpenModal] = useState(null);
  const [disabled, setDisable] = useState(false);

  const clear = () => {
    setOpenModal(null);
    setApproveOrFail('');
    setConfirmed('');
  };

  useEffect(() => {
    if (task?.id && currentUser?.id) {
      if (confirmed) {
        setDisable(true);
        dispatch(resolveTask(
          task,
          formatMessage(intl, 'tasksManagement', 'task.resolve.mutationLabel'),
          currentUser,
          approveOrFail,
          selectedRecords,
        ));
      }
    }
    return () => confirmed && clear(false);
  }, [confirmed]);

  const onConfirm = () => {
    setOpenModal(false);
    setConfirmed(true);
  };

  const onClose = () => {
    setOpenModal(false);
    setConfirmed(false);
  };

  const handleButtonClick = (choiceString) => {
    if (task?.id && currentUser?.id) {
      setApproveOrFail(choiceString);
      setOpenModal(true);
    }
  };

  return (
    <>
      <SelectDialog
        confirmState={openModal}
        onConfirm={onConfirm}
        onClose={onClose}
        module="socialProtection"
        confirmTitle="taskConfirmation.title"
        confirmMessage={formatMessageWithValues(intl, 'socialProtection', 'atomicApprove', { count: selectedRecords.length })}
        confirmationButton="dialogActions.continue"
        rejectionButton="dialogActions.goBack"
      />
      <Table
        module="socialProtection"
        headers={headers()}
          // headerActions={headerActions}
        itemFormatters={itemFormatters()}
        items={(!!pending && pending) || []}
        fetching={fetchingPendingBeneficiaries}
        error={errorPendingBeneficiaries}
          // onDoubleClick={this.onDoubleClick}
        withSelection={!isRowDisabled() ? 'multiple' : ''}
        onChangeSelection={onChangeSelection}
        withPagination
        rowsPerPageOptions={[10, 20, 10, 100]}
        defaultPageSize={10}
        page={currentPage()}
        pageSize={currentPageSize()}
        count={pendingBeneficiariesPageInfo.totalCount}
        onChangePage={onChangePage}
        onChangeRowsPerPage={onChangeRowsPerPage}
        rowDisabled={isRowDisabled}
      />

      {isCurrentUserInTaskGroup()
    && (
    <>
      {' '}
      <Paper className={classes.paper}>
        <div className={classes.fabHeaderContainer}>
          {formatMessage(intl, 'socialProtection', 'resolveSelectedTasks')}
          <Divider />
        </div>
        <div className={classes.fabContainer}>
          <div className={classes.fab}>
            <Fab
              color="primary"
              disabled={disabled || task?.status === TASK_STATUS.RECEIVED || isRowDisabled() || selectedRecords.length === 0}
              onClick={() => handleButtonClick('ACCEPT')}
            >
              <CheckIcon />
            </Fab>
            {formatMessage(intl, 'socialProtection', 'acceptSelected')}
          </div>
          <div className={classes.fab}>
            <Fab
              color="primary"
              disabled={disabled || task?.status === TASK_STATUS.RECEIVED || isRowDisabled() || selectedRecords.length === 0}
              onClick={() => handleButtonClick('REJECT')}
            >
              <ClearIcon />
            </Fab>
            {formatMessage(intl, 'socialProtection', 'rejectSelected')}
          </div>
        </div>
      </Paper>
    </>
    )}
    </>
  );
}

const UploadResolutionTaskTableHeaders = () => [];

const UploadResolutionItemFormatters = () => [
  (businessData, jsonExt, formatterIndex, setAdditionalData) => (
    <BeneficiaryUploadTaskDisplay
      businessData={businessData}
      setAdditionalData={setAdditionalData}
      jsonExt={jsonExt}
    />
  ),
];

function UploadConfirmationPanel({ defaultAction, defaultDisabled }) {
  const intl = useIntl();
  const classes = useStyles();
  const { task } = useSelector((state) => state.tasksManagement);
  const currentUser = useSelector((state) => state.core.user);
  const [disabled, setDisable] = useState(defaultDisabled);

  const [openModal, setOpenModal] = useState(null);
  const [approveOrFail, setApproveOrFail] = useState('');
  const [confirmed, setConfirmed] = useState('');

  const onConfirm = () => {
    setOpenModal(false);
    setConfirmed(true);
  };

  const onClose = () => {
    setOpenModal(false);
    setConfirmed(false);
  };

  const isCurrentUserInTaskGroup = () => {
    const taskExecutors = task?.taskGroup?.taskexecutorSet?.edges.map((edge) => decodeId(edge.node.user.id)) ?? [];
    return taskExecutors && taskExecutors.includes(currentUser?.id);
  };

  const isRowDisabled = (_) => !isCurrentUserInTaskGroup() || task?.status !== TASK_STATUS.ACCEPTED;

  const clear = () => {
    setOpenModal(null);
    setApproveOrFail('');
    setConfirmed('');
  };

  const handleButtonClick = (choiceString) => {
    // () => defaultAction(APPROVED)
    if (task?.id && currentUser?.id) {
      setApproveOrFail(choiceString);
      setOpenModal(true);
    }
  };

  const dispatch = useDispatch();

  useEffect(() => {
    if (task?.id && currentUser?.id) {
      if (confirmed) {
        setDisable(true);
        dispatch(resolveTask(
          task,
          formatMessage(intl, 'tasksManagement', 'task.resolve.mutationLabel'),
          currentUser,
          approveOrFail,

        ));
      }
    }
    return () => confirmed && clear();
  }, [confirmed]);

  return (
    <>
      <SelectDialog
        confirmState={openModal}
        onConfirm={onConfirm}
        onClose={onClose}
        module="socialProtection"
        confirmTitle="taskConfirmation.title"
        confirmMessage={formatMessage(intl, 'socialProtection', 'bulkApprove')}
        confirmationButton="dialogActions.continue"
        rejectionButton="dialogActions.goBack"
      />
      <Paper className={classes.paper}>
        <div className={classes.fabHeaderContainer}>
          {formatMessage(intl, 'socialProtection', 'resolveAllRemainingTasks')}
          <Divider />
        </div>
        <div className={classes.fabContainer}>
          <div className={classes.fab}>
            <Fab
              color="primary"
              disabled={disabled || isRowDisabled()}
              onClick={() => handleButtonClick(APPROVED)}
            >
              <CheckIcon />
            </Fab>
            {formatMessage(intl, 'socialProtection', 'approveAll')}

          </div>
          <div className={classes.fab}>
            <Fab
              color="primary"
              disabled={disabled || task?.status === TASK_STATUS.RECEIVED || isRowDisabled()}
              onClick={() => handleButtonClick(FAILED)}
            >
              <ClearIcon />
            </Fab>
            {formatMessage(intl, 'socialProtection', 'rejectAll')}
          </div>
        </div>
      </Paper>
    </>
  );
}

export { UploadResolutionTaskTableHeaders, UploadResolutionItemFormatters, UploadConfirmationPanel };
