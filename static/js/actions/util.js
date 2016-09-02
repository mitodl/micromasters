// @flow
export const actionCreatorGenerator = (type: string) => (
  (args: any) => args === undefined ? { type: type } : { type: type, payload: args }
);
