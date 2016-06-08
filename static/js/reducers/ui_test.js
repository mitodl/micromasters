/* global SETTINGS: false */
import {
  CLEAR_UI,
  UPDATE_DIALOG_TEXT,
  UPDATE_DIALOG_TITLE,
  SET_DIALOG_VISIBILITY,
  SET_WORK_HISTORY_EDIT,
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,
  TOGGLE_DASHBOARD_EXPANDER,
  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_EDUCATION_DEGREE_INCLUSIONS,
  SET_USER_PAGE_DIALOG_VISIBILITY,
  SET_SHOW_EDUCATION_DELETE_DIALOG,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_DELETION_INDEX,

  clearUI,
  updateDialogText,
  updateDialogTitle,
  setDialogVisibility,
  setWorkHistoryEdit,
  setWorkDialogVisibility,
  setWorkDialogIndex,
  toggleDashboardExpander,
  setEducationDialogVisibility,
  setEducationDialogIndex,
  setEducationDegreeLevel,
  setEducationDegreeInclusions,
  setUserPageDialogVisibility,
  setShowEducationDeleteDialog,
  setShowWorkDeleteDialog,
  setDeletionIndex,
} from '../actions/ui';
import { receiveGetUserProfileSuccess } from '../actions';
import { INITIAL_UI_STATE } from '../reducers/ui';
import {
  HIGH_SCHOOL,
  ASSOCIATE,
  BACHELORS,
  MASTERS,
  DOCTORATE,
  USER_PROFILE_RESPONSE,
} from '../constants';
import rootReducer from '../reducers';
import * as util from '../util/util';

import configureTestStore from 'redux-asserts';
import assert from 'assert';
import sinon from 'sinon';

describe('ui reducers', () => {
  let sandbox, store, dispatchThen;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.ui);
  });

  afterEach(() => {
    sandbox.restore();

    store = null;
    dispatchThen = null;
  });

  it('should clear the ui', done => {
    dispatchThen(clearUI(), [CLEAR_UI]).then(state => {
      assert.deepEqual(state, INITIAL_UI_STATE);
      done();
    });
  });

  describe('dialog reducers', () => {
    it('should set a dialog title', done => {
      dispatchThen(updateDialogTitle('A title'), [UPDATE_DIALOG_TITLE]).then(state => {
        assert.equal(state.dialog.title, 'A title');
        done();
      });
    });

    it('should set dialog text', done => {
      dispatchThen(updateDialogText('Some Text'), [UPDATE_DIALOG_TEXT]).then(state => {
        assert.equal(state.dialog.text, 'Some Text');
        done();
      });
    });

    it('should set dialog visibility', done => {
      dispatchThen(setDialogVisibility(true), [SET_DIALOG_VISIBILITY]).then(state => {
        assert.equal(state.dialog.visible, true);
        done();
      });
    });
  });

  describe('work_history reducers', () => {
    it('should set the work history dialog visibility', done => {
      dispatchThen(setWorkDialogVisibility(true), [SET_WORK_DIALOG_VISIBILITY]).then(state => {
        assert.equal(state.workDialogVisibility, true);

        dispatchThen(setWorkDialogVisibility(false), [SET_WORK_DIALOG_VISIBILITY]).then(state => {
          assert.equal(state.workDialogVisibility, false);
          done();
        });
      });
    });

    it('should set work history edit', done => {
      dispatchThen(setWorkHistoryEdit(true), [SET_WORK_HISTORY_EDIT]).then(state => {
        assert.equal(state.workHistoryEdit, true);

        dispatchThen(setWorkHistoryEdit(false), [SET_WORK_HISTORY_EDIT]).then(state => {
          assert.equal(state.workHistoryEdit, false);
          done();
        });
      });
    });

    it('should set a work history dialog index', done => {
      dispatchThen(setWorkDialogIndex(2), [SET_WORK_DIALOG_INDEX]).then(state => {
        assert.equal(state.workDialogIndex, 2);

        dispatchThen(setWorkDialogIndex(5), [SET_WORK_DIALOG_INDEX]).then(state => {
          assert.equal(state.workDialogIndex, 5);
          done();
        });
      });
    });
  });

  describe('dashboard expander', () => {
    it('has an empty default state', done => {
      dispatchThen({type: "undefined"}, []).then(state => {
        assert.deepEqual(state.dashboardExpander, {});
        done();
      });
    });

    it('toggles a course expander', done => {
      dispatchThen(toggleDashboardExpander(3, true), [TOGGLE_DASHBOARD_EXPANDER]).then(state => {
        assert.deepEqual(state.dashboardExpander, {
          3: true
        });
        done();
      });
    });
  });

  describe('education reducers', () => {
    it('has a default state', done => {
      dispatchThen({type: "undefined"}, []).then(state => {
        assert.deepEqual(state.educationDialogVisibility, false);
        assert.deepEqual(state.educationDialogIndex, null);
        assert.deepEqual(state.educationDegreeLevel, '');
        assert.deepEqual(
          state.educationDegreeInclusions, {
            [HIGH_SCHOOL]: false,
            [ASSOCIATE]: false,
            [BACHELORS]: false,
            [MASTERS]: false,
            [DOCTORATE]: false,
          });
        done();
      });
    });

    it('has gets inclusions from the profile API, only if the username matches', () => {
      const inclusions = {
        [HIGH_SCHOOL]: false,
        [ASSOCIATE]: false,
        [BACHELORS]: false,
        [MASTERS]: true,
        [DOCTORATE]: false,
      };

      let calculateDegreeInclusionsStub = sandbox.stub(util, 'calculateDegreeInclusions');
      calculateDegreeInclusionsStub.returns(inclusions);

      store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, USER_PROFILE_RESPONSE));
      assert(calculateDegreeInclusionsStub.calledWith(USER_PROFILE_RESPONSE));
      assert.deepEqual(
        store.getState().ui.educationDegreeInclusions,
        inclusions
      );
    });

    it("does not use inclusions from the API if username isn't SETTINGS.username", () => {
      let calculateDegreeInclusionsStub = sandbox.stub(util, 'calculateDegreeInclusions');
      store.dispatch(receiveGetUserProfileSuccess("other username", USER_PROFILE_RESPONSE));
      assert(!calculateDegreeInclusionsStub.called);
    });

    it('should let you set education dialog visibility', done => {
      dispatchThen(setEducationDialogVisibility(true), [SET_EDUCATION_DIALOG_VISIBILITY]).then(state => {
        assert.deepEqual(state.educationDialogVisibility, true);
        done();
      });
    });

    it('should let you set education degree level', done => {
      dispatchThen(setEducationDegreeLevel('foobar'), [SET_EDUCATION_DEGREE_LEVEL]).then(state => {
        assert.deepEqual(state.educationDegreeLevel, 'foobar');
        done();
      });
    });

    it('should let you set education dialog index', done => {
      dispatchThen(setEducationDialogIndex(3), [SET_EDUCATION_DIALOG_INDEX]).then(state => {
        assert.deepEqual(state.educationDialogIndex, 3);
        done();
      });
    });

    it('should let you set degree inclusions', done => {
      let newInclusions = {
        [HIGH_SCHOOL]: true,
        [ASSOCIATE]: false,
        [BACHELORS]: true,
        [MASTERS]: true,
        [DOCTORATE]: true,
      };
      dispatchThen(setEducationDegreeInclusions(newInclusions), [SET_EDUCATION_DEGREE_INCLUSIONS]).then(state => {
        assert.deepEqual(state.educationDegreeInclusions, newInclusions);
        done();
      });
    });
  });

  describe('user page', () => {
    [true, false].forEach(bool => {
      it(`should let you set the user page dialog visibility to ${bool}`, done => {
        dispatchThen(setUserPageDialogVisibility(bool), [SET_USER_PAGE_DIALOG_VISIBILITY]).then(state => {
          assert.deepEqual(state.userPageDialogVisibility, bool);
          done();
        });
      });
    });
  });

  describe('confirm delete dialog', () => {
    [true, false].forEach( bool => {
      it(`should let you set to show the education delete dialog to ${bool}`, done => {
        dispatchThen(setShowEducationDeleteDialog(bool), [SET_SHOW_EDUCATION_DELETE_DIALOG]).then(state => {
          assert.deepEqual(state.showEducationDeleteDialog, bool);
          done();
        });
      });
    });

    [true, false].forEach( bool => {
      it(`should let you set to show the work delete dialog to ${bool}`, done => {
        dispatchThen(setShowWorkDeleteDialog(bool), [SET_SHOW_WORK_DELETE_DIALOG]).then(state => {
          assert.deepEqual(state.showWorkDeleteDialog, bool);
          done();
        });
      });
    });

    it('should let you set a deletion index', done => {
      dispatchThen(setDeletionIndex(3), [SET_DELETION_INDEX]).then(state => {
        assert.deepEqual(state.deletionIndex, 3);
        done();
      });
    });
  });
});
