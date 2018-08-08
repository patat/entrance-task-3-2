'use strict';

var _index = require('../index');

var expect = require('chai').expect;

describe('loadData', function suitLoadData() {
  it('shoud return contents of a .json file', function test() {
    var expected = [{
      num: 1,
      word: "One"
    }, {
      num: 2,
      word: "Two"
    }, {
      num: 3,
      word: "Three"
    }, {
      num: 4,
      word: "Four"
    }, {
      num: 5,
      word: "Five"
    }, {
      num: 0,
      word: "Zero"
    }];
    expect((0, _index.loadData)('ref.json')).to.deep.equal(expected);
  });
});

describe('getRatesByHour', function () {
  var rates = void 0,
      ratesByHour = void 0;
  beforeEach(function () {
    rates = (0, _index.loadData)('src/test/inputExample.json').rates;
    ratesByHour = (0, _index.getRatesByHour)(rates);
  });

  it('a rate at the beginning of a day', function test() {
    expect(ratesByHour[0]).to.equal(1.79);
  });

  it('a rate at the beginning of a period', function test() {
    expect(ratesByHour[10]).to.equal(5.38);
  });

  it('a rate at the end of a day', function test() {
    expect(ratesByHour[23]).to.equal(1.79);
  });
});

describe('getAvailablePositions', function () {
  var devices = void 0;
  beforeEach(function () {
    devices = (0, _index.loadData)('src/test/inputExample.json').devices;
  });

  it('handles positions for `day` mode devices', function () {
    var expected = [];
    for (var i = 7; i < 20; i++) {
      expected.push(i);
    }
    expect((0, _index.getAvailablePositions)(devices[1])).to.deep.equal(expected);
  });

  it('handles positions for `night` mode devices', function () {
    var expected = [21];
    for (var i = 0; i < 5; i++) {
      expected.push(i);
    }
    expect((0, _index.getAvailablePositions)(devices[0])).to.deep.equal(expected);
  });

  it('handles positions for no mode devices', function () {
    var expected = [0];
    expect((0, _index.getAvailablePositions)(devices[2])).to.deep.equal(expected);
  });
});

describe('calcPositions', function () {
  var data = void 0;
  beforeEach(function () {
    data = (0, _index.loadData)('src/test/inputExample.json');
  });

  it('calculates positions for each device', function test() {
    var positions = (0, _index.calcPositions)(data);
    expect(positions).to.have.length(data.devices.length);
  });

  it('calculates positions correctly', function test() {
    var positions = (0, _index.calcPositions)(data);
    expect(positions[0][21]).to.equal(10.222 + 1.7005);
  });
});

describe('augmentDevices', function () {
  var data = void 0,
      positions = void 0;

  beforeEach(function () {
    data = (0, _index.loadData)('src/test/inputExample.json');
    positions = (0, _index.calcPositions)(data);
  });

  it('returns array of devices with costs key present on each device', function test() {
    var augmentedDevices = (0, _index.augmentDevices)(data.devices, positions);
    augmentedDevices.forEach(function (device) {
      expect(device).to.have.property('costs');
    });
  });
  it('composes correct costs object', function test() {
    var expected = [[{
      cost: 5.101500000000001,
      timeslots: [0, 1, 2, 3, 4]
    }, {
      cost: 11.9225,
      timeslots: [21]
    }], [{
      cost: 21.52,
      timeslots: [10, 11, 12, 13, 14, 15]
    }, {
      cost: 23.68,
      timeslots: [9, 16]
    }, {
      cost: 25.84,
      timeslots: [7, 8, 17, 18, 19]
    }], [{
      cost: 5.398000000000002,
      timeslots: [0]
    }], [{
      cost: 5.398000000000002,
      timeslots: [0]
    }], [{
      cost: 1.5215,
      timeslots: [0, 1, 2, 3, 4, 5, 6, 23]
    }, {
      cost: 4.573,
      timeslots: [10, 11, 12, 13, 14, 15, 16, 21, 22]
    }, {
      cost: 5.4910000000000005,
      timeslots: [7, 8, 9, 17, 18, 19, 20]
    }]];
    var augmentedDevices = (0, _index.augmentDevices)(data.devices, positions);
    augmentedDevices.forEach(function (device, index) {
      expect(device.costs).to.deep.equal(expected[index]);
    });
  });
});

describe('testAgainstMaxPower', function () {
  var data = void 0;

  beforeEach(function () {
    data = (0, _index.loadData)('src/test/inputExample.json');
  });
  it('returns true if scheduled devices stay within maxPower constraint', function test() {
    var schedule = (0, _index.loadData)('src/test/invalidSchedule.json');
    expect((0, _index.testAgainstMaxPower)(schedule, data)).to.equal(true);
  });

  it('returns true if scheduled devices stay within maxPower constraint', function test() {
    var schedule = (0, _index.loadData)('src/test/invalidSchedule.json');
    expect((0, _index.testAgainstMaxPower)(schedule, data)).to.equal(true);
  });
});

describe('composeSchedule', function () {
  var data = void 0,
      positions = void 0;

  beforeEach(function () {
    data = (0, _index.loadData)('src/test/inputExample.json');
    positions = (0, _index.calcPositions)(data);
  });
  it('composes a schedule that includes each device once', function test() {
    var augmentedDevices = (0, _index.augmentDevices)(data.devices, positions);
    var schedule = (0, _index.composeSchedule)(augmentedDevices);
    //console.log(schedule);
  });
});

describe('gaCompose', function () {
  var data = void 0,
      positions = void 0,
      augmentedDevices = void 0;

  beforeEach(function () {
    data = (0, _index.loadData)('src/test/inputExample.json');
    positions = (0, _index.calcPositions)(data);
    augmentedDevices = (0, _index.augmentDevices)(data.devices, positions);
  });
  it('works', function test() {
    var composed = (0, _index.gaCompose)(augmentedDevices, data.maxPower);
    console.log(composed);
    expect(composed).to.equal(true);
  });
});