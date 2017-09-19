/* eslint-disable no-undef, max-len, no-var, prefer-template, no-unused-vars */
global.jQuery = require("jquery")

require("bootstrap")

import { codeToCountryName } from "../lib/location"

/* Wrapper for all of the functions used by the financial aid review page */
window.financialAidReview = (function(window, document, $) {
  "use strict"

  var CSRF_TOKEN = window.CSRF_TOKEN
  var BASE_PATH = window.BASE_PATH

  /**
   * Converts country codes to country names when the DOM is safe for manipulation
   */
  $(document).ready(function() {
    $(".country-code").each(function() {
      $(this).text(codeToCountryName($(this).text()))
    })
  })

  /**
   * Marks documents as received for a financial aid application
   *
   * @param financialAidId {number} Financial aid application id
   * @param url {string} URL to submit request to
   * @param action {string} FinancialAidStatus to send in request
   */
  function submitDocsReceived(financialAidId, url, action) {
    var name = $("#full-name-" + financialAidId)
      .text()
      .trim()
    if (
      confirm(
        "Click OK to mark documents as received for " +
          name +
          "'s financial aid application."
      )
    ) {
      $.ajax({
        url:     url,
        type:    "PATCH",
        headers: {
          "X-CSRFToken": CSRF_TOKEN
        },
        data: {
          action: action
        },
        success: function() {
          displayMessage(
            "Successfully marked documents as received for " +
              name +
              "'s financial aid application.",
            "success"
          )
          $(
            "#application-row-" +
              financialAidId +
              ", #application-email-row-" +
              financialAidId
          ).remove()
        },
        error: function(result) {
          displayMessage(
            "Error: " +
              result.responseText +
              " on " +
              name +
              "'s financial aid application.",
            "danger"
          )
        }
      })
    }
  }

  /**
   * Submits a financial aid application approval
   *
   * @param financialAidId {number} Financial aid application id
   * @param url {string} URL to submit request to
   * @param action {string} FinancialAidStatus to send in request
   */
  function submitApproval(financialAidId, url, action) {
    var name = $("#full-name-" + financialAidId)
      .text()
      .trim()
    if (
      confirm("Click OK to approve " + name + "'s financial aid application.")
    ) {
      var justification = $("#justification-" + financialAidId).val()
      var tierProgramId = $("#tier-program-id-" + financialAidId).val()
      $.ajax({
        url:     url,
        type:    "PATCH",
        headers: {
          "X-CSRFToken": CSRF_TOKEN
        },
        data: {
          action:          action,
          justification:   justification,
          tier_program_id: tierProgramId
        },
        success: function() {
          displayMessage(
            "Successfully approved " + name + "'s financial aid application.",
            "success"
          )
          $(
            "#application-row-" +
              financialAidId +
              ", #application-email-row-" +
              financialAidId
          ).remove()
        },
        error: function(result) {
          displayMessage(
            "Error: " +
              result.responseText +
              " on " +
              name +
              "'s financial aid application.",
            "danger"
          )
        }
      })
    }
  }

  /**
   * Resets a financial aid application
   *
   * @param financialAidId {number} Financial aid application id
   * @param url {string} URL to submit request to
   * @param action {string} FinancialAidStatus to send in request
   **/
  function actionReset(financialAidId, url, action) {
    var name = $("#full-name-" + financialAidId)
      .text()
      .trim()
    if (
      confirm(
        "Click OK to reset " +
          name +
          "'s financial aid application. This action cannot be undone."
      )
    ) {
      $.ajax({
        url:     url,
        type:    "PATCH",
        headers: {
          "X-CSRFToken": CSRF_TOKEN
        },
        data: {
          action: action
        },
        success: function() {
          displayMessage(
            "Successfully reset " + name + "'s financial aid application.",
            "success"
          )
          $(
            "#application-row-" +
              financialAidId +
              ", #application-email-row-" +
              financialAidId
          ).remove()
        },
        error: function(result) {
          displayMessage(
            "Error: " +
              result.responseText +
              " on " +
              name +
              "'s financial aid application reset.",
            "danger"
          )
        }
      })
    }
  }

  /**
   * Submits a financial aid email request
   *
   * @param financialAidId {number} Financial aid application id
   * @param url {string} URL to submit request to
   */
  function sendEmail(financialAidId, url) {
    var name = $("#full-name-" + financialAidId)
      .text()
      .trim()
    if (confirm("Click OK to send email to " + name)) {
      var emailSubject = $(
        "#email-form-" + financialAidId + " [name='email_subject']"
      ).val()
      var emailBody = $(
        "#email-form-" + financialAidId + " [name='email_body']"
      ).val()
      $.ajax({
        url:     url,
        type:    "POST",
        headers: {
          "X-CSRFToken": CSRF_TOKEN
        },
        data: {
          email_subject: emailSubject,
          email_body:    emailBody
        },
        success: function() {
          displayMessage("Successfully sent email to " + name, "success")
          $("#email-form-" + financialAidId).trigger("reset")
          $("#application-email-row-" + financialAidId).hide()
        },
        error: function(result) {
          displayMessage(
            "Error in sending email to " + name + ": " + result.responseText,
            "danger"
          )
        }
      })
    }
  }

  /**
   * Redirects to initiate search
   */
  function initiateSearch() {
    var searchQuery = $("#search-query").val()
    window.location = BASE_PATH + searchQuery
  }

  /**
   * Toggles currency display
   *
   * @param currency {int} The currency to display
   */
  function toggleCurrency(currency) {
    if (currency === "USD") {
      $(".income-usd").show()
      $(".income-local").hide()
    } else {
      $(".income-usd").hide()
      $(".income-local").show()
    }
  }

  /**
   * Toggles email display
   *
   * @param financialAidId {str} FinancialAid.id to toggle
   */
  function toggleEmailDisplay(financialAidId) {
    $("#application-email-row-" + financialAidId).toggle()
  }

  /**
   * Displays a dismissible alert message.
   *
   * @param message {string} Message to display
   * @param type {string} Type of Bootstrap alert
   */
  function displayMessage(message, type) {
    var template = $("#message-template").clone()
    // Populate template
    template
      .removeAttr("id")
      .addClass("alert-" + type)
      .children("span")
      .text(message)
    $("#messages").append(template)
    template.slideDown()
  }

  return {
    actionReset:        actionReset,
    submitDocsReceived: submitDocsReceived,
    submitApproval:     submitApproval,
    sendEmail:          sendEmail,
    initiateSearch:     initiateSearch,
    toggleCurrency:     toggleCurrency,
    toggleEmailDisplay: toggleEmailDisplay
  }
})(window, document, jQuery)
