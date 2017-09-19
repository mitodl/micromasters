import {
  SET_DOCUMENT_SENT_DATE,
  REQUEST_UPDATE_DOCUMENT_SENT_DATE,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE,
  setDocumentSentDate,
  requestUpdateDocumentSentDate,
  receiveUpdateDocumentSentDateSuccess,
  receiveUpdateDocumentSentDateFailure
} from "../actions/documents"
import { assertCreatedActionHelper } from "./test_util"

describe("generated document action helpers", () => {
  it("should create all action creators", () => {
    [
      [setDocumentSentDate, SET_DOCUMENT_SENT_DATE],
      [requestUpdateDocumentSentDate, REQUEST_UPDATE_DOCUMENT_SENT_DATE],
      [
        receiveUpdateDocumentSentDateSuccess,
        RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS
      ],
      [
        receiveUpdateDocumentSentDateFailure,
        RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE
      ]
    ].forEach(assertCreatedActionHelper)
  })
})
