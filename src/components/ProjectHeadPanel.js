import React from 'react';
import { Grid } from '@material-ui/core';
import { connect } from 'react-redux';
import {
  FormPanel,
  NumberInput,
  PublishedComponent,
  TextInput,
  formatMessage,
  withModulesManager,
} from '@openimis/fe-core';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import ProjectStatusPicker from '../pickers/ProjectStatusPicker';
import ProjectSectorPicker from '../pickers/ProjectSectorPicker';
import ProjectAllowsMultiEnrollmentPicker from '../pickers/ProjectAllowsMultiEnrollmentPicker';
import MicroCatchmentPicker from '../pickers/MicroCatchmentPicker';
import { generatedProjectName } from '../util/project';

const styles = (theme) => ({
  item: theme.paper.item,
});

class ProjectHeadPanel extends FormPanel {
  onDistrictChange = (district) => {
    this.updateAttribute('district', district);
    this.updateAttribute('microCatchment', null);
  };

  onMicroCatchmentChange = (microCatchment) => {
    this.updateAttribute('microCatchment', microCatchment);
  }

  render() {
    const {
      edited,
      classes,
      readOnly,
      intl,
    } = this.props;

    const project = { ...edited };
    const projectName = project?.name || generatedProjectName(project);

    return (
      <Grid container className={classes.item}>
        <Grid item xs={4} className={classes.item}>
          <PublishedComponent
            pubRef="location.DistrictPicker"
            module="socialProtection"
            label={formatMessage(intl, 'socialProtection', 'project.district')}
            required
            withNull={false}
            readOnly={readOnly}
            value={project?.district}
            onChange={this.onDistrictChange}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <MicroCatchmentPicker
            required
            withNull={false}
            readOnly={readOnly}
            value={project?.microCatchment}
            district={project?.district}
            onChange={(v) => this.onMicroCatchmentChange(v)}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <ProjectSectorPicker
            required
            withNull={false}
            readOnly={readOnly}
            value={project?.sector || project?.activity}
            onChange={(v) => this.updateAttribute('sector', v)}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <TextInput
            module="socialProtection"
            label="project.knownPlace"
            required
            readOnly={readOnly}
            value={project?.knownPlace ?? ''}
            onChange={(v) => this.updateAttribute('knownPlace', v)}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <TextInput
            module="socialProtection"
            label="project.generatedName"
            value={projectName}
            readOnly
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <NumberInput
            module="socialProtection"
            label="project.targetHouseholds"
            required
            readOnly={readOnly}
            min={1}
            max={200}
            value={project?.targetHouseholds}
            onChange={(v) => this.updateAttribute('targetHouseholds', v)}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <ProjectAllowsMultiEnrollmentPicker
            label="project.allowsMultipleEnrollments"
            value={project?.allowsMultipleEnrollments ?? false}
            onChange={(v) => this.updateAttribute('allowsMultipleEnrollments', v)}
            readOnly={readOnly}
            required={false}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <ProjectStatusPicker
            required
            readOnly
            value={project?.status || 'PREPARATION'}
            withNull={false}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <TextInput
            module="socialProtection"
            label="project.benefitPlan"
            value={project?.benefitPlan?.name ?? ''}
            readOnly
          />
        </Grid>

        {!!project?.workingDays && (
          <Grid item xs={4} className={classes.item}>
          <NumberInput
            module="socialProtection"
            label="project.workingDays"
            readOnly
            min={1}
            value={project?.workingDays}
          />
          </Grid>
        )}
      </Grid>
    );
  }
}

export default withModulesManager(injectIntl(withTheme(withStyles(styles)(
  connect()(ProjectHeadPanel),
))));
