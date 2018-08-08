'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadData = loadData;
exports.getRatesByHour = getRatesByHour;
exports.getAvailablePositions = getAvailablePositions;
exports.calcPositions = calcPositions;
exports.augmentDevices = augmentDevices;
exports.testAgainstMaxPower = testAgainstMaxPower;
exports.composeSchedule = composeSchedule;
exports.gaCompose = gaCompose;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _geneticJs = require('genetic-js');

var _geneticJs2 = _interopRequireDefault(_geneticJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function loadData(file) {
  return JSON.parse(_fs2.default.readFileSync(file));
}

function getRatesByHour(rates) {
  var ratesByHour = [];
  rates.forEach(function (rate) {
    if (rate.from < rate.to) {
      for (var hour = rate.from; hour < rate.to; hour++) {
        ratesByHour[hour] = rate.value;
      }
    } else {
      for (var _hour = rate.from; _hour < 24; _hour++) {
        ratesByHour[_hour] = rate.value;
      }
      for (var _hour2 = 0; _hour2 < rate.to; _hour2++) {
        ratesByHour[_hour2] = rate.value;
      }
    }
  });

  return ratesByHour;
}

function getAvailablePositions(device) {
  var positions = [];
  if (device.mode) {
    if (device.mode === 'day') {
      for (var i = 7; i <= 21 - device.duration; i++) {
        positions.push(i);
      }
    }
    if (device.mode === 'night') {
      for (var _i = 21; _i <= 24 - device.duration; _i++) {
        positions.push(_i);
      }
      for (var _i2 = 0; _i2 <= 7 - device.duration; _i2++) {
        positions.push(_i2);
      }
    }
  } else {
    for (var _i3 = 0; _i3 <= 24 - device.duration; _i3++) {
      positions.push(_i3);
    }
  }

  return positions;
}

function calcPositions(data) {
  var ratesByHour = getRatesByHour(data.rates);
  return data.devices.map(function (device) {
    var availablePositions = getAvailablePositions(device);
    return ratesByHour.map(function (rate, hour) {
      var positionCost = 0;
      if (availablePositions.includes(hour)) {
        for (var i = hour; i < hour + device.duration; i++) {
          positionCost += ratesByHour[i] * device.power * 0.001;
        }
      }
      return positionCost;
    });
  });
}

function augmentDevices(devices, positions) {
  return devices.map(function (device, index) {
    var uniqueCostsAsc = positions[index].filter(function (cost) {
      return cost > 0;
    }).sort(function (a, b) {
      return a - b;
    }).reduce(function (accum, curr) {
      if (!accum.includes(curr)) {
        accum.push(curr);
      }
      return accum;
    }, []);
    var costs = [];
    uniqueCostsAsc.forEach(function (cost) {
      costs.push({
        cost: cost,
        timeslots: []
      });
    });
    positions[index].forEach(function (cost, timeslot) {
      if (cost > 0) {
        var costObjIndex = costs.findIndex(function (costObj) {
          return costObj.cost === cost;
        });
        costs[costObjIndex].timeslots.push(timeslot);
      }
    });
    return Object.assign({}, device, { costs: costs });
  });
}

function testAgainstMaxPower(schedule, data) {
  for (var timeslot in schedule) {
    var usedPower = schedule[timeslot].reduce(function (accum, deviceID) {
      return accum + data.devices.find(function (device) {
        return device.id === deviceID;
      }).power;
    }, 0);
    if (usedPower > data.maxPower) return false;
  }

  return true;
}

function composeSchedule(devices) {
  var schedule = {};
  for (var hour = 0; hour < 24; hour++) {
    schedule[hour] = [];
  }
  devices.forEach(function (device) {
    for (var i = 0; i < device.duration; i++) {
      var timeslot = device.costs[0].timeslots[0] + i;
      schedule[timeslot].push(device.id);
    }
  });

  return schedule;
}

function gaCompose(devices, maxPower) {
  var genetic = _geneticJs2.default.create();
  genetic.optimize = _geneticJs2.default.Optimize.Minimize;
  genetic.select1 = _geneticJs2.default.Select1.Tournament2;
  genetic.select2 = _geneticJs2.default.Select2.Tournament2;

  function pickRndTimeslot(device) {
    var costsRndIndex = Math.floor(Math.random() * device.costs.length);
    var timeslotsRndIndex = Math.floor(Math.random() * device.costs[costsRndIndex].timeslots.length);
    return device.costs[costsRndIndex].timeslots[timeslotsRndIndex];
  }

  function getMostBusyHourUsage(schedule, devices) {
    var powerByHour = [];
    for (var timeslot in schedule) {
      var usedPower = schedule[timeslot].reduce(function (accum, deviceID) {
        return accum + devices.find(function (device) {
          return device.id === deviceID;
        }).power;
      }, 0);
      powerByHour.push(usedPower);
    }

    return powerByHour.reduce(function (max, curr) {
      return curr > max ? curr : max;
    }, 0);
  }

  function convertEntityToSchedule(entity, devices) {
    var schedule = {};
    for (var hour = 0; hour < 24; hour++) {
      schedule[hour] = [];
    }
    devices.forEach(function (device, index) {
      for (var i = 0; i < device.duration; i++) {
        var timeslot = entity[index].timeslot + i;
        schedule[timeslot].push(device.id);
      }
    });

    return schedule;
  }

  function calcEntityCost(entity, devices) {
    return entity.reduce(function (accum, curr) {
      var currDevice = devices.find(function (device) {
        return device.id === curr.id;
      });
      var currCost = currDevice.costs.find(function (cost) {
        return cost.timeslots.includes(curr.timeslot);
      }).cost;
      return accum + currCost;
    }, 0);
  }

  genetic.seed = function () {
    return userData.devices.map(function (device) {
      var rndTimeslot = userData.pickRndTimeslot(device);
      return {
        id: device.id,
        timeslot: rndTimeslot
      };
    });
  };

  genetic.mutate = function (entity) {
    var rndDeviceIndex = Math.floor(Math.random() * userData.devices.length);
    var rndDevice = userData.devices[rndDeviceIndex];

    var newTimeslot = userData.pickRndTimeslot(rndDevice);
    var newEntity = entity.slice(0, rndDeviceIndex).concat([{
      id: rndDevice.id,
      timeslot: newTimeslot
    }]).concat(entity.slice(rndDeviceIndex));

    return newEntity;
  };

  genetic.crossover = function (mother, father) {
    // two-point crossover
    var len = mother.length;
    var ca = Math.floor(Math.random() * len);
    var cb = Math.floor(Math.random() * len);
    if (ca > cb) {
      var tmp = cb;
      cb = ca;
      ca = tmp;
    }

    var son = father.slice(0, ca).concat(mother.slice(ca, cb - ca)).concat(father.slice(cb));
    var daughter = mother.slice(0, ca).concat(father.slice(ca, cb - ca)).concat(mother.slice(cb));

    return [son, daughter];
  };

  genetic.fitness = function (entity) {
    var schedule = userData.convertEntityToSchedule(entity, userData.devices);
    var maxUsage = userData.getMostBusyHourUsage(schedule, userData.devices);
    var entityCost = userData.calcEntityCost(entity, userData.devices);
    //console.log(entityCost * Math.abs(maxUsage - userData.maxPower));
    //console.log(maxUsage);
    return entityCost * Math.abs(maxUsage - userData.maxPower);
  };

  genetic.generation = function (pop, generation, stats) {
    // stop running once we've reached the solution
    return true;
  };

  genetic.notification = function (pop, generation, stats, isFinished) {

    console.log(pop[0]);
  };

  var config = {
    "iterations": 4000,
    "size": 250,
    "crossover": 0.3,
    "mutation": 0.3,
    "skip": 20
  };

  var userData = {
    devices: devices,
    maxPower: maxPower,
    pickRndTimeslot: pickRndTimeslot,
    convertEntityToSchedule: convertEntityToSchedule,
    getMostBusyHourUsage: getMostBusyHourUsage,
    calcEntityCost: calcEntityCost
  };

  genetic.evolve(config, userData);

  // const entity = [ { id: 'F972B82BA56A70CC579945773B6866FB', timeslot: 21 },
  //   { id: 'C515D887EDBBE669B2FDAC62F571E9E9', timeslot: 9 },
  //   { id: '02DDD23A85DADDD71198305330CC386D', timeslot: 0 },
  //   { id: '1E6276CC231716FE8EE8BC908486D41E', timeslot: 0 },
  //   { id: '7D9DC84AD110500D284B33C82FE6E85E', timeslot: 2 } ];
  // return calcEntityCost(entity, devices);

  // const mother = genetic.seed();
  // const father = genetic.seed();
  // return genetic.crossover(mother, father);

  // const entity = [ { id: 'F972B82BA56A70CC579945773B6866FB', timeslot: 21 },
  //   { id: 'C515D887EDBBE669B2FDAC62F571E9E9', timeslot: 9 },
  //   { id: '02DDD23A85DADDD71198305330CC386D', timeslot: 0 },
  //   { id: '1E6276CC231716FE8EE8BC908486D41E', timeslot: 0 },
  //   { id: '7D9DC84AD110500D284B33C82FE6E85E', timeslot: 2 } ];
  // const schedule = userData.convertEntityToSchedule(entity, userData.devices);
  // return getMostBusyHourUsage(schedule, devices);
}