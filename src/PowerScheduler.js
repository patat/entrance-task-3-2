import Genetic from 'genetic-js';

export default class PowerScheduler {
  constructor(inputData) {
    this._24HOURS = 24;
    this._DAY_BEGINS = 7;
    this._NIGHT_BEGINS = 21;
    this._DAY_HOURS = [...Array(this._24HOURS).keys()].slice(
      this._DAY_BEGINS,
      this._NIGHT_BEGINS
    );
    this._NIGHT_HOURS = [
      ...[...Array(this._24HOURS).keys()].slice(this._NIGHT_BEGINS, this._24HOURS ),
      ...[...Array(this._24HOURS).keys()].slice(0, this._DAY_BEGINS)
    ];

    this.inputData = inputData;
    this._hourlyRates = this._initRates();
    this._devices = this._initDevices();
    this._totalMinCost = this._initTotalMinCost();
  }

  _initRates() {
    let hourlyRates = [];
    this.inputData.rates.forEach(rate => {
      if (rate.from < rate.to) {
        for (let hour = rate.from; hour < rate.to; hour++) {
          hourlyRates[hour] = rate.value;
        }
      } else {
        for (let hour = rate.from; hour < this._24HOURS; hour++) {
          hourlyRates[hour] = rate.value;
        }
        for (let hour = 0; hour < rate.to; hour++) {
          hourlyRates[hour] = rate.value;
        }
      }
    });

    return hourlyRates;
  }

  _initDevices() {
    return this.inputData.devices.map(inputDevice => {
      const cycleCosts = this._calculateCostForAllowedDeviceCycles(inputDevice);
      // sort cycleCosts in ascending order on cycle beginning hour
      cycleCosts.sort((a, b) => a.cycleBeginning - b.cycleBeginning);
      const cyclesGroupedByCost = cycleCosts.reduce((accum, curr) => {      
        if (!accum.hasOwnProperty(curr.cycleCost)) {
          accum[curr.cycleCost] = [];
        }
        accum[curr.cycleCost].push(curr.cycleBeginning);

        return accum;
      }, {});

      const costsGroupedByCycle = cycleCosts.reduce((accum, curr) => {
        accum[curr.cycleBeginning] = curr.cycleCost;
        return accum;
      }, {});

      return Object.assign({}, inputDevice, { 
        costs: cyclesGroupedByCost,
        cycles: costsGroupedByCycle
      });
    });
  }

  _initTotalMinCost() {
    const minimum = this._devices.reduce((totalMinCost, device) => {
      return totalMinCost + Object.keys(device.costs).reduce((minCost, cost) => {
        return +cost < minCost ? +cost : minCost;
      }, Number.POSITIVE_INFINITY);
    }, 0);

    return parseFloat(minimum.toPrecision(7));
    
  }

  _getAllAllowedDeviceCycleBeginningHours(inputDevice) {
    // return only first cycle beginning for 24-hour running devices
    if (inputDevice.duration === this._24HOURS) {
      return [0];
    }

    // no mode devices can start their cycles anytime
    let allowedDeviceCycleBeginningHours = [...Array(this._24HOURS).keys()];
    // day or night mode devices must finish their cycles
    // before night or day respectively begins
    if (inputDevice.mode) {
      const timeOfDayHours = inputDevice.mode === 'day'
                              ? this._DAY_HOURS 
                              : this._NIGHT_HOURS;
      const allowedDeviceBeginningHoursLength = timeOfDayHours.length - inputDevice.duration + 1;

      allowedDeviceCycleBeginningHours = timeOfDayHours.slice(0, allowedDeviceBeginningHoursLength);
    }

    return allowedDeviceCycleBeginningHours;
  }

  _getHoursInACycle(device, cycle) {
    const allHours = [...Array(this._24HOURS).keys()];
    const cycleEndHour = cycle + device.duration;
    let hoursInACycle = allHours
                        .slice(cycle, cycleEndHour);
    if (cycleEndHour >= this._24HOURS) {
      hoursInACycle = [
        ...allHours.slice(0, cycleEndHour - this._24HOURS),
        ...hoursInACycle
      ];
    }

    return hoursInACycle;
  }

  _calculateCostForAllowedDeviceCycles(inputDevice) {
    const allowedCycleBeginnings = this._getAllAllowedDeviceCycleBeginningHours(inputDevice);
    return allowedCycleBeginnings.map(hour => {
      const hoursInACycle = this._getHoursInACycle(inputDevice, hour);
      const hourRatesInACycle = hoursInACycle.map(hour => this._hourlyRates[hour]);
      const cycleCost = hourRatesInACycle.reduce((accum, rate) => {
        // `rate` per kilowatt-hour * `power` in watt-hours
        return accum + rate * inputDevice.power / 1000;
      }, 0);
      return {
        cycleBeginning: hour,
        // deal with the floating point shenanigans in js
        cycleCost: parseFloat(cycleCost.toPrecision(7))
      };
    });
  }

  _convertCyclesToSchedule(cycles) {
    const emptySchedule = [...Array(this._24HOURS).keys()].reduce((schedule, hour) => {
      schedule[hour] = [];
      return schedule;
    }, {});

    return this._devices.reduce((schedule, device) => {
      const beginningHour = cycles.find(item => item.id === device.id).beginning;
      const hoursInACycle = this._getHoursInACycle(device, beginningHour);
      hoursInACycle.forEach(hour => {
        schedule[hour].push(device.id);
      });

      return schedule;
    }, emptySchedule);
  }

  _calcScheduleMostBusyHourUsage(schedule) {
    const powerByHour = [];
    for (const hour in schedule) {
      const usedPower = schedule[hour].reduce((accum, deviceID) => {
        return accum + this._devices.find(device => device.id === deviceID).power;
      }, 0);
      powerByHour.push(usedPower);
    }

    return powerByHour.reduce((max, curr) => curr > max ? curr : max, 0);
  }

  _testScheduleAgainstMaxPower(schedule) {
    return this._calcScheduleMostBusyHourUsage(schedule) <= this.inputData.maxPower;
  }

  _pickRandomCycle(device) {
    const cycleCosts = Object.keys(device.costs);
    const costsRndIndex = Math.floor(Math.random() * cycleCosts.length);
    const rndCostCycles = device.costs[cycleCosts[costsRndIndex]];
    const cycleRndIndex = Math.floor(Math.random() * rndCostCycles .length);
    return rndCostCycles[cycleRndIndex];
  }

  _calcCyclesCost(cycles) {
    const cyclesCost = cycles.reduce((accum, curr) => {
      // TODO: change initDevices to store devices as hash
      const currDevice = this._devices.find(device => device.id === curr.id);
      const currCost = currDevice.cycles[curr.beginning];
      return accum + currCost;
    }, 0);

    return parseFloat(cyclesCost.toPrecision(7));
  }

  _mutateCycles(cycles) {
    const rndDeviceIndex = Math.floor(Math.random() * this._devices.length);
    const rndDevice = this._devices[rndDeviceIndex];
    const newCycle = this._pickRandomCycle(rndDevice);

    cycles.splice(rndDeviceIndex, 1, {
      id: rndDevice.id,
      beginning: newCycle
    });

    return cycles;
  }

  _seed() {
    const cycles = this._devices.map(device => {
      const rndCycle = this._pickRandomCycle(device);
      return {
        id: device.id,
        beginning: rndCycle
      };
    });

    return cycles;
  }

  _fitness(cycles) {
    const schedule = this._convertCyclesToSchedule(cycles);
    const maxUsage = this._calcScheduleMostBusyHourUsage(schedule);
    const cyclesCost = this._calcCyclesCost(cycles);
    const powerDiff = Math.abs(maxUsage - this.inputData.maxPower);

    return cyclesCost * (this.inputData.maxPower >= maxUsage ? 1 : powerDiff);
  }

  schedule() {
    const genetic = Genetic.create();
    genetic.optimize = Genetic.Optimize.Minimize;
    genetic.select1 = Genetic.Select1.Tournament2;
    genetic.select2 = Genetic.Select2.Tournament2;

    genetic.seed = function() {
     return userData.this._seed.call(userData.this);
    }

    genetic.mutate = function(cycles) {
      return userData.this._mutateCycles.call(userData.this, cycles);
    } 

    genetic.crossover = function(mother, father) {
      // two-point crossover
      const len = mother.length;
      let ca = Math.floor(Math.random()*len);
      let cb = Math.floor(Math.random()*len);   
      if (ca > cb) {
        let tmp = cb;
        cb = ca;
        ca = tmp;
      }
        
      const son = father.slice(0, ca)
          .concat(mother.slice(ca, cb))
          .concat(father.slice(cb));

      const daughter = mother.slice(0, ca)
          .concat(father.slice(ca, cb))
          .concat(mother.slice(cb));
      
      return [son, daughter];
    };

    genetic.fitness = function(cycles) {
      return userData.this._fitness.call(userData.this, cycles);
    }

    genetic.generation = function(pop, generation, stats) {
      // if (!userData.stats) userData.stats = [];
      // userData.stats.push(stats);
      // if (userData.stats.length > 100) {
      //   return !userData.stats.slice(-100).every(statItem => {
      //     return statItem.maximum === stats.maximum;
      //   });
      // }

      if (stats.maximum === userData.this._totalMinCost) {
        return false;
      }
      
      return true;
    };

    genetic.notification = function(pop, generation, stats, isFinished) {
      //console.log(stats);
      if (isFinished) {
        userData.result = pop[0];
      }
    };

    const config = {
      "iterations": 500
      , "size": 20
      , "crossover": 0.3
      , "mutation": 0.5
      , "skip": 20
    };

    const userData = {
      this: this
    };

    genetic.evolve(config, userData);

    return this._convertCyclesToSchedule(userData.result.entity);
  }
}