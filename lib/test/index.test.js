'use strict';

var expect = require('chai').expect;
var ind = require('../index');

describe('index', function () {
  it('should return `hi`', function () {
    expect(ind()).to.equal('hi');
  });
});