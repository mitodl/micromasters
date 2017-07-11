// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from '../components/Loader';
import R from 'ramda';
import DocumentTitle from 'react-document-title';

import { FETCH_PROCESSING, FETCH_SUCCESS, FETCH_FAILURE } from '../actions';
import { clearProfile } from '../actions/profile';
import {
  profileFormContainer,
  mapStateToProfileProps,
  childrenWithProps,
} from './ProfileFormContainer';
import ErrorMessage from '../components/ErrorMessage';
import { fetchDashboard } from '../actions/dashboard';
import {
  clearCoupons,
  fetchCoupons,
} from '../actions/coupons';
import { actions } from '../lib/redux_rest';
import { hasAnyStaffRole } from '../lib/roles';
import { getDashboard, getCoursePrices } from '../reducers/util';
import type { CouponsState } from '../reducers/coupons';
import { S } from '../lib/sanctuary';
import { LEARNER_EMAIL_TYPE } from '../components/email/constants';
import { LEARNER_EMAIL_CONFIG } from '../components/email/lib';
import { withEmailDialog } from '../components/email/hoc';
import type { ProfileContainerProps } from './ProfileFormContainer';
import type { CoursePrices, DashboardsState } from '../flow/dashboardTypes';
import type { AllEmailsState } from '../flow/emailTypes';
import { showDialog, hideDialog } from '../actions/ui';
import { GRADE_DETAIL_DIALOG } from '../constants';
import type { RestState } from '../flow/restTypes';

const notFetchingOrFetched = R.compose(
  R.not, R.contains(R.__, [FETCH_PROCESSING, FETCH_SUCCESS, FETCH_FAILURE])
);

type LearnerPageProps = ProfileContainerProps & {
  prices: RestState<CoursePrices>,
  coupons:  CouponsState,
  dashboard: DashboardsState,
  email: AllEmailsState,
  openEmailComposer: (emailType: string, emailOpenParams: any) => void,
};

class LearnerPage extends React.Component<*, LearnerPageProps, *> {
  componentDidMount() {
    const { params: { username }, fetchProfile } = this.props;
    fetchProfile(username);
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.fetchCoupons();
  }

  componentDidUpdate() {
    const { params: { username }, fetchProfile } = this.props;
    fetchProfile(username);
    this.fetchDashboard();
  }

  componentWillUnmount() {
    const { dispatch, params: { username } } = this.props;
    if (!SETTINGS.user || SETTINGS.user.username !== username) {
      // don't erase the user's own profile from the state
      dispatch(clearProfile(username));
    }
    dispatch(actions.prices.clear(username));
    dispatch(clearCoupons());
  }

  getFocusedDashboard() {
    const { dashboard, params: { username }} = this.props;
    return S.filter(
      () => hasAnyStaffRole(SETTINGS.roles),
      getDashboard(username, dashboard)
    );
  }

  fetchDashboard() {
    const { dispatch, params: { username } } = this.props;

    R.compose(
      S.map(() => dispatch(fetchDashboard(username))),
      S.filter(R.propSatisfies(notFetchingOrFetched, 'fetchStatus'))
    )(this.getFocusedDashboard());
  }

  getFocusedPrices() {
    const { prices, params: { username }} = this.props;
    return S.filter(
      () => this.isPrivileged(username),
      getCoursePrices(username, prices)
    );
  }

  fetchCoursePrices() {
    const { dispatch, params: { username } } = this.props;
    R.compose(
      S.map(() => dispatch(actions.prices.get(username))),
      S.filter(R.propSatisfies(notFetchingOrFetched, 'getStatus'))
    )(this.getFocusedPrices());
  }

  fetchCoupons() {
    const { coupons, dispatch } = this.props;
    if (coupons.fetchGetStatus === undefined) {
      dispatch(fetchCoupons());
    }
  }

  isPrivileged = (username: string): boolean => (
    R.or(
      hasAnyStaffRole(SETTINGS.roles),
      R.isNil(SETTINGS.user) ? R.F() : R.equals(R.prop('username', SETTINGS.user), username)
    )
  )

  getDocumentTitle = () => {
    const {
      params: { username },
      profiles,
    } = this.props;
    let profilePath = [username, 'profile'];

    let name = R.pathOr('', profilePath.concat('preferred_name'), profiles);

    return `${name} | MITx MicroMasters Profile`
      .trim()
      .replace(/^\|\s/, '');
  }

  setShowGradeDetailDialog = (open: boolean, courseTitle: string) => {
    const { dispatch } = this.props;
    if (open) {
      dispatch(showDialog(`${GRADE_DETAIL_DIALOG}${courseTitle}`));
    } else {
      dispatch(hideDialog(`${GRADE_DETAIL_DIALOG}${courseTitle}`));
    }
  };

  render() {
    const {
      params: { username },
      profiles,
      children,
      profileProps,
      email,
      openEmailComposer,
      coupons,
    } = this.props;

    let profile = {};
    let toRender = null;
    let loaded = false;
    let couponsLoaded = false;
    let profileLoaded = false;

    if (profiles[username] !== undefined) {
      profile = profiles[username];
      profileLoaded = profiles[username].getStatus !== FETCH_PROCESSING;
      couponsLoaded = !R.isEmpty(coupons) && coupons.fetchGetStatus !== FETCH_PROCESSING;
      loaded = R.all(R.equals(true))([profileLoaded, couponsLoaded]);

      let props = {
        dashboard: S.maybe({}, R.identity, this.getFocusedDashboard()),
        email: email,
        prices: S.maybe({}, R.identity, this.getFocusedPrices()),
        coupons: coupons,
        openLearnerEmailComposer: R.partial(openEmailComposer(LEARNER_EMAIL_TYPE), [profile.profile]),
        setShowGradeDetailDialog: this.setShowGradeDetailDialog,
        ...profileProps(profile)
      };
      toRender = childrenWithProps(children, props);
    }
    const { errorInfo } = profile;
    return (
      <DocumentTitle title={this.getDocumentTitle()}>
        <Loader loaded={loaded}>
          {errorInfo && loaded ? <ErrorMessage errorInfo={errorInfo} /> : toRender }
        </Loader>
      </DocumentTitle>
    );
  }
}

const mapStateToProps = state => {
  return {
    dashboard: state.dashboard,
    prices: state.prices,
    coupons: state.coupons,
    email: state.email,
    ...mapStateToProfileProps(state),
  };
};

export default R.compose(
  connect(mapStateToProps),
  withEmailDialog({
    [LEARNER_EMAIL_TYPE]: LEARNER_EMAIL_CONFIG
  }),
  profileFormContainer
)(LearnerPage);
