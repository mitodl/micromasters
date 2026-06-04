// @flow
export type Option = {
  value: any,
  label: string,
  disabled?: boolean,
}

export type APIErrorInfo = {
  error_code?: string,
  user_message?: string,
  detail?: string,
  errorStatusCode?: number,
}

export type ToastMessage = {
  message: string,
  title?: string,
  icon?: string,
}
