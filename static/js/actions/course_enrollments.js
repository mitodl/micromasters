// @flow
/* global SETTINGS: false */
import type { Dispatch } from "redux"

import { wait } from "../util/util"
import type { Dispatcher } from "../flow/reduxTypes"
import { showEnrollPayLaterSuccess } from "./ui"

export const showEnrollPayLaterSuccessMessage = (
  courseId: string
): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(showEnrollPayLaterSuccess(courseId))
    return wait(9000).then(() => {
      dispatch(showEnrollPayLaterSuccess(null))
    })
  }
}
