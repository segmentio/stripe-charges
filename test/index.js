
var assert = require('assert');
var cohort = require('..');
var util = require('util');

describe('stripe-charges', function () {

  // TODO: enter your stripe key
  var key = 'stripe-key';

  describe('#cohort', function () {
    this.timeout(30000); // querying lots of charges can take a while

    it('should return a cohort of charges', function (done) {
      var self = this;
      var start = new Date('2/1/2014');
      var end = new Date('3/1/2014');
      cohort(key)(start, end, function (err, charges) {
        if (err) return done(err);
        assert(charges);
        self.charges = charges;
        done();
      });
    });
  });

  describe('#charges', function () {

    describe('#count', function () {
      it('should count the charges', function () {
        var count = this.charges.count();
        assert('number' === typeof count);
      });
    });

    describe('#list', function () {
      it('should get a list of charges', function () {
        var list = this.charges.list();
        assert(util.isArray(list));
      });

      it('should get a list of charges by created date', function () {
        var start = new Date('2/15/2014');
        var end = new Date('2/16/2014');
        var list = this.charges.list(start, end);
        assert(util.isArray(list));
      });
    });
  });
});