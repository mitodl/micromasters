// @flow
export type CheckoutResponse = {
  url: string,
  payload: CheckoutPayload,
  method?: ?string
};

export type CheckoutPayload = {
  "access_key": string,
  "amount": string,
  "consumer_id": string,
  "currency": string,
  "locale": string,
  "override_custom_cancel_page": string,
  "override_custom_receipt_page": string,
  "profile_id": string,
  "reference_number": string,
  "signature": string,
  "signed_date_time": string,
  "signed_field_names": string,
  "transaction_type": string,
  "transaction_uuid": string,
  "unsigned_field_names": string,
};
