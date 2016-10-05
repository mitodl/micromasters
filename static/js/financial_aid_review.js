/* eslint-disable  no-undef, max-len, no-var, prefer-template */
var financialAidReview = function() {
  "use strict";
  
  var CSRF_TOKEN = window.CSRF_TOKEN;
  
  /**
   * Marks documents as received for a financial aid application
   * 
   * @param financial_aid_id {number} Financial aid application id
   * @param url {string} URL to submit request to
   */
  function submitDocsReceived(financial_aid_id, url) {
    var name = $("#full-name-" + financial_aid_id).text().trim();
    if (confirm("Click OK to mark documents as received for " + name + "'s financial aid application.")) {
      var action = "{{ statuses.PENDING_MANUAL_APPROVAL }}";
      $.ajax({
        "url": url,
        "type": "PATCH",
        "headers": {
          "X-CSRFToken": CSRF_TOKEN
        },
        "data": {
          "action": action
        },
        "success": function() {
          displayMessage(
            "Successfully marked documents as received for " + name + "'s financial aid application.",
            "success"
          );
          $("#application-row-" + financial_aid_id + ", #application-email-row-" + financial_aid_id).remove();
        },
        "error": function(result) {
          displayMessage("Error: " + result.responseText + " on " + name + "'s financial aid application.", "danger");
        }
      });
    }
  }
  
  /**
   * Submits a financial aid application approval
   * 
   * @param financial_aid_id {number} Financial aid application id
   * @param url {string} URL to submit request to
   */
  function submitApproval(financial_aid_id, url) {
    var name = $("#full-name-" + financial_aid_id).text().trim();
    if (confirm("Click OK to approve " + name + "'s financial aid application.")) {
      var action = "{{ statuses.APPROVED }}";
      var justification = $("#justification-" + financial_aid_id).val();
      var tier_program_id = $("#tier-program-id-" + financial_aid_id).val();
      $.ajax({
        "url": url,
        "type": "PATCH",
        "headers": {
          "X-CSRFToken": CSRF_TOKEN
        },
        "data": {
          "action": action,
          "justification": justification,
          "tier_program_id": tier_program_id
        },
        "success": function() {
          displayMessage("Successfully approved " + name + "'s financial aid application.", "success");
          $("#application-row-" + financial_aid_id + ", #application-email-row-" + financial_aid_id).remove();
        },
        "error": function(result) {
          displayMessage("Error: " + result.responseText + " on " + name + "'s financial aid application.", "danger");
        }
      });
    }
  }
  
  /**
   * Submits a financial aid email request
   * 
   * @param financial_aid_id {number} Financial aid application id
   * @param url {string} URL to submit request to
   */
  function sendEmail(financial_aid_id, url) {
    var name = $("#full-name-" + financial_aid_id).text().trim();
    if (confirm("Click OK to send email to " + name)) {
      var emailSubject = $("#email-form-" + financial_aid_id + " [name='email_subject']").val();
      var emailBody = $("#email-form-" + financial_aid_id + " [name='email_body']").val();
      $.ajax({
        "url": url,
        "type": "POST",
        "headers": {
          "X-CSRFToken": CSRF_TOKEN
        },
        "data": {
          "email_subject": emailSubject,
          "email_body": emailBody
        },
        "success": function() {
          displayMessage("Successfully sent email to " + name, "success");
          $("#email-form-" + financial_aid_id).trigger("reset");
          $("#application-email-row-" + financial_aid_id).hide();
        },
        "error": function(result) {
          displayMessage("Error in sending email to " + name + ": " + result.responseText, "danger");
        }
      });
    }
  }
  
  /**
   * Redirects to initiate search
   */
  function initiateSearch() {
    var searchQuery = $("#search-query").val();
    location = "{{ request.path }}?sort_by={{ current_sort_field }}&search_query=" + searchQuery;
  }
  
  /**
   * Toggles currency display
   */
  function toggleCurrency(currency) {
    if (currency == "USD") {
      $(".income-usd").show();
      $(".income-local").hide();
    } else {
      $(".income-usd").hide();
      $(".income-local").show();
    }
  }
  
  /**
   * Toggles email display
   */
  function toggleEmailDisplay(financialAidId) {
    $("#application-email-row-" + financialAidId).toggle();
  }
  
  /**
   * Displays a dismissible alert message.
   * 
   * @param message {string} Message to display
   * @param type {string} Type of Bootstrap alert
   */
  function displayMessage(message, type) {
    var template = $("#message-template").clone();
    // Populate template
    template.removeAttr("id").addClass("alert-" + type).children("span").text(message);
    $("#messages").append(template);
    template.slideDown();
  }
  
  return {
    submitDocsReceived: submitDocsReceived,
    submitApproval: submitApproval,
    sendEmail: sendEmail,
    initiateSearch: initiateSearch,
    toggleCurrency: toggleCurrency,
    toggleEmailDisplay: toggleEmailDisplay
  }
  
}();