// @flow
import R from "ramda"

const hasStaffRole = R.propSatisfies(
  R.contains(R.__, ["staff", "instructor"]),
  "role"
)

export const hasAnyStaffRole = R.any(hasStaffRole)

const sameProgram = R.curry((program, role) =>
  R.equals(program.id, R.prop("program", role))
)

export const hasStaffForProgram = R.curry((program, roles) =>
  R.any(R.both(sameProgram(program), hasStaffRole), roles)
)

export const hasRolePerm = R.curry((perm, role) =>
  R.propSatisfies(R.contains(perm), "permissions", role)
)

export const hasPermForProgram = R.curry((perm, program, roles) =>
  R.any(R.both(sameProgram(program), hasRolePerm(perm)), roles)
)

export const canAdvanceSearchProgram = hasPermForProgram("can_advance_search")
export const canMessageLearnersProgram = hasPermForProgram(
  "can_message_learners"
)

export const hasEditAbility = hasRolePerm("can_edit_financial_aid")

export const firstFinancialAidProgram = R.compose(
  R.propOr(null, "program"),
  R.find(hasEditAbility)
)
