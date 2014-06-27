'use strict';

var ordersEl = document.getElementById('orders');
var mo = new MutationObserver(updateTimestamps);
mo.observe(ordersEl, { childList: true });

setInterval(updateTimestamps, 60 * 1000);

function updateTimestamps() {
  var timeEls = ordersEl.querySelectorAll('.expires');
  Array.prototype.forEach.call(timeEls, function(el) {
    if (el.dataset.timestamp) {
      el.textContent = humane_date(parseInt(el.dataset.timestamp, 10));
    }
  });
}

// http://www.zachleat.com/Lib/jquery/humane.js
/*
 * Javascript Humane Dates
 * Copyright (c) 2008 Dean Landolt (deanlandolt.com)
 * Re-write by Zach Leatherman (zachleat.com)
 *
 * Adopted from the John Resig's pretty.js
 * at http://ejohn.org/blog/javascript-pretty-date
 * and henrah's proposed modification
 * at http://ejohn.org/blog/javascript-pretty-date/#comment-297458
 *
 * Licensed under the MIT license.
 */

function humane_date(timestamp) {
  var time_formats = [
    [60, '就是現在'],
    [90, '1 分鐘'], // 60*1.5
    [3600, '分鐘', 60], // 60*60, 60
    [5400, '1 小時'], // 60*60*1.5
    [86400, '小時', 3600], // 60*60*24, 60*60
    [129600, '1 天'], // 60*60*24*1.5
    [604800, '天', 86400], // 60*60*24*7, 60*60*24
    [907200, '1 星期'], // 60*60*24*7*1.5
    [2628000, '星期', 604800], // 60*60*24*(365/12), 60*60*24*7
    [3942000, '1 個月'], // 60*60*24*(365/12)*1.5
    [31536000, '個月', 2628000], // 60*60*24*365, 60*60*24*(365/12)
    [47304000, '1 年'], // 60*60*24*365*1.5
    [3153600000, '年', 31536000], // 60*60*24*365*100, 60*60*24*365
    [4730400000, '1 世紀'], // 60*60*24*365*100*1.5
  ];

  var dt = new Date,
    seconds = (dt - new Date(timestamp)) / 1000,
    token = '前',
    i = 0,
    format;

  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = '';
  }

  while (i < time_formats.length) {
    format = time_formats[i];
    if (seconds < format[0]) {
      if (format.length == 2) {
        return format[1] + (i > 1 ? token : ''); // Conditional so we don't return Just Now Ago
      } else {
        return Math.round(seconds / format[2]) + ' ' + format[1] + (i > 1 ? token : '');
      }
    }

    i++;
  }

  // overflow for centuries
  if(seconds > 4730400000)
    return Math.round(seconds / 4730400000) + ' Centuries' + token;

  return date_str;
};


