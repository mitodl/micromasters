/* global SETTINGS: false */
import {
  CLEAR_UI,
  UPDATE_DIALOG_TEXT,
  UPDATE_DIALOG_TITLE,
  SET_DIALOG_VISIBILITY,
  SET_WORK_HISTORY_EDIT,
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,
  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_USER_PAGE_DIALOG_VISIBILITY,
  SET_SHOW_EDUCATION_DELETE_DIALOG,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_DELETION_INDEX,
  SET_SHOW_WORK_DELETE_ALL_DIALOG,
  SET_PROFILE_STEP,
  SET_USER_MENU_OPEN,
  SET_SEARCH_FILTER_VISIBILITY,
  SET_EMAIL_DIALOG_VISIBILITY,
  SET_ENROLL_DIALOG_ERROR,
  SET_ENROLL_DIALOG_VISIBILITY,
  SET_ENROLL_MESSAGE,
  SET_ENROLL_SELECTED_PROGRAM,

  clearUI,
  updateDialogText,
  updateDialogTitle,
  setDialogVisibility,
  setWorkHistoryEdit,
  setWorkDialogVisibility,
  setWorkDialogIndex,
  setEducationDialogVisibility,
  setEducationDialogIndex,
  setEducationDegreeLevel,
  setUserPageDialogVisibility,
  setShowEducationDeleteDialog,
  setShowWorkDeleteDialog,
  setDeletionIndex,
  setShowWorkDeleteAllDialog,
  setProfileStep,
  setUserMenuOpen,
  setSearchFilterVisibility,
  setEmailDialogVisibility,
  setEnrollDialogError,
  setEnrollDialogVisibility,
  setEnrollMessage,
  setEnrollSelectedProgram,
} from '../actions/ui';
import { INITIAL_UI_STATE } from '../reducers/ui';
import { PROFILE_STEP_LABELS } from '../constants';
import rootReducer from '../reducers';

import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
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

  it('should clear the ui', () => {
    return assert.eventually.deepEqual(
      dispatchThen(clearUI(), [CLEAR_UI]),
      INITIAL_UI_STATE
    );
  });

  describe('dialog reducers', () => {
    it('should set a dialog title', () => {
      return dispatchThen(updateDialogTitle('A title'), [UPDATE_DIALOG_TITLE]).then(state => {
        assert.equal(state.dialog.title, 'A title');
      });
    });

    it('should set dialog text', () => {
      return dispatchThen(updateDialogText('Some Text'), [UPDATE_DIALOG_TEXT]).then(state => {
        assert.equal(state.dialog.text, 'Some Text');
      });
    });

    it('should set dialog visibility', () => {
      return dispatchThen(setDialogVisibility(true), [SET_DIALOG_VISIBILITY]).then(state => {
        assert.equal(state.dialog.visible, true);
      });
    });
  });

  describe('work_history reducers', () => {
    it('should set the work history dialog visibility', () => {
      return dispatchThen(setWorkDialogVisibility(true), [SET_WORK_DIALOG_VISIBILITY]).then(state => {
        assert.equal(state.workDialogVisibility, true);

        return dispatchThen(setWorkDialogVisibility(false), [SET_WORK_DIALOG_VISIBILITY]).then(state => {
          assert.equal(state.workDialogVisibility, false);
        });
      });
    });

    it('should set work history edit', () => {
      return dispatchThen(setWorkHistoryEdit(true), [SET_WORK_HISTORY_EDIT]).then(state => {
        assert.equal(state.workHistoryEdit, true);

        return dispatchThen(setWorkHistoryEdit(false), [SET_WORK_HISTORY_EDIT]).then(state => {
          assert.equal(state.workHistoryEdit, false);
        });
      });
    });

    it('should set a work history dialog index', () => {
      return dispatchThen(setWorkDialogIndex(2), [SET_WORK_DIALOG_INDEX]).then(state => {
        assert.equal(state.workDialogIndex, 2);

        return dispatchThen(setWorkDialogIndex(5), [SET_WORK_DIALOG_INDEX]).then(state => {
          assert.equal(state.workDialogIndex, 5);
        });
      });
    });
  });

  describe('education reducers', () => {
    it('has a default state', () => {
      return dispatchThen({type: "undefined"}, []).then(state => {
        assert.deepEqual(state.educationDialogVisibility, false);
        assert.deepEqual(state.educationDialogIndex, -1);
        assert.deepEqual(state.educationDegreeLevel, '');
      });
    });

    it('should let you set education dialog visibility', () => {
      return dispatchThen(setEducationDialogVisibility(true), [SET_EDUCATION_DIALOG_VISIBILITY]).then(state => {
        assert.deepEqual(state.educationDialogVisibility, true);
      });
    });

    it('should let you set education degree level', () => {
      return dispatchThen(setEducationDegreeLevel('foobar'), [SET_EDUCATION_DEGREE_LEVEL]).then(state => {
        assert.deepEqual(state.educationDegreeLevel, 'foobar');
      });
    });

    it('should let you set education dialog index', () => {
      return dispatchThen(setEducationDialogIndex(3), [SET_EDUCATION_DIALOG_INDEX]).then(state => {
        assert.deepEqual(state.educationDialogIndex, 3);
      });
    });
  });

  describe('user page', () => {
    [true, false].forEach(bool => {
      it(`should let you set the user page dialog visibility to ${bool}`, () => {
        return dispatchThen(setUserPageDialogVisibility(bool), [SET_USER_PAGE_DIALOG_VISIBILITY]).then(state => {
          assert.deepEqual(state.userPageDialogVisibility, bool);
        });
      });
    });
  });

  describe('confirm delete dialog', () => {
    [true, false].forEach( bool => {
      it(`should let you set to show the education delete dialog to ${bool}`, () => {
        return dispatchThen(setShowEducationDeleteDialog(bool), [SET_SHOW_EDUCATION_DELETE_DIALOG]).then(state => {
          assert.deepEqual(state.showEducationDeleteDialog, bool);
        });
      });
    });

    [true, false].forEach( bool => {
      it(`should let you set to show the work delete dialog to ${bool}`, () => {
        return dispatchThen(setShowWorkDeleteDialog(bool), [SET_SHOW_WORK_DELETE_DIALOG]).then(state => {
          assert.deepEqual(state.showWorkDeleteDialog, bool);
        });
      });
    });

    it('should let you set a deletion index', () => {
      return dispatchThen(setDeletionIndex(3), [SET_DELETION_INDEX]).then(state => {
        assert.deepEqual(state.deletionIndex, 3);
      });
    });
  });

  describe('confirm delete all dialog', () => {
    let actionCreator = setShowWorkDeleteAllDialog,
      action = SET_SHOW_WORK_DELETE_ALL_DIALOG,
      accessor = s => s.showWorkDeleteAllDialog;

    [true, false].forEach( bool => {
      it(`should let you ${action} to ${bool}`, () => {
        return dispatchThen(actionCreator(bool), [action]).then(state => {
          assert.deepEqual(accessor(state), bool);
        });
      });
    });
  });

  describe("profile step", () => {
    PROFILE_STEP_LABELS.forEach((label, step) => {
      it(`should let you set the profile step to ${label}`, () => {
        return dispatchThen(setProfileStep(step), [SET_PROFILE_STEP]).then(state => {
          assert.deepEqual(state.profileStep, step);
        });
      });
    });
  });

  describe("user menu", () => {
    [true, false].forEach(bool => {
      it(`should let you set the user menu open state to ${bool}`, () => {
        return dispatchThen(setUserMenuOpen(bool), [SET_USER_MENU_OPEN]).then(state => {
          assert.deepEqual(state.userMenuOpen, bool);
        });
      });
    });
  });

  describe('search filter visibility', () => {
    let filterName = 'my_filter';

    [true, false].forEach(bool => {
      let visibility = {[filterName]: bool};
      it(`should let you set a new filter to ${bool}`, () => {
        return dispatchThen(setSearchFilterVisibility(visibility), [
          SET_SEARCH_FILTER_VISIBILITY
        ]).then(state => {
          assert.deepEqual(state.searchFilterVisibility, visibility);
        });
      });

      it(`should let you change an existing filter from ${bool} to ${!bool}`, () => {
        store.dispatch(setSearchFilterVisibility(visibility));
        assert.deepEqual(
          store.getState().ui.searchFilterVisibility,
          visibility
        );

        let newVisibility = {[filterName]: !bool};
        return dispatchThen(setSearchFilterVisibility(newVisibility), [
          SET_SEARCH_FILTER_VISIBILITY
        ]).then(state => {
          assert.deepEqual(state.searchFilterVisibility, newVisibility);
        });
      });
    });
  });

  describe('Email dialog visibility', () => {
    [true, false].forEach(bool => {
      it(`should let you set email dialog visibility to ${bool}`, () => {
        return dispatchThen(setEmailDialogVisibility(bool), [
          SET_EMAIL_DIALOG_VISIBILITY
        ]).then(state => {
          assert.equal(state.emailDialogVisibility, bool);
        });
      });
    });
  });

  describe('Enrollment', () => {
    describe('enrollment dialog error', () => {
      it('should have a null default value', () => {
        assert.equal(store.getState().ui.enrollDialogError, null);
      });

      it('should let you set the dialog error', () => {
        return dispatchThen(setEnrollDialogError("value"), [
          SET_ENROLL_DIALOG_ERROR
        ]).then(state => {
          assert.equal(state.enrollDialogError, "value");
        });
      });
    });

    describe('enrollment success/failure message', () => {
      it('should have a null default value', () => {
        assert.equal(store.getState().ui.enrollMessage, null);
      });

      it('should let you toggle the program selector visibility', () => {
        return dispatchThen(setEnrollMessage("value"), [
          SET_ENROLL_DIALOG_VISIBILITY
        ]).then(state => {
          assert.equal(state.enrollMessage, "value");
        });
      });
    });

    describe('enrollment dialog visibility', () => {
      it('should have a false default value', () => {
        assert.equal(store.getState().ui.enrollDialogVisibility, false);
      });

      it('should let you toggle the program selector visibility', () => {
        return dispatchThen(setEnrollDialogVisibility("value"), [
          SET_ENROLL_DIALOG_VISIBILITY
        ]).then(state => {
          assert.equal(state.enrollDialogVisibility, "value");
        });
      });
    });

    describe('enrollment dialog currently selected program', () => {
      it('should have no default value', () => {
        assert.equal(store.getState().ui.enrollSelectedProgram, undefined);
      });

      it('should let you toggle the program selector visibility', () => {
        return dispatchThen(setEnrollSelectedProgram("value"), [
          SET_ENROLL_SELECTED_PROGRAM
        ]).then(state => {
          assert.equal(state.enrollSelectedProgram, "value");
        });
      });
    });
  });
});
