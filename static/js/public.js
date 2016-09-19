/* eslint-disable no-unused-vars, no-undef, no-var */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase

require("bootstrap");

// jquery things
require("./public/jquery.raty.js");

// other code
require("./public/core.js");
require("./public/site.js");

// jquery components
require("./public/components/raty.js");

// mailchimp requirements
require("ajaxchimp");

// make the thing work
(function(document, window, $) {
  'use strict';
  var Site = window.Site;
  $(document).ready(function() {
    Site.run();
  });
})(document, window, jQuery);

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
