/* eslint-disable no-unused-vars, no-undef, no-var */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase

// responsive sharing buttons
import "rrssb/js/rrssb.js";

import "bootstrap";

// mailchimp requirements
import "ajaxchimp";

/// MAILCHIMP BELOW

// makes sure the whole site is loaded
jQuery(window).load(function() {
  // will first fade out the loading animation
  jQuery(".status").fadeOut();
  // will fade out the whole DIV that covers the website.
  jQuery(".preloader").delay(1000).fadeOut("slow");
});

/* Full screen header */
function alturaMaxima() {
  var altura = $(window).height();
  $(".full-screen").css('min-height', altura);
}

$(document).ready(function() {
  alturaMaxima();
  $(window).bind('resize', alturaMaxima);
});

/* Bootstrap Internet Explorer 10 in Windows 8 and Windows Phone 8 FIX */
if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
  var msViewportStyle = document.createElement('style');
  msViewportStyle.appendChild(
    document.createTextNode(
      '@-ms-viewport{width:auto!important}'
    )
  );
  document.querySelector('head').appendChild(msViewportStyle);
}

/* =================================
===  MAILCHIMP                 ====
=================================== */
$('.mailchimp').ajaxChimp({
  callback: mailchimpCallback,
  //Replace this with your own mailchimp post URL. Don't remove the "". Just paste the url inside "".
  url: "//facebook.us6.list-manage.com/subscribe/post?u=ad81d725159c1f322a0c54837&amp;id=008aee5e78"
});

function mailchimpCallback(resp) {
  if (resp.result === 'success') {
    $('.subscription-result.success').html(`<i class="icon_check_alt2"></i><br/>${resp.msg}`).fadeIn(1000);
    $('.subscription-result.error').fadeOut(500);
  } else if(resp.result === 'error') {
    $('.subscription-result.error').html(`<i class="icon_close_alt2"></i><br/>${resp.msg}`).fadeIn(1000);
  }
}

$("#mce-MMERGE4").hide();
$("#mce-MMERGE3").hide();

$("input[name=MMERGE2]").click(function() {
  if ( $("#university").prop('checked')) {
    $("#mce-MMERGE3").show();
    $("#mce-MMERGE4").hide();
  }
  if ( $("#corporation").prop('checked')){
    $("#mce-MMERGE3").show();
    $("#mce-MMERGE4").hide();
  }
  if ( $("#learner").prop('checked')) {
    $("#mce-MMERGE3").hide();
    $("#mce-MMERGE4").hide();
  }
  if ( $("#other").prop('checked')) {
    $("#mce-MMERGE3").hide();
    $("#mce-MMERGE4").show();
  }
});

/**
 * Set social media sharing links
 */
jQuery(document).ready(function ($) {
  var description = 'MicroMasters is a ' +
    'new digital credential for online learners. The MicroMasters ' +
    'credential will be granted to learners who complete an ' +
    'integrated set of graduate-level online courses. With the MicroMasters ' +
    "credentials, learners can apply for an accelerated master's degree " +
    "program on campus, at MIT or other top universities.";

  $('.rrssb-buttons').rrssb({
    // required:
    title: 'MITx MicroMasters',
    url: CURRENT_PAGE_URL,

    // optional:
    description: description,
    emailBody: description + CURRENT_PAGE_URL
  });
});

/**
 * FAQs accordion on the program page
 */
$(document).ready(function ($) {
  $('.accordion').find('.accordion-toggle').click(function () {
    //Expand or collapse this panel
    $(this).next().slideToggle('fast');
    //Rotate the icon
    $(this).find('.material-icons').toggleClass('rotate').toggleClass('rotate-reset');
    //Hide the other panels and rotate the icons to default
    $(".accordion-content").not($(this).next()).slideUp('fast').prev().
    find('.material-icons').removeClass('rotate-reset').addClass('rotate');
  });
});
