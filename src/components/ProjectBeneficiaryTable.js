import React, { useState, useEffect, useRef, useMemo } from 'react';
import { injectIntl } from 'react-intl';
import {
  formatMessage,
  formatMessageWithValues,
  useModulesManager,
} from '@openimis/fe-core';
import { connect, useDispatch } from 'react-redux';
import {
  Button,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import {
  MODULE_NAME,
  RIGHT_PROJECT_UPDATE,
} from '../constants';
import BeneficiaryTable from './BeneficiaryTable';
import {
  ProjectBeneficiariyEnrollmentDialog,
  ProjectGroupBeneficiaryEnrollmentDialog,
} from '../dialogs/ProjectEnrollmentDialog';
import { REQUEST } from '../util/action-type';
import { ACTION_TYPE } from '../reducer';

function BaseProjectBeneficiaryTable({
  project,
  isGroup,
  EnrollmentDialogComponent,
  rights,
  intl,
  fetchingBeneficiaries,
  beneficiaries,
  beneficiariesTotalCount,
}) {
  const orderBy = isGroup ? 'orderBy: ["group__code"]' : 'orderBy: ["individual__last_name", "individual__first_name"]';
  const actionType = isGroup
    ? ACTION_TYPE.SEARCH_PROJECT_GROUP_BENEFICIARIES
    : ACTION_TYPE.SEARCH_PROJECT_BENEFICIARIES;
  const modulesManager = useModulesManager();
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const tableTitle = formatMessageWithValues(
    intl,
    MODULE_NAME,
    'projectBeneficiaries.enrolled',
    { n: beneficiariesTotalCount },
  );
  const materialTableRef = useRef();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const dispatch = useDispatch();
  // Trigger fetch: batch & concat handled in projectBeneficiariesMiddleware & reducers
  useEffect(() => {
    if (project?.benefitPlan?.id) {
      dispatch({
        type: REQUEST(actionType),
        meta: {
          fetchAllForProjectId: project.id,
          modulesManager,
        },
      });
    }
  }, [project?.benefitPlan?.id]);

  const assignButtonComponentFn = () => (
    <Button
      startIcon={<AddIcon />}
      variant="contained"
      color="primary"
    >
      <Typography variant="body2">{formatMessage(intl, MODULE_NAME, 'projectBeneficiaries.enroll')}</Typography>
    </Button>
  );

  const enterTimeComponentFn = () => {
    const isEditing = materialTableRef.current?.dataManager?.bulkEditOpen;

    return (
      <Button
        variant="contained"
        color="primary"
      >
        <Typography variant="body2">
          {isEditing
            ? formatMessage(intl, MODULE_NAME, 'projectBeneficiaries.saveTime')
            : formatMessage(intl, MODULE_NAME, 'projectBeneficiaries.enterTime')}
        </Typography>
      </Button>
    );
  };

  function scrollToFirstWorkingDayColumn() {
    const scrollContainer = materialTableRef.current?.tableContainerDiv?.current;
    if (!scrollContainer) return;

    const headerCells = scrollContainer.querySelectorAll('thead th');
    const firstDayTitle = `${formatMessage(intl, MODULE_NAME, 'project.day')} 1`;
    const targetHeader = Array.from(headerCells).find((th) => th.textContent.includes(firstDayTitle));

    if (targetHeader) {
      const numFrozenCols = isGroup ? 3 : 2;
      const frozenColumns = Array.from(headerCells).slice(0, numFrozenCols);
      const frozenWidth = frozenColumns.reduce((sum, th) => sum + th.offsetWidth, 0);

      scrollContainer.scrollTo({
        left: targetHeader.offsetLeft - frozenWidth,
        behavior: 'smooth',
      });
    }
  }

  const handleToggleEdit = () => {
    const materialTable = materialTableRef.current;
    if (!materialTable?.dataManager) return;

    const isEditing = materialTable.dataManager.bulkEditOpen;

    if (isEditing) {
      // TODO: implement API
      // const updatedRows = Object.values(materialTable.state.bulkEditChangedRows || {});
      // if (updatedRows.length > 0) {
      //   dispatch({
      //     type: REQUEST(ACTION_TYPE.UPDATE_PROJECT_BENEFICIARIES_PROGRESS),
      //     payload: updatedRows,
      //     meta: { projectId: project.id },
      //   });
      // }
    }

    const newState = !isEditing;
    materialTable.dataManager.changeBulkEditOpen(newState);
    materialTable.setState({
      ...materialTable.dataManager.getRenderState(),
    });
    setBulkEditOpen(newState);

    if (newState) {
      // Allow the DOM to re-render the editable cells first
      setTimeout(() => {
        scrollToFirstWorkingDayColumn();
      }, 300);
    }
  };

  const cancelEditButtonFn = () => (
    <Button variant="outlined" color="default">
      <Typography variant="body2">
        {formatMessage(intl, MODULE_NAME, 'projectBeneficiaries.cancelEdit')}
      </Typography>
    </Button>
  );

  const handleCancelEdit = () => {
    const materialTable = materialTableRef.current;
    if (!materialTable?.dataManager) return;

    materialTable.dataManager.changeBulkEditOpen(false);
    materialTable.setState({
      ...materialTable.dataManager.getRenderState(),
    });
    setBulkEditOpen(false);
  };

  function getTableActions() {
    if (!rights.includes(RIGHT_PROJECT_UPDATE)) return [];

    const materialTable = materialTableRef.current;
    const tableActions = [
      {
        icon: assignButtonComponentFn,
        isFreeAction: true,
        onClick: () => setEnrollmentDialogOpen(true),
      },
      {
        icon: enterTimeComponentFn,
        isFreeAction: true,
        onClick: handleToggleEdit,
      },
    ];

    if (materialTable?.dataManager?.bulkEditOpen) {
      tableActions.push({
        icon: cancelEditButtonFn,
        isFreeAction: true,
        onClick: handleCancelEdit,
      });
    }

    return tableActions;
  }

  const actions = useMemo(getTableActions, [rights, bulkEditOpen]);

  return (
    !!project?.id && (
      <>
        <BeneficiaryTable
          allRows={beneficiaries}
          fetchingBeneficiaries={fetchingBeneficiaries}
          tableTitle={tableTitle}
          isGroup={isGroup}
          actions={actions}
          workingDays={project.workingDays}
          tableRef={materialTableRef}
        />
        <EnrollmentDialogComponent
          open={enrollmentDialogOpen}
          onClose={() => setEnrollmentDialogOpen(false)}
          project={project}
          enrolledBeneficiaries={beneficiaries}
          isGroup={isGroup}
          orderBy={orderBy}
        />
      </>
    )
  );
}

// For Individual Beneficiaries
const mapStateToPropsIndividual = (state) => ({
  rights: state.core?.user?.i_user?.rights ?? [],
  fetchingBeneficiaries: state.socialProtection.fetchingProjectBeneficiaries,
  beneficiaries: state.socialProtection.projectBeneficiaries,
  beneficiariesTotalCount: state.socialProtection.projectBeneficiariesTotalCount,
});

const ConnectedProjectBeneficiaryTable = connect(
  mapStateToPropsIndividual,
)(BaseProjectBeneficiaryTable);

export const ProjectBeneficiaryTable = injectIntl((props) => (
  <ConnectedProjectBeneficiaryTable
    {...props}
    EnrollmentDialogComponent={ProjectBeneficiariyEnrollmentDialog}
  />
));

// For Group Beneficiaries
const mapStateToPropsGroup = (state) => ({
  rights: state.core?.user?.i_user?.rights ?? [],
  fetchingBeneficiaries: state.socialProtection.fetchingProjectGroupBeneficiaries,
  beneficiaries: state.socialProtection.projectGroupBeneficiaries,
  beneficiariesTotalCount: state.socialProtection.projectGroupBeneficiariesTotalCount,
});

const ConnectedProjectGroupBeneficiaryTable = connect(
  mapStateToPropsGroup,
)(BaseProjectBeneficiaryTable);

export const ProjectGroupBeneficiaryTable = injectIntl((props) => (
  <ConnectedProjectGroupBeneficiaryTable
    {...props}
    isGroup
    EnrollmentDialogComponent={ProjectGroupBeneficiaryEnrollmentDialog}
  />
));
