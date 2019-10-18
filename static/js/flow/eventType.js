// @flow

export type Event = {
  preventDefault: Function,
  target:         EventTarget,
  initMouseEvent: Function,
};

export type EventTarget = {
  getAttribute: Function,
  value: Array<number>,
};
