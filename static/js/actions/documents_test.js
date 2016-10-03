import {
  SET_DOCUMENT_SENT_DATE,

  setDocumentSentDate,
} from '../actions/documents';
import { assertCreatedActionHelper } from './util';

describe('generated document action helpers', () => {
  it('should create all action creators', () => {
    [
      [setDocumentSentDate, SET_DOCUMENT_SENT_DATE],
    ].forEach(assertCreatedActionHelper);
  });
});
