/* global SETTINGS */
import React from 'react';
import { connect } from 'react-redux';

import { getPreferredName } from '../util/util';
import Jumbotron from '../components/Jumbotron';
import { makeProfileProgressDisplay } from '../util/util';
import ProfileFormContainer from './ProfileFormContainer';

class ProfilePage extends ProfileFormContainer {
  activeTab () {
    return this.props.route.childRoutes.findIndex( (route) => (
      route.path === this.props.location.pathname.split("/")[2]
    ));
  }

  render() {
    const { profiles } = this.props;
    let profile = {
      profile: {}
    };
    if (profiles[SETTINGS.username] !== undefined) {
      profile = profiles[SETTINGS.username];
    }

    let text = `Welcome ${getPreferredName(profile.profile)}, let's
    complete your enrollment to MIT MicroMasters.`;

    let childrenWithProps = this.childrenWithProps(profile);
    return <div className="card">
      <Jumbotron profile={profile.profile} text={text}>
        <div className="card-copy">
          <div style={{textAlign: "center"}}>
            {makeProfileProgressDisplay(this.activeTab())}
          </div>
          <section>
            { childrenWithProps }
          </section>
        </div>
      </Jumbotron>
    </div>;
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(ProfilePage);
