// @flow
/* global SETTINGS: false */
import {
  SET_WORK_HISTORY_EDIT,

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
  setProfileStep,
  setUserMenuOpen,
  setSearchFilterVisibility,
  setEmailDialogVisibility,
  setEnrollDialogError,
  setEnrollDialogVisibility,
  setToastMessage,
  setEnrollSelectedProgram,
  setPhotoDialogVisibility,
  setCalculatorDialogVisibility,
  setConfirmSkipDialogVisibility,
  setDocsInstructionsVisibility,
  setNavDrawerOpen,
} from '../actions/ui';
import { INITIAL_UI_STATE } from '../reducers/ui';
import { PERSONAL_STEP } from '../constants';
import rootReducer from '../reducers';
import { createAssertReducerResultState } from '../util/test_utils';
import type { AssertReducerResultState } from '../flow/reduxTypes';
import type { UIState } from './ui';

import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

describe('ui reducers', () => {
  let sandbox, store, dispatchThen, assertReducerResultState: AssertReducerResultState<UIState>;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.ui);
    assertReducerResultState = createAssertReducerResultState(store, state => state.ui);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should clear the ui', () => {
    store.dispatch(clearUI());
    assert.deepEqual(store.getState().ui, INITIAL_UI_STATE);
  });

  describe('dialog reducers', () => {
    it('should set a dialog title', () => {
      assertReducerResultState(updateDialogTitle, ui => ui.dialog.title, undefined);
    });

    it('should set dialog text', () => {
      assertReducerResultState(updateDialogText, ui => ui.dialog.text, undefined);
    });

    it('should set dialog visibility', () => {
      assertReducerResultState(setDialogVisibility, ui => ui.dialog.visible, undefined);
    });
  });

  describe('work_history reducers', () => {
    it('should set the work history dialog visibility', () => {
      assertReducerResultState(setWorkDialogVisibility, ui => ui.workDialogVisibility, false);
    });

    it('should set work history edit', () => {
      assert.equal(store.getState().ui.workHistoryEdit, true);

      return dispatchThen(setWorkHistoryEdit(true), [SET_WORK_HISTORY_EDIT]).then(state => {
        assert.equal(state.workHistoryEdit, true);

        return dispatchThen(setWorkHistoryEdit(false), [SET_WORK_HISTORY_EDIT]).then(state => {
          assert.equal(state.workHistoryEdit, false);
        });
      });
    });

    it('should set a work history dialog index', () => {
      assertReducerResultState(setWorkDialogIndex, ui => ui.workDialogIndex, null);
    });
  });

  describe('education reducers', () => {
    it('should let you set education dialog visibility', () => {
      assertReducerResultState(setEducationDialogVisibility, ui => ui.educationDialogVisibility, false);
    });

    it('should let you set education degree level', () => {
      assertReducerResultState(setEducationDegreeLevel, ui => ui.educationDegreeLevel, '');
    });

    it('should let you set education dialog index', () => {
      assertReducerResultState(setEducationDialogIndex, ui => ui.educationDialogIndex, -1);
    });
  });

  describe('user page', () => {
    it(`should let you set the user page dialog visibility`, () => {
      assertReducerResultState(setUserPageDialogVisibility, ui => ui.userPageDialogVisibility, false);
    });
  });

  describe('confirm delete dialog', () => {
    it('should let you set to show the education delete dialog', () => {
      assertReducerResultState(setShowEducationDeleteDialog, ui => ui.showEducationDeleteDialog, false);
    });

    it(`should let you set to show the work delete dialog`, () => {
      assertReducerResultState(setShowWorkDeleteDialog, ui => ui.showWorkDeleteDialog, false);
    });

    it('should let you set a deletion index', () => {
      assertReducerResultState(setDeletionIndex, ui => ui.deletionIndex, null);
    });
  });

  describe("profile step", () => {
    it(`should let you set the profile step`, () => {
      assertReducerResultState(setProfileStep, ui => ui.profileStep, PERSONAL_STEP);
    });
  });

  describe("user menu", () => {
    it('should let you set the user menu open state', () => {
      assertReducerResultState(setUserMenuOpen, ui => ui.userMenuOpen, false);
    });
  });

  describe('search filter visibility', () => {
    it('should let you set the search filter visibility', () => {
      assertReducerResultState(setSearchFilterVisibility, ui => ui.searchFilterVisibility, {});
    });
  });

  describe('Email dialog visibility', () => {
    it(`should let you set email dialog visibility`, () => {
      assertReducerResultState(setEmailDialogVisibility, ui => ui.emailDialogVisibility, false);
    });
  });

  describe('Photo dialog visibility', () => {
    it(`should let you set photo dialog visibility`, () => {
      assertReducerResultState(setPhotoDialogVisibility, ui => ui.photoDialogVisibility, false);
    });
  });

  describe('Enrollment', () => {
    it('sets the enrollment message', () => {
      assertReducerResultState(setToastMessage, ui => ui.toastMessage, null);
    });

    it('sets the enrollment dialog error', () => {
      assertReducerResultState(setEnrollDialogError, ui => ui.enrollDialogError, null);
    });

    it('sets the enrollment dialog visibility', () => {
      assertReducerResultState(setEnrollDialogVisibility, ui => ui.enrollDialogVisibility, false);
    });

    it('sets the enrollment dialog currently selected program', () => {
      assertReducerResultState(setEnrollSelectedProgram, ui => ui.enrollSelectedProgram, null);
    });
  });

  describe('Calculator visibility', () => {
    it('should let you set calculator visibility', () => {
      assertReducerResultState(setCalculatorDialogVisibility, ui => ui.calculatorDialogVisibility, false);
    });
  });

  describe('Skip dialog visibility', () => {
    it('should let you set skip dialog visibility', () => {
      assertReducerResultState(setConfirmSkipDialogVisibility, ui => ui.skipDialogVisibility, false);
    });
  });

  describe('docs instructions visibility', () => {
    it('should let you set the document instruction visibility', () => {
      assertReducerResultState(setDocsInstructionsVisibility, ui => ui.docsInstructionsVisibility, false);
    });
  });

  describe('nav drawer', () => {
    it('should let you set the nav drawer visibility', () => {
      assertReducerResultState(setNavDrawerOpen, ui => ui.navDrawerOpen, false);
    });
  });
});
