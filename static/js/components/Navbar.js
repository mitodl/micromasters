// @flow
import React from 'react';
import { HeaderTabs, Header, HeaderRow, Tab } from 'react-mdl';

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

  makeTabs: Function = (): React$Element<*>[] => {
    const { empty } = this.props;
    return empty ? [] : this.tabs.map((tab, i) => <Tab key={i}>{tab.label}</Tab>);
  };

  tabs: Object[] = [
    { label: 'Dashboard', path: '/dashboard', regex: /dashboard/ },
    { label: 'Learners', path: '/learners', regex: /learners/ },
  ];

  activeTab: Function = (path: string): number => (
    this.tabs.findIndex(tab => tab.regex.test(path))
  );

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
    const onChange = tabId => {
      let path = this.tabs[tabId].path;
      changeUrl(path);
    };
    return (
      <div className="micromasters-navbar">
        <Header className="micromasters-nav">
          <HeaderRow className="micromasters-header">
            <div className="micromasters-title">
              <img src="/static/images/mit-logo-transparent.svg" alt="MIT" />
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
          <HeaderTabs
            activeTab={this.activeTab(pathname)}
            onChange={onChange}>
            { this.makeTabs() }
          </HeaderTabs>
        </Header>
      </div>
    );
  }
}
