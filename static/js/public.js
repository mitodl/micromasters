/* eslint-disable no-unused-vars, no-undef, no-var */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase

// responsive sharing buttons
import "rrssb/js/rrssb.js";

import "bootstrap";

// jquery things
import "./public/jquery.raty.js";

// other code
import "./public/core.js";
import "./public/site.js";

// jquery components
import "./public/components/raty.js";

// mailchimp requirements
import "ajaxchimp";

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
    title: 'MIT MicroMasters',
    url: CURRENT_PAGE_URL,

    // optional:
    description: description,
    emailBody: description + CURRENT_PAGE_URL
  });
});

/**
 * Set url hash if hash provided in the url,
 * or set hash based on the active panel
 */
$(function(){
  $('.mdl-tabs__tab').click(function(){
    document.location.hash = $(this).attr('href');
  });
  if (document.location.hash){
    setPanelActive(document.location.hash);
  } else {
    location.hash = $('.mdl-tabs__tab.is-active').attr('href');
  }
});

$(window).on('hashchange', function () {
  if (location.hash) {
    setPanelActive(location.hash);
  }
});

/**
 *  Given a valid hash, set the corresponding panel active.
 */
function setPanelActive(hash){
  var $panel = $(hash);
  if ($panel.length > 0) {
    $(".mdl-tabs__panel, .mdl-tabs__tab").removeClass('is-active');
    $panel.addClass('is-active');
    $(`a.mdl-tabs__tab[href="${hash}"]`).addClass('is-active');
  } else {
    location.hash = $('.mdl-tabs__tab.is-active').attr('href');
  }
}
