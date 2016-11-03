import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';
import _ from 'lodash';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import type { AvailablePrograms } from '../flow/enrollmentTypes';

export default class NewEnrollmentDialog extends React.Component {
  props: {
    addProgramEnrollment:        (programId: number) => void,
    programs:                    AvailablePrograms,
    enrollDialogError:           ?string,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    setEnrollDialogError:        (error: ?string) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: ?number) => void,
  };

  closeDialog = () => {
    const { setEnrollDialogVisibility } = this.props;
    setEnrollDialogVisibility(false);
  };

  addEnrollment = () => {
    const {
      addProgramEnrollment,
      enrollSelectedProgram,
      setEnrollDialogError,
      setEnrollDialogVisibility,
    } = this.props;

    if (_.isNil(enrollSelectedProgram)) {
      setEnrollDialogError("No program selected");
    } else {
      addProgramEnrollment(enrollSelectedProgram);
      setEnrollDialogVisibility(false);
    }
  };

  createDialogActions = () => {
    return [
      <Button
        className="secondary-button cancel-button"
        key="cancel"
        onClick={this.closeDialog}
      >
        Cancel
      </Button>,
      <Button
        className="primary-button enroll-button"
        key="enroll"
        onClick={this.addEnrollment}
      >
        Enroll
      </Button>,
    ];
  };

  handleSelectedProgramChange = (event, index, value) => {
    const { setEnrollSelectedProgram } = this.props;
    setEnrollSelectedProgram(value);
  };

  render() {
    const {
      enrollDialogError,
      enrollDialogVisibility,
      enrollSelectedProgram,
      programs,
    } = this.props;

    let unenrolledPrograms = _.sortBy(programs.filter(program => !program.enrolled), 'title');
    let options = unenrolledPrograms.map(program =>
      <MenuItem value={program.id} primaryText={program.title} key={program.id} />
    );

    // onRequestClose is not used below because an extra click or touch event causes material-ui
    // to close the dialog right after opening it. See https://github.com/JedWatson/react-select/issues/532
    return <Dialog
      title="Enroll in a new MicroMasters Program"
      titleClassName="dialog-title"
      contentClassName="dialog enroll-dialog"
      className="enroll-dialog-wrapper"
      open={enrollDialogVisibility}
      actions={this.createDialogActions()}
    >
      <SelectField
        value={enrollSelectedProgram}
        onChange={this.handleSelectedProgramChange}
        floatingLabelText="Select Program"
        errorText={enrollDialogError}
        fullWidth={true}
        style={{
          width: "500px"
        }}
        menuStyle={{
          width: "500px",
          overflow: "hidden"
        }}
      >
        {options}
      </SelectField>
    </Dialog>;
  }
}
