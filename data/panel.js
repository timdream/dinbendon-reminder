'use strict';

setInterval(updateTimestamps, 60 * 1000);

function updateTimestamps() {
  var timeEls = document.body.querySelectorAll('[data-timestamp]');
  Array.prototype.forEach.call(timeEls, function(el) {
    if (el.dataset.timestamp) {
      el.textContent = humane_date(parseInt(el.dataset.timestamp, 10));
    } else {
      el.textContent = '';
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


var templateEl = document.getElementById('order-template');
var ordersEl = document.getElementById('orders');
var reloadEl = document.getElementById('reload');
var nameEl = document.getElementById('name');
var updatedTimestampEl = document.getElementById('updated-timestamp');

ordersEl.addEventListener('click', function(evt) {
  var name = evt.target.dataset.name;
  if (!name) {
    return;
  }

  evt.target.parentNode.parentNode.classList.toggle('is-ignored');
  chrome.runtime.sendMessage(null, { name: 'ignore-order', msg: name });
});

reloadEl.addEventListener('click', function(evt) {
  document.body.classList.remove('is-error');
  document.body.classList.remove('is-ok');
  document.body.classList.add('is-loading');
  chrome.runtime.sendMessage(null, { name: 'reload' });
});

chrome.runtime.onMessage.addListener(function(runtimeMsg) {
  if (runtimeMsg.name !== 'update') {
    return;
  }

  var msg = runtimeMsg.msg;
  document.body.classList.toggle('is-error', msg.isError);
  document.body.classList.toggle('is-loading', msg.isLoading);
  document.body.classList.toggle('is-ok', !msg.isError && !msg.isLoading);

  ordersEl.textContent = '';

  if (msg.isLoading || msg.isError) {
    return;
  }

  nameEl.textContent = msg.accountName;

  updatedTimestampEl.dataset.timestamp = msg.updatedTimestamp || '';

  msg.orders.forEach(function(order) {
    var el = templateEl.content.cloneNode(true);
    el.querySelector('.name').textContent = order.name;
    el.querySelector('.name').href = order.link;
    el.querySelector('.originator').textContent = order.originator;
    el.querySelector('.ignore').dataset.name = order.name;
    if (order.expires) {
      el.querySelector('.expires').title =
        (new Date(order.expires)).toLocaleString();
      el.querySelector('.expires').dataset.timestamp = order.expires;
    }
    var statusEl = el.querySelector('.order');
    if (order.ordered) {
      statusEl.classList.add('is-ordered');
      el.querySelector('.order-item').textContent =
        order.orderedItems.reduce(function(str, orderedItem, i) {
          if (i !== 0) {
            str += '、';
          }
          str += orderedItem[0];
          if (orderedItem[1] > 1) {
            str += 'x' + orderedItem[1];
          }
          return str;
        }, '');
    }
    if (order.expired) {
      statusEl.classList.add('is-expired');
    }

    if (msg.ignoreNames.indexOf(order.name) !== -1) {
      statusEl.classList.add('is-ignored');
    }

    ordersEl.appendChild(el);
  });

  updateTimestamps();
});

chrome.runtime.sendMessage(null, { name: 'ready' });
