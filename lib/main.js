'use strict';

var ToggleButton = require('sdk/ui/button/toggle').ToggleButton;
var notifications = require("sdk/notifications");
var panels = require("sdk/panel");
var timers = require('sdk/timers');
var self = require('sdk/self');

var DinBenDonParser = require('dinbendon-parser').DinBenDonParser;

var ss = require("sdk/simple-storage");

var DinBenDonReminder = function() {
  this.parser = null;
  this.timer = null;
  this.button = null;
};

DinBenDonReminder.prototype.REMIND_INTERVAL = 30 * 60 * 1000;

DinBenDonReminder.prototype.start = function() {
  this.parser = new DinBenDonParser();
  this.parser.onordersupdated = this.handleOrderUpdated.bind(this);

  this.check();
  this.timer =
    timers.setInterval(this.check.bind(this), this.REMIND_INTERVAL);

  this.button = ToggleButton({
    id: 'dinbendon-reminder',
    label: '勿忘訂便當',
    icon: this.BUTTON_ICON_URL,
    onChange: function handleChange(state) {
      if (state.checked) {
        this.createPanel();
      }
    }.bind(this)
  });

  if (!ss.storage.ignoreNames) {
    ss.storage.ignoreNames = [];
  }
};

DinBenDonReminder.prototype.createPanel = function() {
  var contentScript = '(' + (function panelContentScript() {
    var templateEl = document.getElementById('order-template');
    var ordersEl = document.getElementById('orders');

    ordersEl.addEventListener('click', function(evt) {
      var name = evt.target.dataset.name;
      if (!name) {
        return;
      }

      evt.target.parentNode.parentNode.classList.toggle('is-ignored');
      self.port.emit('ignore-order', name);
    });

    self.port.on('update', function(msg) {
      ordersEl.textContent = '';

      msg.orders.forEach(function(order) {
        var el = templateEl.content.cloneNode(true);
        el.querySelector('.name').textContent = order.name;
        el.querySelector('.name').href = order.link;
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
            order.orderedItem +
            (order.orderedCount > 1 ? ('x' + order.orderedCount) : '');
        }
        if (order.expired) {
          statusEl.classList.add('is-expired');
        }

        if (msg.ignoreNames.indexOf(order.name) !== -1) {
          statusEl.classList.add('is-ignored');
        }

        ordersEl.appendChild(el);
      });
    });
    self.port.emit('ready');
  }).toString() + ')()';

  this.panel = panels.Panel({
    contentURL: self.data.url('panel.html'),
    onHide: function handleHide() {
      this.button.state('window', { checked: false });
      this.panel.destroy();
      this.panel = null;
    }.bind(this),
    contentScript: contentScript,
    contentScriptWhen: 'ready',
    width: 250,
    height: 300
  });

  this.panel.port.on('ignore-order', this.toggleIgnore.bind(this));
  this.panel.port.on('ready', this.showPanel.bind(this));
};

DinBenDonReminder.prototype.NOTIFY_ICON_URL = self.data.url('dinbendon.png');
DinBenDonReminder.prototype.BUTTON_ICON_URL =
  self.data.url('dinbendon-alpha-grayscale.png');

DinBenDonReminder.prototype.check = function() {
  this.parser.updateorders();
};

DinBenDonReminder.prototype.handleOrderUpdated = function() {
  this.notifyUnordered();
  if (this.panel && this.panel.isShowing) {
    // Show again to update the data.
    this.showPanel();
  }
};

DinBenDonReminder.prototype.toggleIgnore = function(name) {
  var index = ss.storage.ignoreNames.indexOf(name);

  if (index === -1) {
    ss.storage.ignoreNames.push(name);
  } else {
    ss.storage.ignoreNames.splice(index, 1);
  }
};

DinBenDonReminder.prototype.notifyUnordered = function() {
  var ordersToNotify = this.parser.orders.filter(function(order) {
    return !order.ordered && !order.expired &&
      (ss.storage.ignoreNames.indexOf(order.name) === -1);
  }, this);

  if (!ordersToNotify.length) {
    return;
  }

  var ordersToNotifyListLabel = ordersToNotify.map(function(order) {
    return order.name;
  }).join('、');

  notifications.notify({
    title: '勿忘訂便當！您有未登記的訂單',
    text: ordersToNotifyListLabel,
    iconURL: this.NOTIFY_ICON_URL //,
    //onClick:
  });
};

DinBenDonReminder.prototype.showPanel = function() {
  this.panel.show({ position: this.button });

  this.panel.port.emit('update', {
    orders: this.parser.orders || [],
    ignoreNames: ss.storage.ignoreNames || []
  });
};

(new DinBenDonReminder()).start();
