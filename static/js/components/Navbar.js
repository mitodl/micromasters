// @flow
/* global SETTINGS: false */
import React from 'react';
import { Link } from 'react-router';
import { Header, HeaderRow } from 'react-mdl';

import type { DashboardState } from '../flow/dashboardTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';
import ProgramSelector from './ProgramSelector';
import UserMenu from '../containers/UserMenu';

export default class Navbar extends React.Component {
  props: {
    addProgramEnrollment:        (programId: number) => void,
    empty:                       boolean,
    children?:                   React$Element<*>[],
    currentProgramEnrollment:    ProgramEnrollment,
    dashboard:                   DashboardState,
    enrollments:                 ProgramEnrollmentsState,
    enrollDialogError:           ?string,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    setCurrentProgramEnrollment: (enrollment: ProgramEnrollment) => void,
    setEnrollDialogError:        (error: ?string) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: ?number) => void,
  };

  userMenu: Function = (): void|React$Element<*> => {
    const { empty } = this.props;
    return empty === true ? undefined : <UserMenu />;
  };

  render () {
    const {
      addProgramEnrollment,
      currentProgramEnrollment,
      dashboard,
      enrollDialogError,
      enrollDialogVisibility,
      enrollSelectedProgram,
      enrollments,
      setCurrentProgramEnrollment,
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
    } = this.props;

    let link = '/dashboard';
    if (SETTINGS.roles.find(role => role.role === 'staff' || role.role === 'instructor')) {
      link = '/learners';
    }

    return (
      <div className="micromasters-navbar">
        <Header className="micromasters-nav">
          <HeaderRow className="micromasters-header">
            <div className="micromasters-title">
              <Link to={link}>
                <img src="/static/images/mit-logo-transparent.svg" alt="MIT" />
              </Link>
              <span className="mdl-layout-title">
                <Link to={link}>
                  MicroMasters
                </Link>
              </span>
              <ProgramSelector
                addProgramEnrollment={addProgramEnrollment}
                currentProgramEnrollment={currentProgramEnrollment}
                dashboard={dashboard}
                enrollDialogError={enrollDialogError}
                enrollDialogVisibility={enrollDialogVisibility}
                enrollSelectedProgram={enrollSelectedProgram}
                enrollments={enrollments}
                setCurrentProgramEnrollment={setCurrentProgramEnrollment}
                setEnrollDialogError={setEnrollDialogError}
                setEnrollDialogVisibility={setEnrollDialogVisibility}
                setEnrollSelectedProgram={setEnrollSelectedProgram}
              />
            </div>
            { this.userMenu() }
          </HeaderRow>
        </Header>
      </div>
    );
  }
}
