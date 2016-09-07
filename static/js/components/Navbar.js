// @flow
import React from 'react';
import { Link } from 'react-router';
import { Header, HeaderRow } from 'react-mdl';

import UserMenu from '../containers/UserMenu';

import type { DashboardState } from '../flow/dashboardTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';
import ProgramSelector from './ProgramSelector';
import UserMenu from '../containers/UserMenu';

export default class Navbar extends React.Component {
  props: {
    empty:                       boolean,
    children?:                   React$Element<*>[],
    pathname:                    string,
    changeUrl:                   (i: number) => void,
    currentProgramEnrollment:    ProgramEnrollment,
    dashboard:                   DashboardState,
    enrollments:                 ProgramEnrollmentsState,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    setCurrentProgramEnrollment: (enrollment: ProgramEnrollment) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: number) => void,
  };

  userMenu: Function = (): void|React$Element<*> => {
    const { empty } = this.props;
    return empty === true ? undefined : <UserMenu />;
  };

  render () {
    const {
      changeUrl,
      currentProgramEnrollment,
      dashboard,
      enrollDialogVisibility,
      enrollSelectedProgram,
      enrollments,
      pathname,
      setCurrentProgramEnrollment,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
    } = this.props;

    return (
      <div className="micromasters-navbar">
        <Header className="micromasters-nav">
          <HeaderRow className="micromasters-header">
            <div className="micromasters-title">
              <Link to='/dashboard/'>
                <img src="/static/images/mit-logo-transparent.svg" alt="MIT" />
              </Link>
              <span className="mdl-layout-title">
                MicroMasters
              </span>
              <ProgramSelector
                currentProgramEnrollment={currentProgramEnrollment}
                dashboard={dashboard}
                enrollDialogVisibility={enrollDialogVisibility}
                enrollSelectedProgram={enrollSelectedProgram}
                enrollments={enrollments}
                setCurrentProgramEnrollment={setCurrentProgramEnrollment}
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
