import Genetic from 'genetic-js';

export function getRatesByHour(rates) {
  let ratesByHour = [];
  rates.forEach(rate => {
    if (rate.from < rate.to) {
      for (let hour = rate.from; hour < rate.to; hour++) {
        ratesByHour[hour] = rate.value;
      }
    } else {
      for (let hour = rate.from; hour < 24; hour++) {
        ratesByHour[hour] = rate.value;
      }
      for (let hour = 0; hour < rate.to; hour++) {
        ratesByHour[hour] = rate.value;
      }
    }
  });

  return ratesByHour;
}

export function getAvailablePositions(device) {
  let positions = [];
  if (device.mode) {
    if (device.mode === 'day') {
      for (let i = 7; i <= 21 - device.duration; i++) {
        positions.push(i);
      }
    }
    if (device.mode === 'night') {
      for (let i = 21; i <= 24 - device.duration; i++) {
        positions.push(i);
      }
      for (let i = 0; i <= 7 - device.duration; i++) {
        positions.push(i);
      }
    }
  } else {
    for (let i = 0; i <= 24 - device.duration; i++) {
      positions.push(i);
    }
  }

  return positions;
}

export function calcPositions(data) {
  const ratesByHour = getRatesByHour(data.rates);
  return data.devices.map(device => {
    const availablePositions = getAvailablePositions(device);
    return ratesByHour.map((rate, hour) => {
      let positionCost = 0;
      if (availablePositions.includes(hour))  {
        for (let i = hour; i < hour + device.duration; i++) {
          positionCost += ratesByHour[i] * device.power * 0.001;
        }
      }
      return positionCost;
    });
  })
}

export function augmentDevices(devices, positions) {
  return devices.map((device, index) => {
    const uniqueCostsAsc = positions[index].filter(cost => cost > 0)
                                          .sort((a, b) => a - b)
                                          .reduce((accum, curr) => {
                                            if (!accum.includes(curr)) {
                                              accum.push(curr);
                                            }
                                            return accum;
                                          }, []);
    const costs = [];
    uniqueCostsAsc.forEach(cost => {
      costs.push({
        cost,
        timeslots: []
      })
    });
    positions[index].forEach((cost, timeslot) => {
      if (cost > 0) {
        const costObjIndex = costs.findIndex(costObj => costObj.cost === cost);
        costs[costObjIndex].timeslots.push(timeslot);
      }
    });
    return Object.assign({}, device, { costs });
  });
}

export function testAgainstMaxPower(schedule, data) {
  for (const timeslot in schedule) {
    const usedPower = schedule[timeslot].reduce((accum, deviceID) => {
      return accum + data.devices.find(device => device.id === deviceID).power;
    }, 0);
    if (usedPower > data.maxPower) return false;
  }

  return true;
}

export function composeSchedule(devices) {
  let schedule = {};
  for (let hour = 0; hour < 24; hour++) {
    schedule[hour] = [];
  }
  devices.forEach(device => {
    for (let i = 0; i < device.duration; i++) {
      const timeslot = device.costs[0].timeslots[0] + i;
      schedule[timeslot].push(device.id);
    }
  });

  return schedule;
}

export function convertEntityToSchedule(entity, devices) {
  let schedule = {};
  for (let hour = 0; hour < 24; hour++) {
    schedule[hour] = [];
  }
  devices.forEach((device, index) => {
    for (let i = 0; i < device.duration; i++) {
      const timeslot = entity[index].timeslot + i;
      schedule[timeslot].push(device.id);
    }
  });

  return schedule;
}

export function gaCompose(devices, maxPower) {
  const genetic = Genetic.create();
  genetic.optimize = Genetic.Optimize.Minimize;
  genetic.select1 = Genetic.Select1.Tournament2;
  genetic.select2 = Genetic.Select2.Tournament2;

  function pickRndTimeslot(device) {
    const costsRndIndex = Math.floor(Math.random() * device.costs.length);
    const timeslotsRndIndex = Math.floor(Math.random() * device.costs[costsRndIndex].timeslots.length);
    return device.costs[costsRndIndex].timeslots[timeslotsRndIndex];
  }

  function getMostBusyHourUsage(schedule, devices) {
    const powerByHour = [];
    for (const timeslot in schedule) {
      const usedPower = schedule[timeslot].reduce((accum, deviceID) => {
        return accum + devices.find(device => device.id === deviceID).power;
      }, 0);
      powerByHour.push(usedPower);
    }

    return powerByHour.reduce((max, curr) => curr > max ? curr : max, 0);
  }

  function calcEntityCost(entity, devices) {
    return entity.reduce((accum, curr) => {
      const currDevice = devices.find(device => device.id === curr.id);
      const currCost = currDevice.costs.find(cost => cost.timeslots.includes(curr.timeslot)).cost;
      return accum + currCost;
    }, 0);
  }

  function mutateEntity(entity) {
    const rndDeviceIndex = Math.floor(Math.random() * userData.devices.length);
    const rndDevice = userData.devices[rndDeviceIndex];

    const newTimeslot = userData.pickRndTimeslot(rndDevice);

    entity.splice(rndDeviceIndex, 1, {
      id: rndDevice.id,
      timeslot: newTimeslot
    });

    return entity;
  }

  function seed() {
    const entity = userData.devices.map(device => {
      const rndTimeslot = userData.pickRndTimeslot(device);
      return {
        id: device.id,
        timeslot: rndTimeslot
      };
    });

    return entity;
  }

  genetic.seed = function() {
    return userData.seed();
  };

  genetic.mutate = function(entity) {
    return userData.mutateEntity(entity);
  };

  genetic.crossover = function(mother, father) {
    // two-point crossover
    var len = mother.length;
    var ca = Math.floor(Math.random()*len);
    var cb = Math.floor(Math.random()*len);   
    if (ca > cb) {
      var tmp = cb;
      cb = ca;
      ca = tmp;
    }
      
    var son = father.slice(0,ca).concat(mother.slice(ca, cb)).concat(father.slice(cb));
    var daughter = mother.slice(0,ca).concat(father.slice(ca, cb)).concat(mother.slice(cb));
    
    return [son, daughter];
  };

  genetic.fitness = function(entity) {
    const schedule = userData.convertEntityToSchedule(entity, userData.devices);
    const maxUsage = userData.getMostBusyHourUsage(schedule, userData.devices);
    const entityCost = userData.calcEntityCost(entity, userData.devices);
    const powerDiff = Math.abs(maxUsage - userData.maxPower);
    return entityCost * (powerDiff === 0 ? 1 : powerDiff);
  };

  genetic.generation = function(pop, generation, stats) {
    if (!userData.stats) userData.stats = [];
    userData.stats.push(stats);
    if (userData.stats.length > 100) {
      return !userData.stats.slice(-100).every(statItem => {
        return statItem.maximum === stats.maximum;
      });
    }
    
    return true;
  };

  genetic.notification = function(pop, generation, stats, isFinished) {
    if (isFinished) {
      userData.result = pop[0];
    }

  };

  var config = {
    "iterations": 1000
    , "size": 100
    , "crossover": 0.3
    , "mutation": 0.3
    , "skip": 20
  };

  var userData = {
    devices: devices,
    maxPower: maxPower,
    pickRndTimeslot: pickRndTimeslot,
    convertEntityToSchedule: convertEntityToSchedule,
    getMostBusyHourUsage: getMostBusyHourUsage,
    calcEntityCost: calcEntityCost,
    mutateEntity: mutateEntity,
    seed: seed
  };

  genetic.evolve(config, userData);

  return userData.result;

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