
var Charges = require('./charges');
var debug = require('debug')('stripe-cohort');
var defaults = require('defaults');
var range = require('range-component');
var Stripe = require('stripe');
var unixTime = require('unix-time');
var util = require('util');

/**
 * Expose `StripeCharges`.
 */

module.exports = StripeCharges;

/**
 * Initialize a new `StripeCharges` the Stripe `key`.
 *
 * @param {String} key
 * @param {Object} options
 *   @param {Number} count
 */

function StripeCharges (key, options) {
  if (!(this instanceof StripeCharges)) return new StripeCharges(key, options);
  if (!key) throw new Error('Stripe cohort requires a Stripe key.');
  this.stripe = Stripe(key);
  this.options = defaults(options, { count: 100 });
  var self = this;
  return function () { self.cohort.apply(self, arguments); };
}

/**
 * Create a cohort.
 *
 * @param {Date} start
 * @param {Date} end
 * @param {Function} callback
 */

StripeCharges.prototype.cohort = function (start, end, callback) {
  if (!util.isDate(start)) throw new Error('Start must be a date.');
  if (!util.isDate(end)) throw new Error('End must be a date.');
  var self = this;
  debug('creating charges cohort [%s - %s] ..', start, end);
  this.charges(start, end, function (err, charges) {
    if (err) return callback(err);
    debug('created charges cohort');
    callback(null, new Charges(charges));
  });
};

/**
 * Load charges between a `start` and `end` date.
 *
 * @param {Date} start
 * @param {Date} end
 * @param {Function} callback
 */

StripeCharges.prototype.charges = function (start, end, callback) {
  debug('loading charges with created [%s - %s] ..', start, end);
  var self = this;
  var charges = [];
  paginateQuery()

  function paginateQuery (lastId) {
    self.query(start, end, lastId, function (err, res) {
      if (err) return callback(err);
      charges.push.apply(charges, res.data);
      // check if we grabbed everything in the first query
      if (!res.has_more) return callback(null, charges);

      // there's more, we have to paginate query
      debug('loaded %d charges, has more to load', res.data.length);
      var lastId = res.data[res.data.length - 1].id
      paginateQuery(lastId)
    })
  }
};

/**
 * List charges between a `start` and `end` date, with an `offset`.
 *
 * @param {Date} start
 * @param {Date} end
 * @param {Number} offset
 * @param {Function} callback
 */

StripeCharges.prototype.query = function (start, end, startingAfter, callback) {
  debug('loading charges with created [%s - %s] starting after %d ..', start, end, startingAfter);
  var options = {
    created: { gte: unixTime(start), lte: unixTime(end) },
    count: this.options.count
  };
  if (startingAfter) options.starting_after = startingAfter
  this.stripe.charges.list(options, function (err, res) {
    if (err) return callback(err);
    var charges = res.data;
    debug('loaded %d charges starting after %d', charges.length, startingAfter);
    callback(null, res);
  });
};
