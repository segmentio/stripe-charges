
var util = require('util');

/**
 * Expose `Charges`.
 */

module.exports = Charges;

/**
 * A list of Stripe `charges`.
 *
 * @param {Array|Customer} charges
 *
 */

function Charges (charges) {
  this.charges = charges;
}

/**
 * Filter customers by `fn`.
 *
 * @param {Function} fn
 * @return {Customers}
 */

Charges.prototype.filter = function (fn) {
  return new Charges(this.charges.filter(fn));
};

/**
 * Return a new `paid` `Charges` list;
 *
 * @param {Boolean} paid
 * @return {Charges}
 */

Charges.prototype.paid = function (paid) {
  if (typeof paid !== 'boolean') paid = true;
  return new Charges(this.charges.filter(function (charge) {
    return charge.paid === paid;
  }));
};

/**
 * Return a new `refunded` `Charges` list;
 *
 * @param {Boolean} paid
 * @return {Charges}
 */

Charges.prototype.refunded = function (refunded) {
  if (typeof refunded !== 'boolean') refunded = true;
  return new Charges(this.charges.filter(function (charge) {
    return charge.refunded === refunded;
  }));
};

/**
 * Return a new `Charges` list thats filtered by `start` and `end`.
 *
 * @param {Date} start
 * @param {Date} end
 * @return {Charges}
 */

Charges.prototype.created = function (start, end) {
  if (!util.isDate(start)) return this;
  if (!util.isDate(end)) end = new Date('1/1/99999');
  var s = start.getTime(), e = end.getTime();
  return new Charges(this.charges.filter(function (charge) {
    var created = charge.created * 1000;
    return created >= s && created <= e;
  }));
};

/**
 * Count the charges between `start` and `end`.
 *
 * @param {Date} start
 * @param {Date} end
 * @return {Number}
 */

Charges.prototype.list = function (start, end) {
  return this.created(start, end).charges;
};

/**
 * Count the charges between `start` and `end`.
 *
 * @param {Date} start
 * @param {Date} end
 * @return {Number}
 */

Charges.prototype.count = function (start, end) {
  return this.created(start, end).charges.length;
};

/**
 * Print an audit of the charges.
 *
 * @return {Number}
 */

Charges.prototype.print = function () {
  var list = this.list();
  var total = 0;
  for (var i = 0; i < list.length; i += 1) {
    var charge = list[i];
    var customer = charge.customer;
    var a = Math.round(amount(charge) * 100) / 100.0;
    console.log([customer.email, '$' + a].join(' - '));
    total += a;
  }
  console.log('Total Charges: $' + total);
};

/**
 * Count the total monthly cash amount made between `start` and `end`.
 *
 * @param {Date} start
 * @param {Date} end
 * @return {Number}
 */

Charges.prototype.total = function (start, end) {
  var total = this.created(start, end).charges.reduce(function (memo, charge) {
    return memo + amount(charge);
  }, 0.00);
  return Math.round(total * 100) / 100.0; // to two decimal points
};

/**
 * Calculate the amount in dollars of a charge after fees
 * and discounts.
 *
 * @param {Charge} charge
 * @return {Number}
 */

function amount (charge) {
  var res = (charge.amount / 100.0);
  if (res > 0.0) res *= (1.00 - 0.029); // Stripe fees
  return res;
}