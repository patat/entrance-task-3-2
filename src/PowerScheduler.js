import Genetic from 'genetic-js';

export default class PowerScheduler {
  constructor (inputData) {
    this._24HOURS = 24;
    this._DAY_BEGINS = 7;
    this._NIGHT_BEGINS = 21;
    this._DAY_HOURS = [...Array(this._24HOURS).keys()].slice(
      this._DAY_BEGINS,
      this._NIGHT_BEGINS
    );
    this._NIGHT_HOURS = [
      ...[...Array(this._24HOURS).keys()].slice(this._NIGHT_BEGINS, this._24HOURS),
      ...[...Array(this._24HOURS).keys()].slice(0, this._DAY_BEGINS)
    ];

    this.inputData = inputData;
    this._hourlyRates = this._initRates();
    this._devices = this._initDevices();
    this._totalMinCost = this._initTotalMinCost();
    this._totalMaxCost = this._initTotalMaxCost();
  }

  _initRates () {
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

  _initDevices () {
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

  _initTotalMinCost () {
    const minimum = this._devices.reduce((totalMinCost, device) => {
      return totalMinCost + Object.keys(device.costs).reduce((minCost, cost) => {
        return +cost < minCost ? +cost : minCost;
      }, Number.POSITIVE_INFINITY);
    }, 0);

    return parseFloat(minimum.toPrecision(7));
  }

  _initTotalMaxCost () {
    const maximum = this._devices.reduce((totalMaxCost, device) => {
      return totalMaxCost + Object.keys(device.costs).reduce((maxCost, cost) => {
        return +cost > maxCost ? +cost : maxCost;
      }, 0);
    }, 0);

    return parseFloat(maximum.toPrecision(7));
  }

  _getAllAllowedDeviceCycleBeginningHours (inputDevice) {
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

  _getHoursInACycle (device, cycle) {
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

  _calculateCostForAllowedDeviceCycles (inputDevice) {
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

  _convertCyclesToSchedule (cycles) {
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

  _calcScheduleMostBusyHourUsage (schedule) {
    const powerByHour = [];

    for (const hour in schedule) {
      const usedPower = schedule[hour].reduce((accum, deviceID) => {
        return accum + this._devices.find(device => device.id === deviceID).power;
      }, 0);
      powerByHour.push(usedPower);
    }

    return powerByHour.reduce((max, curr) => curr > max ? curr : max, 0);
  }

  _testScheduleAgainstMaxPower (schedule) {
    return this._calcScheduleMostBusyHourUsage(schedule) <= this.inputData.maxPower;
  }

  _pickRandomCycle (device) {
    const deviceCycles = Object.keys(device.cycles);
    const cyclesRndIndex = Math.floor(Math.random() * deviceCycles.length);
    const rndCycle = +deviceCycles[cyclesRndIndex];

    return rndCycle;
  }

  _calcCyclesCost (cycles) {
    const cyclesCost = cycles.reduce((accum, curr) => {
      // TODO: change initDevices to store devices as hash
      const currDevice = this._devices.find(device => device.id === curr.id);
      const currCost = currDevice.cycles[curr.beginning];
      return accum + currCost;
    }, 0);

    return parseFloat(cyclesCost.toPrecision(7));
  }

  _mutateCycles (cycles) {
    const rndDeviceIndex = Math.floor(Math.random() * this._devices.length);
    const rndDevice = this._devices[rndDeviceIndex];
    const newCycle = this._pickRandomCycle(rndDevice);

    cycles.splice(rndDeviceIndex, 1, {
      id: rndDevice.id,
      beginning: newCycle
    });

    return cycles;
  }

  _seed () {
    const cycles = this._devices.map(device => {
      const rndCycle = this._pickRandomCycle(device);
      return {
        id: device.id,
        beginning: rndCycle
      };
    });

    return cycles;
  }

  _fitness (cycles) {
    const schedule = this._convertCyclesToSchedule(cycles);
    const maxUsage = this._calcScheduleMostBusyHourUsage(schedule);
    const cyclesCost = this._calcCyclesCost(cycles);
    const powerDiff = Math.abs(maxUsage - this.inputData.maxPower);

    return cyclesCost * (this.inputData.maxPower >= maxUsage ? 1 : powerDiff);
  }

  schedule () {
    const genetic = Genetic.create();
    genetic.optimize = Genetic.Optimize.Minimize;
    genetic.select1 = Genetic.Select1.Tournament2;
    genetic.select2 = Genetic.Select2.Tournament2;

    genetic.seed = function () {
      // eslint-disable-next-line
      return userData.this._seed.call(userData.this);
    };

    genetic.mutate = function (cycles) {
      // eslint-disable-next-line
      return userData.this._mutateCycles.call(userData.this, cycles);
    };

    genetic.crossover = function (mother, father) {
      // two-point crossover
      const len = mother.length;
      let ca = Math.floor(Math.random() * len);
      let cb = Math.floor(Math.random() * len);
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

    genetic.fitness = function (cycles) {
      // eslint-disable-next-line
      return userData.this._fitness.call(userData.this, cycles);
    };

    genetic.generation = function (pop, generation, stats) {
      if (generation % 1000 === 0 && stats.maximum <= userData.maxCost + 1) {
        if (stats.maximum === userData.maxCost) {
          userData.milleniumCnt = userData.milleniumCnt !== undefined ? userData.milleniumCnt + 1 : 0;
        }
        userData.maxCost = stats.maximum;
        if (userData.milleniumCnt === 3) {
          return false;
        }
      }
      if (stats.maximum === userData.this._totalMinCost) {
        return false;
      }

      return true;
    };

    genetic.notification = function (pop, generation, stats, isFinished) {
      if (generation % 1000 === 0) {
        //console.log(userData.milleniumCnt);
      }
      if (isFinished) {
        userData.result = pop[0];
      }
    };

    const config = {
      'iterations': 20000,
      'size': 200,
      'crossover': 0.3,
      'mutation': 0.5,
      'skip': 20
    };

    const userData = {
      this: this,
      maxCost: this._totalMaxCost
    };

    genetic.evolve(config, userData);

    return {
      schedule: this._convertCyclesToSchedule(userData.result.entity),
      consumedEnergy: {
        value: userData.result.fitness || 0,
        devices: this._getDevicesCost(userData.result.entity)
      }
    };
  }

  _combineArrays (arrays) {
    return arrays.reduce((progress, nextStep) => {
      return progress.reduce((buffer, progressValue) => {
        return [
          ...buffer,
          ...nextStep.map(nextStepCycle => {
            return [].concat(progressValue, nextStepCycle);
          })
        ];
      }, []);
    });
  }

  bruteForce () {
    const allCycles = this._devices.map(device => {
      return Object.keys(device.cycles).sort((a, b) => a - b);
    });

    const combinations = this._combineArrays(allCycles);

    const totalCosts = [];
    combinations.forEach(cycles => {
      const acycles = cycles.map((cycle, index) => {
        return {
          id: this._devices[index].id,
          beginning: +cycle
        };
      });
      totalCosts.push({
        cycles: acycles,
        cost: this._calcCyclesCost(acycles)
      });
    });

    totalCosts.sort((a, b) => {
      return a.cost - b.cost;
    });
    let schedule;
    let totalCost = {};
    for (let i = 0; i < totalCosts.length; i++) {
      schedule = this._convertCyclesToSchedule(totalCosts[i].cycles);
      if (this._testScheduleAgainstMaxPower(schedule)) {
        totalCost = totalCosts[i];
        break;
      }
    }

    return {
      schedule,
      'consumedEnergy': {
        'value': totalCost.cost || 0
      }
    };
  }

  bruteForce2 () {
    let minCost = this._totalMaxCost;
    let minCostDevicesWereTurnedOnAt;
    // let leafCnt = 0;
    const allDeviceIndices = [...Array(this._devices.length).keys()];

    function x (hour, turnedOnDevices, workingDevices, devicesWereTurnedOnAt, devicesNextDayOverlap) {
      const maxNumDeviceCombinationsPerHour = (1 << this._devices.length);

      if (turnedOnDevices === maxNumDeviceCombinationsPerHour - 1) {
        const cycles = this._devices.map((device, deviceIndex) => {
          return {
            id: device.id,
            beginning: devicesWereTurnedOnAt[deviceIndex]
          };
        });
        const cost = this._calcCyclesCost(cycles);
        if (cost < minCost) {
          minCost = cost;
          minCostDevicesWereTurnedOnAt = cycles;
        }
        return;
      }
      if (hour === this._24HOURS) {
        return;
      }

      for (let i = 0; i < maxNumDeviceCombinationsPerHour; i++) {
        const devicesFromThisSetWasntAlreadyOn = ((turnedOnDevices & i) === 0);

        if (devicesFromThisSetWasntAlreadyOn) {
          const newDeviceIndices = allDeviceIndices.filter(deviceIndex => {
            const currIndexBin = (1 << deviceIndex);
            return (currIndexBin & i) === currIndexBin;
          });

          let currDevicesCanBeTurnedOn = true;
          let checkForNextDayOverlapUsage = [];
          let currDevicesThisHourUsage = 0;
          for (const deviceIndex of newDeviceIndices) {
            const currDevice = this._devices[deviceIndex];
            if (!currDevice.cycles.hasOwnProperty(hour)) {
              currDevicesCanBeTurnedOn = false;
            }

            if (currDevicesCanBeTurnedOn) {
              currDevicesThisHourUsage += currDevice.power;
              const currDeviceCycleEndsAt = hour + currDevice.duration;

              if (currDeviceCycleEndsAt > this._24HOURS) {
                checkForNextDayOverlapUsage.push({
                  index: deviceIndex,
                  power: currDevice.power,
                  depth: currDeviceCycleEndsAt - this._24HOURS
                });
              }
            } else {
              break;
            }
          }

          if (!currDevicesCanBeTurnedOn) continue;

          const thisHourPowerUsage = workingDevices.map((durationLeft, deviceIndex) => {
            return durationLeft > 0 ? this._devices[deviceIndex].power : 0;
          }).reduce((accum, power) => {
            return accum + power;
          }) + currDevicesThisHourUsage;

          if (thisHourPowerUsage > this.inputData.maxPower) continue;

          if (checkForNextDayOverlapUsage.length > 0) {
            const maxOverlapDepth = checkForNextDayOverlapUsage.reduce((accum, usageData) => {
              return Math.max(usageData.depth, accum);
            }, 0);

            let isNextDayOverlapOk = true;
            for (let nextDayHour = 0; nextDayHour < maxOverlapDepth; nextDayHour++) {
              const previousDevicesUsage = devicesWereTurnedOnAt.map((turnOnHour, deviceIndex) => {
                const currPreviousDevice = this._devices[deviceIndex];
                const currPreviousDeviceLastActiveHour = turnOnHour + currPreviousDevice.duration - 1;

                if (turnOnHour !== false && nextDayHour >= turnOnHour && nextDayHour <= currPreviousDeviceLastActiveHour) {
                  return currPreviousDevice.power;
                }
                return 0;
              }).reduce((accum, power) => {
                return accum + power;
              }, 0);

              const prevDevicesOverlapUsage = devicesNextDayOverlap.reduce((accum, usageData) => {
                return accum + (usageData.depth && nextDayHour < usageData.depth ? usageData.power : 0);
              }, 0);

              const currDevicesOverlapUsage = checkForNextDayOverlapUsage.reduce((accum, usageData) => {
                return accum + (nextDayHour < usageData.depth ? usageData.power : 0);
              }, 0);

              const totalOverlapUsage = previousDevicesUsage + currDevicesOverlapUsage + prevDevicesOverlapUsage;
              if (totalOverlapUsage > this.inputData.maxPower) {
                isNextDayOverlapOk = false;
                break;
              }
            }
            if (!isNextDayOverlapOk) continue;
          }

          // Seems like chosen set of devices can be turned on after all :)
          // Time to prepare arguments for the next call
          const nextHour = hour + 1;
          const nextHourTurnedOnDevices = i | turnedOnDevices;

          const thisHourWorkingDevices = workingDevices.slice();
          const nextDevicesWereTurnedOnAt = devicesWereTurnedOnAt.slice();
          for (const newDeviceIndex of newDeviceIndices) {
            thisHourWorkingDevices[newDeviceIndex] = this._devices[newDeviceIndex].duration;
            nextDevicesWereTurnedOnAt[newDeviceIndex] = hour;
          }

          const nextHourWorkingDevices = thisHourWorkingDevices.map(durationLeft => {
            return durationLeft > 0 ? durationLeft - 1 : 0;
          });

          const nextDevicesNextDayOverlap = devicesNextDayOverlap.map((overlapData, deviceIndex) => {
            const newOverlapData = checkForNextDayOverlapUsage.find(newOverlapData => {
              return newOverlapData.index === deviceIndex;
            });

            return newOverlapData || overlapData;
          });

          x.call(this,
            nextHour,
            nextHourTurnedOnDevices,
            nextHourWorkingDevices,
            nextDevicesWereTurnedOnAt,
            nextDevicesNextDayOverlap
          );
        }
      }
    }

    const initialWorkingDevices = this._devices.map(device => 0);

    x.call(
      this,
      0,
      0,
      initialWorkingDevices,
      [...Array(this._devices.length).keys()].map(item => { return false; }),
      [...Array(this._devices.length).keys()].map(item => { return {}; })
    );

    if (!minCostDevicesWereTurnedOnAt) return false;

    return {
      schedule: this._convertCyclesToSchedule(minCostDevicesWereTurnedOnAt),
      consumedEnergy: {
        value: minCost || 0,
        devices: this._getDevicesCost(minCostDevicesWereTurnedOnAt)
      }
    };
  }

  _getDevicesCost (cycles) {
    return cycles.reduce((accum, deviceCycle) => {
      accum[deviceCycle.id] = this._devices.find(device => {
        return device.id === deviceCycle.id;
      }).cycles[deviceCycle.beginning];

      return accum;
    }, {});
  }
}
