// @flow
import { assert } from "chai"

import {
  hasAnyStaffRole,
  hasStaffForProgram,
  hasEditAbility,
  canAdvanceSearchProgram,
  canMessageLearnersProgram,
  hasRolePerm,
  hasPermForProgram,
  firstFinancialAidProgram
} from "./roles"

describe("roles library", () => {
  let roles

  beforeEach(() => {
    roles = [
      {
        role:        "staff",
        program:     1,
        permissions: []
      },
      {
        role:        "student",
        program:     2,
        permissions: []
      }
    ]
  })

  describe("hasAnyStaffRole", () => {
    it("should return true if the user has a staff role on any program", () => {
      assert.isTrue(hasAnyStaffRole(roles))
    })

    it("should return false if the user does not have a staff role anywhere", () => {
      roles[0].role = "student"
      assert.isFalse(hasAnyStaffRole(roles))
    })
  })

  describe("hasStaffForProgram", () => {
    it("should return true if the user is staff on the specified program", () => {
      assert.isTrue(hasStaffForProgram({ id: 1 }, roles))
    })

    it("should return false if the user is not staff on the specified program", () => {
      assert.isFalse(hasStaffForProgram({ id: 2 }, roles))
    })
  })

  describe("hasRolePerm", () => {
    it("should return false if the user has perm on the specified program", () => {
      const role = { permissions: [] }
      assert.isFalse(hasRolePerm("can_edit_financial_aid", role))
    })

    it("should return true if the user has perm on the specified program", () => {
      const role = { permissions: ["can_edit_financial_aid"] }
      assert.isTrue(hasRolePerm("can_edit_financial_aid", role))
    })
  })

  describe("hasPermForProgram", () => {
    it("should return false if the user has perm on the specified program", () => {
      assert.isFalse(
        hasPermForProgram("can_edit_financial_aid", { id: 1 }, roles)
      )
    })

    it("should return true if the user has perm on the specified program", () => {
      roles[0].permissions.push("can_edit_financial_aid")
      assert.isTrue(
        hasPermForProgram("can_edit_financial_aid", { id: 1 }, roles)
      )
    })
  })

  describe("hasEditAbility", () => {
    it("should return false if user does not have the permission", () => {
      roles.forEach(role => {
        assert.isFalse(hasEditAbility(role))
      })
    })

    it("should return true if user has permission on any program", () => {
      roles[0].permissions.push("can_edit_financial_aid")
      assert.isTrue(hasEditAbility(roles[0]))
    })

    it("should return false if the user only has other permissions", () => {
      roles[0].permissions.push("can_make_bad_jokes")
      assert.isFalse(hasEditAbility(roles[0]))
    })
  })

  describe("canAdvanceSearchProgram", () => {
    it("should return false if user does not have the permission", () => {
      assert.isFalse(canAdvanceSearchProgram({ id: 1 }, roles))
    })

    it("should return true if user has permission on any program", () => {
      roles[0].permissions.push("can_advance_search")
      assert.isTrue(canAdvanceSearchProgram({ id: 1 }, roles))
    })

    it("should return false if the user only has other permissions", () => {
      roles[0].permissions.push("can_make_bad_jokes")
      assert.isFalse(canAdvanceSearchProgram({ id: 1 }, roles))
    })
  })

  describe("canMessageLearnersProgram", () => {
    it("should return false if user does not have the permission", () => {
      assert.isFalse(canMessageLearnersProgram({ id: 1 }, roles))
    })

    it("should return true if user has permission on any program", () => {
      roles[0].permissions.push("can_message_learners")
      assert.isTrue(canMessageLearnersProgram({ id: 1 }, roles))
    })

    it("should return false if the user only has other permissions", () => {
      roles[0].permissions.push("can_make_bad_jokes")
      assert.isFalse(canMessageLearnersProgram({ id: 1 }, roles))
    })
  })

  describe("firstFinancialAidProgram", () => {
    it("should return null if the user doesnt have the right permission", () => {
      assert.isNull(firstFinancialAidProgram(roles))
    })

    it("should return the program ID if the user does have the permission", () => {
      roles[1].permissions.push("can_edit_financial_aid")
      assert.equal(2, firstFinancialAidProgram(roles))
      roles[0].permissions.push("can_edit_financial_aid")
      assert.equal(1, firstFinancialAidProgram(roles))
    })
  })
})
