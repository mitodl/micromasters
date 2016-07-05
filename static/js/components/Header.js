// @flow
import React from 'react';
import UserMenu from '../containers/UserMenu';
import { Navbar } from 'react-bootstrap';

class Header extends React.Component {
  static propTypes = {
    empty: React.PropTypes.bool
  };

  render () {
    const { empty } = this.props;
    let content;
    if (!empty) {
      content = <div className="nav-utility pull-right">
          <UserMenu />
        </div>;
    }

    return (
      <Navbar bsStyle="default" fluid={true}>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="/">
              <img src="/static/images/logo-micromasters.png" width="215" height="40" alt="MIT MicroMasters" />
            </a>
          </Navbar.Brand>
          {content}
        </Navbar.Header>
      </Navbar>
    );
  }
}

export default Header;
