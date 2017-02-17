'use strict';

var DinBenDonStorage = function() {
};

DinBenDonStorage.prototype.start = function() {
  var ignoreNamesStr = window.localStorage.getItem('ignored-names');

  if (!ignoreNamesStr) {
    this._ignoreNames = [];
  } else {
    this._ignoreNames = JSON.parse(ignoreNamesStr);
  }
};

DinBenDonStorage.prototype.toggleIgnore = function(name) {
  var index = this._ignoreNames.indexOf(name);

  if (index === -1) {
    this._ignoreNames.push(name);
  } else {
    this._ignoreNames.splice(index, 1);
  }
  window.localStorage.setItem(
    'ignored-names', JSON.stringify(this._ignoreNames));
};

DinBenDonStorage.prototype.isIgnored = function(order) {
  return (this._ignoreNames.indexOf(order.name) !== -1);
};

DinBenDonStorage.prototype.getIgnoreNames = function() {
  return this._ignoreNames;
};

DinBenDonStorage.prototype.cleanup = function(orders) {
  var arr = [];

  orders.forEach(function(order) {
    if (order.expired) {
      return;
    }

    if (this.isIgnored(order)) {
      arr.push(order.name);
    }
  }, this);

  this._ignoreNames = arr;
  window.localStorage.setItem(
    'ignored-names', JSON.stringify(this._ignoreNames));
};

var DinBenDonReminder = function() {
  this.parser = null;
  this.timer = null;
  this.button = null;
  this.storage = null;
};

DinBenDonReminder.prototype.REMIND_INTERVAL = 30 * 60 * 1000;

DinBenDonReminder.prototype.start = function() {
  this.parser = new DinBenDonParser();
  this.parser.onordersupdated = this.handleOrderUpdated.bind(this);

  // This background page can be invoked for the following events.
  // we would need to act accordingly.
  chrome.runtime.onStartup.addListener(this.freshStart.bind(this));
  chrome.runtime.onInstalled.addListener(this.freshStart.bind(this));
  chrome.runtime.onMessage.addListener(function(runtimeMsg) {
    switch (runtimeMsg.name) {
      case 'ignore-order':
        this.storage.toggleIgnore(runtimeMsg.msg);
        break;
      case 'reload':
        chrome.alarms.create({ periodInMinutes: this.REMIND_INTERVAL });
        this.check();
        break;
      case 'ready':
        this.updatePanel();
        break;
    }
  }.bind(this));

  this.storage = new DinBenDonStorage();
  this.storage.start();
};

DinBenDonReminder.prototype.freshStart = function() {
  chrome.alarms.create({ periodInMinutes: this.REMIND_INTERVAL });
  chrome.alarms.onAlarm.addListener(this.check.bind(this));
  this.check();
};

DinBenDonReminder.prototype.NOTIFY_ICON_URL =
  './data/images/logo/dinbendon.png';
DinBenDonReminder.prototype.BUTTON_ICON_URL =
  './data/images/logo/dinbendon-alpha-grayscale.png';

DinBenDonReminder.prototype.check = function() {
  this.parser.updateorders();
};

DinBenDonReminder.prototype.handleOrderUpdated = function() {
  this.notifyUnordered();
  this.notifyDataError();
  this.updatePanel();

  this.storage.cleanup(this.parser.orders);
};

DinBenDonReminder.prototype.notifyDataError = function() {
  if (!this.parser.error) {
    return;
  }

  chrome.notifications.create(null, {
    type: 'basic',
    title: '勿忘訂便當！',
    message: '無法更新資訊：網路錯誤或是尚未登入。',
    iconUrl: this.NOTIFY_ICON_URL //,
    //onClick:
  });
};

DinBenDonReminder.prototype.notifyUnordered = function() {
  var ordersToNotify = this.parser.orders.filter(function(order) {
    return !order.ordered && !order.expired &&
      !this.storage.isIgnored(order);
  }, this);

  if (!ordersToNotify.length) {
    return;
  }

  var ordersToNotifyListLabel = ordersToNotify.map(function(order) {
    return order.name;
  }).join('、');

  chrome.notifications.create(null, {
    type: 'basic',
    title: '勿忘訂便當！您有未登記的訂單',
    message: ordersToNotifyListLabel,
    iconUrl: this.NOTIFY_ICON_URL //,
    //onClick:
  });
};

DinBenDonReminder.prototype.updatePanel = function() {
  chrome.runtime.sendMessage({name :'update', msg: {
    isLoading: this.parser.loading,
    isError: this.parser.error,
    accountName: this.parser.accountName,
    updatedTimestamp: this.parser.updatedTimestamp,
    orders: this.parser.orders || [],
    ignoreNames: this.storage.getIgnoreNames()
  } });
};

var extension = new DinBenDonReminder();
extension.start();
