import App from './containers/App'

// these components are intentionally imported here (unused)
// in order to control webpack's module splitting
import DashboardPage from './containers/DashboardPage';
import SettingsPage from './containers/SettingsPage';
import ProfilePage from './containers/ProfilePage';
import PersonalTab from './components/PersonalTab';
import EducationTab from './components/EducationTab';
import EmploymentTab from './components/EmploymentTab';
import LearnerPage from './containers/LearnerPage';
import Learner from './components/Learner';
import OrderSummaryPage from './containers/OrderSummaryPage';

const errorLoading = error => {
  console.log("loading error caused by:", error)
  throw new Error(`Dynamic page loading failed: ${error}`);
};

const loadRoute = cb => (
  module => cb(null, module.default)
);

const username = SETTINGS.user ? SETTINGS.user.username : '';

export const routes = {
  path: "/",
  component: App,
  childRoutes: [
    {
      path: 'dashboard',
      getComponent(nextState, cb) {
        import('./containers/DashboardPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      }
    },
    {
      path: 'order_summary',
      getComponent(nextState, cb) {
        import('./containers/OrderSummaryPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      }
    },
    {
      path: 'profile',
      getComponent(nextState, cb) {
        import('./containers/ProfilePage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      },
      onEnter: ({ location: { pathname } }, replace) => {
        if ( pathname.match(/^\/profile\/?$/) ) {
          replace('/profile/personal');
        }
      },
      childRoutes: [
        {
          path: 'personal',
          getComponent(nextState, cb) {
            import('./components/PersonalTab')
              .then(loadRoute(cb))
              .catch(errorLoading);
          }
        },
        {
          path: 'education',
          getComponent(nextState, cb) {
            import('./components/EducationTab')
              .then(loadRoute(cb))
              .catch(errorLoading);
          }
        },
        {
          path: 'professional',
          getComponent(nextState, cb) {
            import('./components/EmploymentTab')
              .then(loadRoute(cb))
              .catch(errorLoading);
          }
        },
      ]
    },
    {
      path: 'settings',
      getComponent(nextState, cb) {
        import('./containers/SettingsPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      }
    },
    {
      path: 'learner',
      getComponent(nextState, cb) {
        import('./containers/LearnerPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      },
      indexRoute: {
        onEnter: (nextState, cb) => cb(`/learner/${username}`)
      },
      childRoutes: [
        {
          path: ':username',
          getComponent(nextState, cb) {
            import('./components/Learner')
              .then(loadRoute(cb))
              .catch(errorLoading);
          }
        }
      ]
    },
    {
      path: 'learners',
      getComponent(nextState, cb) {
        import('./containers/LearnerSearchPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      }
    },
    {
      path: 'automaticemails',
      getComponent(nextState, cb) {
        import('./containers/AutomaticEmailPage')
          .then(loadRoute(cb))
          .catch(errorLoading);
      }
    }
  ]
};
