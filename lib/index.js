
var Batch = require('batch');
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
  this.options = defaults(options, { count: 100, concurrency: 1 });
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
  var page = this.options.count;
  // run the first query to get the total unpaginated count
  this.query(start, end, 0, function (err, res) {
    if (err) return callback(err);
    var count = res.count;
    charges.push.apply(charges, res.data);
    var got = res.data.length;
    var left = res.count - got;
    // check if we grabbed everything in the first query
    if (0 === left) return callback(null, charges);
    // there's more, we have to paginate query
    var pages = Math.ceil(left / page);
    debug('loaded %d charges, %d left in %d pages of %d', got, left, pages, page);
    var batch = new Batch();
    batch.concurrency(self.options.concurrency);
    range(0, pages).forEach(function (i) {
      batch.push(function (done) { self.query(start, end, got + (i * page), done); });
    });
    batch.end(function (err, results) {
      if (err) return callback(err);
      results.forEach(function (res) {
        charges.push.apply(charges, res.data);
      });
      debug('finished loading all charges in cohort');
      callback(null, charges);
    });
  });
};

/**
 * List charges between a `start` and `end` date, with an `offset`.
 *
 * @param {Date} start
 * @param {Date} end
 * @param {Number} offset
 * @param {Function} callback
 */

StripeCharges.prototype.query = function (start, end, offset, callback) {
  debug('loading charges with created [%s - %s] with offset %d ..', start, end, offset);
  var options = {
    created: { gte: unixTime(start), lte: unixTime(end) },
    count: this.options.count,
    offset: offset
  };
  this.stripe.charges.list(options, function (err, res) {
    if (err) return callback(err);
    var charges = res.data;
    debug('loaded %d charges with offset %d', charges.length, offset);
    callback(null, res);
  });
};