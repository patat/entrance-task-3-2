import fs from 'fs';

export function loadData(file) {
  return JSON.parse(fs.readFileSync(file));
}

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
    console.log(schedule[timeslot]);
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