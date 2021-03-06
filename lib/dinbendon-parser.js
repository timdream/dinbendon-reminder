'use strict';

var DinBenDonParser = function() {
  this.loading = false;
  this.error = false;
  this.accountName = '';

  this.pageDoc = null;
  this.orders = null;
  this.updatedTimestamp = undefined;
};

DinBenDonParser.prototype.onordersupdated = null;

DinBenDonParser.prototype.getTimeFromString = function(str) {
  var time = new Date();

  var monthStr = (str.match(/\b(\d\d)\//) || [])[1];
  if (monthStr) {
    time.setMonth(parseInt(monthStr, 10) - 1);
  }

  var dateStr = (str.match(/\/(\d\d)\b/) || [])[1];
  if (dateStr) {
    time.setDate(parseInt(dateStr, 10));
  }

  var hourStr = (str.match(/\b(\d\d):/) || [])[1];
  if (/(PM|下午)/.test(str)) {
    if (hourStr !== '12') {
      time.setHours(parseInt(hourStr, 10) + 12);
    } else {
      time.setHours(12);
    }
  } else if (/(AM|上午)/.test(str)) {
    if (hourStr !== '12') {
      time.setHours(parseInt(hourStr, 10));
    } else {
      time.setHours(0);
    }
  } else {
    time.setHours(parseInt(hourStr, 10));
  }

  var minuteStr = (str.match(/:(\d\d)\b/) || [])[1];
  time.setMinutes(parseInt(minuteStr, 10));

  time.setSeconds(0);
  time.setMilliseconds(0);

  return time.getTime();
};

DinBenDonParser.prototype.updateorders = function() {
  if (this.loading) {
    return;
  }

  this.loading = true;
  this.error = false;

  var xhr = new XMLHttpRequest();
  xhr.timeout = 5 * 1000;
  xhr.responseType = 'document';
  xhr.withCredentials = true;
  xhr.open('GET', this.URL);
  xhr.onloadend = function() {
    this.pageDoc = xhr.response;
    this.getPageData();
  }.bind(this);
  xhr.send();
};

DinBenDonParser.prototype.getPageData = function() {
  if (!this.pageDoc) {
    this.gotPageData();
    return;
  }

  var domTreeToArray = function(node) {
    if (node.children.length) {
      return Array.prototype.map.call(node.children, function(childNode) {
        return domTreeToArray(childNode);
      });
    } else {
      return node.textContent;
    }
  };

  var results = [];
  [
    this.SELECTOR_IN_PROGRESS_NAME,       // 0
    this.SELECTOR_IN_PROGRESS_LINK,       // 1
    this.SELECTOR_IN_PROGRESS_EXPIRES,    // 2
    this.SELECTOR_ORDERED_NAME,           // 3
    this.SELECTOR_ORDERED_ITEMS,          // 4
    this.SELECTOR_ORDERED_ITEM_LINK,      // 5
    this.SELECTOR_ORDERED_ITEM_EXPIRES,   // 6
    this.SELECTOR_ACCOUNT_NAME,           // 7
    this.SELECTOR_IN_PROGRESS_ORIGINATOR  // 8
  ].forEach(function(selector) {
    var nodes = this.pageDoc.querySelectorAll(selector);
    var result = Array.prototype.map.call(nodes, function(node) {
      switch (node.tagName) {
        case 'A':
          return node.href;
          break;

        case 'UL':
          return domTreeToArray(node);

          break;

        default:
          return node.textContent;
          break;
      }
    });
    results.push(result);
  }.bind(this));

  this.gotPageData({ results });
};

DinBenDonParser.prototype.gotPageData = function(msg) {
  if (!msg || !msg.results[7].length || !msg.results[7][0]) {
    // Not logged in nor page loading error
    this.error = true;
    this.orders = [];
    this.accountName = '';
    this.pageDoc = null;
    this.loading = false;

    if (typeof this.onordersupdated === 'function') {
      this.onordersupdated(this.orders);
    }

    return;
  }

  this.accountName = msg.results[7][0].replace(/^ \- /, '');

  this.orders = msg.results[0].map(function(name, i) {
    var expires = this.getTimeFromString(msg.results[2][i]);

    var orderedIndex = -1;
    var idx = msg.results[3].indexOf(name);
    while (idx !== -1) {
      if (expires === this.getTimeFromString(msg.results[6][idx])) {
        orderedIndex = idx;

        break;
      }
      idx = msg.results[3].indexOf(name, idx + 1);
    }

    var order = {
      name: name,
      originator: msg.results[8][i],
      link: msg.results[1][i],
      expires: expires,
      ordered: (orderedIndex !== -1),
      expired: false
    };

    if (orderedIndex !== -1) {
      order.orderedItems = msg.results[4][orderedIndex];
      order.orderedItems.forEach(function(orderedItem) {
        orderedItem[1] = parseInt(orderedItem[1].substr(2), 10);
      });
    }

    return order;
  }, this);

  msg.results[3].forEach(function(orderedName, i) {
    var inProgressIndex = -1;
    var idx = msg.results[0].indexOf(orderedName);
    while (idx !== -1) {
      if (this.getTimeFromString(msg.results[2][idx]) ===
          this.getTimeFromString(msg.results[6][i])) {
        inProgressIndex = idx;

        break;
      }
      idx = msg.results[0].indexOf(orderedName, idx + 1);
    }

    if (inProgressIndex !== -1) {
      return;
    }

    msg.results[4][i].forEach(function(orderedItem) {
      orderedItem[1] = parseInt(orderedItem[1].substr(2), 10);
    });

    this.orders.push({
      name: orderedName,
      link: msg.results[5][i],
      ordered: true,
      expired: true,
      expires: this.getTimeFromString(msg.results[6][i]),
      orderedItems: msg.results[4][i],
    });
  }, this);

  this.updatedTimestamp = Date.now();

  this.pageDoc = null;
  this.loading = false;

  if (typeof this.onordersupdated === 'function') {
    this.onordersupdated(this.orders);
  }
};

DinBenDonParser.prototype.URL = 'https://dinbendon.net/do/';

DinBenDonParser.prototype.SELECTOR_IN_PROGRESS_NAME =
  '#inProgressBox tr > td:nth-child(2) > div > a > span:nth-child(2)';
DinBenDonParser.prototype.SELECTOR_IN_PROGRESS_ORIGINATOR =
  '#inProgressBox tr > td:nth-child(2) > div > a > span:nth-child(1)';
DinBenDonParser.prototype.SELECTOR_IN_PROGRESS_LINK =
  '#inProgressBox tr > td:nth-child(2) > div > span > a';
DinBenDonParser.prototype.SELECTOR_IN_PROGRESS_EXPIRES =
  '#inProgressBox tr > td:nth-child(2) > div > div > span.satisfyCondition';
DinBenDonParser.prototype.SELECTOR_ORDERED_NAME =
  '#manageSections_panels_1 > div:nth-child(1) > div > div > div > b';
DinBenDonParser.prototype.SELECTOR_ORDERED_ITEMS =
  '#manageSections_panels_1 > div:nth-child(1) > div > div:nth-child(2) >' +
  ' div > ul';
DinBenDonParser.prototype.SELECTOR_ORDERED_ITEM_LINK =
  '#manageSections_panels_1 > div:nth-child(1) > div > div:nth-child(2) > a';
DinBenDonParser.prototype.SELECTOR_ORDERED_ITEM_EXPIRES =
  '#manageSections_panels_1 > div:nth-child(1) > div > div:nth-child(2) > span';
DinBenDonParser.prototype.SELECTOR_ACCOUNT_NAME = '.headerTitle';
