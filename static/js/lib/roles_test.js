// @flow
import { assert } from "chai"

import {
  hasAnyStaffRole,
  hasStaffForProgram,
  canAdvanceSearchProgram,
  canMessageLearnersProgram,
  hasRolePerm,
  hasPermForProgram
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
      assert.isFalse(hasRolePerm("some_permission", role))
    })

    it("should return true if the user has perm on the specified program", () => {
      const role = { permissions: ["some_permission"] }
      assert.isTrue(hasRolePerm("some_permission", role))
    })
  })

  describe("hasPermForProgram", () => {
    it("should return false if the user has perm on the specified program", () => {
      assert.isFalse(hasPermForProgram("some_permission", { id: 1 }, roles))
    })

    it("should return true if the user has perm on the specified program", () => {
      roles[0].permissions.push("some_permission")
      assert.isTrue(hasPermForProgram("some_permission", { id: 1 }, roles))
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
})
