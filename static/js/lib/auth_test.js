// @flow
import sinon from "sinon"
import { assert } from "chai"
import fetchMock from "fetch-mock"

import { refreshAuthToken, fetchJSONWithAuthToken } from "./auth"

describe("auth library", () => {
  const discussionTokenUrl = "/api/v0/discussions_token/"
  describe("refreshAuthToken", () => {
    it("should call fetch with some options", async () => {
      fetchMock.mock(discussionTokenUrl, 200)
      await refreshAuthToken()
      assert.isTrue(fetchMock.called())
      assert.deepEqual(fetchMock.lastOptions(), { credentials: "include" })
      assert.equal(fetchMock.lastUrl(), "/api/v0/discussions_token/")
    })
  })

  describe("fetchJSONWithAuthToken", () => {
    const endpointUrl = "/api/v0/my_favorite_endpoint/"

    beforeEach(() => {
      fetchMock.mock(endpointUrl, { lots: "of cool stuff!" })
    })

    it("should call fetch with credentials", async () => {
      await fetchJSONWithAuthToken(endpointUrl)
      assert.deepEqual(fetchMock.lastUrl(), endpointUrl)
      assert.deepEqual(fetchMock.lastOptions(), { credentials: "include" })
    })

    it("should return the JSON body of the response", async () => {
      const json = await fetchJSONWithAuthToken("/api/v0/my_favorite_endpoint/")
      assert.deepEqual(json, { lots: "of cool stuff!" })
    })

    it("should hit the refresh token endpoint and retry the initial request if not authenticated", async () => {
      fetchMock.restore()
      const fetchMockStub = sinon.stub()
      fetchMockStub.onFirstCall().returns(401)
      fetchMockStub.onSecondCall().returns({ some: "data", so: "great" })
      fetchMock.mock(endpointUrl, fetchMockStub)
      fetchMock.mock(discussionTokenUrl, 200)

      const resp = await fetchJSONWithAuthToken(endpointUrl)
      assert.deepEqual(resp, { some: "data", so: "great" })

      assert.deepEqual(fetchMock.calls().matched, [
        [endpointUrl, { credentials: "include" }],
        [discussionTokenUrl, { credentials: "include" }],
        [endpointUrl, { credentials: "include" }]
      ])
    })

    it("should reject if the response is not a good one", () => {
      [199, 300, 301, 499, 500].forEach((status) => {
        fetchMock.restore()
        fetchMock.mock(endpointUrl, status)
        assert.isRejected(fetchJSONWithAuthToken(endpointUrl))
      })
    })
  })
})
