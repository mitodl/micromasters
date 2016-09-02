// @flow
import type { Program } from './programTypes';
// likely to change in very near future
export type Dashboard = Array<Program>;
export type DashboardState = {
  programs:     Dashboard,
  fetchStatus?: string,
};
