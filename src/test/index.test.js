const expect = require('chai').expect;

import {
  loadData,
  calcPositions,
  calcOptimalPositions,
  getRatesByHour,
  getAvailablePositions,
  composeSchedule,
  augmentDevices,
  testAgainstMaxPower,
  gaCompose,
  convertEntityToSchedule
} from '../index';

describe('loadData', function suitLoadData() {
  it('shoud return contents of a .json file', function test() {
    const expected = [
      {
          num: 1,
          word: "One"
      },{
          num: 2,
          word: "Two"
      },{
          num: 3,
          word: "Three"
      },{
          num: 4,
          word: "Four"
      },{
          num: 5,
          word: "Five"
      },{
          num: 0,
          word: "Zero"
      }
    ];
    expect(loadData('ref.json')).to.deep.equal(expected);
  });
});

describe('getRatesByHour', function() {
  let rates,
    ratesByHour;
  beforeEach(function() {
    rates = loadData('src/test/inputExample.json').rates;
    ratesByHour = getRatesByHour(rates);
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

describe('getAvailablePositions', function() {
  let devices;
  beforeEach(function() {
    devices = loadData('src/test/inputExample.json').devices;
  });

  it('handles positions for `day` mode devices', function() {
    let expected = [];
    for (let i = 7; i < 20; i++) {
      expected.push(i);
    }
    expect(getAvailablePositions(devices[1])).to.deep.equal(expected);
  });

  it('handles positions for `night` mode devices', function() {
    let expected = [21];
    for (let i = 0; i < 5; i++) {
      expected.push(i);
    }
    expect(getAvailablePositions(devices[0])).to.deep.equal(expected);
  });

  it('handles positions for no mode devices', function() {
    let expected = [0];
    expect(getAvailablePositions(devices[2])).to.deep.equal(expected);
  });
});

describe('calcPositions', function() {
  let data;
  beforeEach(function() {
    data = loadData('src/test/inputExample.json');
  });

  it('calculates positions for each device', function test() {
    const positions = calcPositions(data);
    expect(positions).to.have.length(data.devices.length);
  });

  it('calculates positions correctly', function test() {
    const positions = calcPositions(data);
    expect(positions[0][21]).to.equal(10.222 + 1.7005);
  });
});

describe('augmentDevices', function() {
  let data, 
    positions;

  beforeEach(function() {
    data = loadData('src/test/inputExample.json');
    positions = calcPositions(data);
  });

  it('returns array of devices with costs key present on each device', function test() {
    const augmentedDevices = augmentDevices(data.devices, positions);
    augmentedDevices.forEach(device => {
      expect(device).to.have.property('costs');
    });
  });
  it('composes correct costs object', function test() {
    const expected = [
      [
        {
          cost: 5.101500000000001,
          timeslots: [0, 1, 2, 3, 4]
        },
        {
          cost: 11.9225,
          timeslots: [21]
        }
      ],
      [
        {
          cost: 21.52,
          timeslots: [10, 11, 12, 13, 14, 15]
        },
        {
          cost: 23.68,
          timeslots: [9, 16]
        },
        {
          cost: 25.84,
          timeslots: [7, 8, 17, 18, 19]
        }
      ],
      [
        {
          cost: 5.398000000000002,
          timeslots: [0]
        }
      ],
      [
        {
          cost: 5.398000000000002,
          timeslots: [0]
        }
      ],
      [
        {
          cost: 1.5215,
          timeslots: [0, 1, 2, 3, 4, 5, 6, 23]
        },
        {
          cost: 4.573,
          timeslots: [10, 11, 12, 13, 14, 15, 16, 21, 22]
        },
        {
          cost: 5.4910000000000005,
          timeslots: [7, 8, 9, 17, 18, 19, 20]
        }
      ]
    ];
    const augmentedDevices = augmentDevices(data.devices, positions);
    augmentedDevices.forEach((device, index) => {
      expect(device.costs).to.deep.equal(expected[index]);
    });
  });
});

describe('testAgainstMaxPower', function() {
  let data;

  beforeEach(function() {
    data = loadData('src/test/inputExample.json');
  });
  it('returns true if scheduled devices stay within maxPower constraint', function test() {
    const schedule = loadData('src/test/invalidSchedule.json');
    expect(testAgainstMaxPower(schedule, data)).to.equal(true);
  });

  it('returns true if scheduled devices stay within maxPower constraint', function test() {
    const schedule = loadData('src/test/invalidSchedule.json');
    expect(testAgainstMaxPower(schedule, data)).to.equal(true);
  });
});

describe('composeSchedule', function() {
  let data,
    positions;

  beforeEach(function() {
    data = loadData('src/test/inputExample.json');
    positions = calcPositions(data);
  });
  it('composes a schedule that includes each device once', function test() {
    const augmentedDevices = augmentDevices(data.devices, positions);
    const schedule = composeSchedule(augmentedDevices);
  });
});

describe('gaCompose', function() {
  let data,
    positions,
    augmentedDevices;

  beforeEach(function() {
    data = loadData('src/test/inputExample.json');
    positions = calcPositions(data);
    augmentedDevices = augmentDevices(data.devices, positions);
  });
  it('works', function test() {
    const composed = gaCompose(augmentedDevices, data.maxPower);
    const schedule = convertEntityToSchedule(composed.entity, augmentedDevices);
    console.log(schedule);
    expect(testAgainstMaxPower(schedule, data)).to.equal(true);
  });
});



