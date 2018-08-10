export default class DataValidator {
  constructor() {
    this._24HOURS = 24;
  }

  validateRates(rates) {
    const validators = [
      this._haveRatesProperties,
      this._haveNumericValues,
      this._haveNonNegativeValues,
      this._areFromAndToWithin24Hours,
      this._doRatesSpanFor24Hours,
      this._haveRatePeriodsNonZeroLength,
      this._doRatesCrossMidnightNoMoreThanOnce,
      this._doRatePeriodsNotIntersect
    ];

    return 0 === validators.filter(validator => {
      return !validator.call(this, rates);
    }).length;
  }

  _haveEachObjProperties(collection, props) {
    return 0 === collection.filter(obj => {
      return props.length !== props.filter(prop => obj.hasOwnProperty(prop)).length;
    }).length;
  }

  _haveRatesProperties(rates) {
    return this._haveEachObjProperties(rates, ['from', 'to', 'value']);
  }

  _haveNumericValues(rates) {
    function isNumber(n) {
      return typeof n === 'number' && !isNaN(n) && isFinite(n);
    }

    return 0 === rates.filter(rate => {
      return !(isNumber(rate.from) && isNumber(rate.to) && isNumber(rate.value));
    }).length;
  }

  _haveNonNegativeValues(rates) {
    return 0 === rates.filter(rate => {
      return rate.from < 0 || rate.to < 0 || rate.value < 0;
    }).length;
  }

  _areFromAndToWithin24Hours(rates) {
    return 0 === rates.filter(rate => {
      return rate.from >= 24 || rate.to >= 24;
    }).length;
  }

  _doRatesSpanFor24Hours(rates) {
    return this._24HOURS === rates.reduce((accum, rate) => {
      let rateSpan;
      if (rate.to > rate.from) {
        rateSpan = rate.to - rate.from;
      } else {
        rateSpan = this._24HOURS - rate.from + rate.to;
      }
      return accum += rateSpan;
    }, 0);
  }

  _haveRatePeriodsNonZeroLength(rates) {
    return 0 === rates.reduce((accum, rate) => {
      return rate.from === rate.to ? accum + 1 : accum;
    }, 0);
  }

  _doRatesCrossMidnightNoMoreThanOnce(rates) {
    return 1 >= rates.reduce((accum, rate) => {
      return rate.from < rate.to ? accum : accum + 1;
    }, 0);
  }

  _doRatePeriodsNotIntersect(rates) {
    let unique = {};
    for (const rate of rates) {
      if (rate.from < rate.to) {
        for (let i = rate.from; i < rate.to; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;
        }
      } else {
        for (let i = rate.from; i < this._24HOURS; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;
        }
        for (let i = 0; i < rate.to; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;          
        }
      }
    }

    return true;
  }

  validateDevices(devices, maxPower) {
    const validators = [
      this._haveDevicesProperties,
      this._isDeviceId32charHashsum,
      this._isDeviceNameAString,
      this._isDevicePowerPositiveInt,
      this._isDeviceDurationNumOfHoursInADay,
      this._isDeviceModeValid
    ];
    const validatorsMaxPower = [
      this._isDevicePowerLessThanMaxPower,
      this._isTotalDevicesPowerNotExceed24HourLimit
    ];

    const inherentConstraintsSatisfied = 0 === validators.filter(validator => {
      return !validator.call(this, devices);
    }).length

    const maxPowerConstraintsSatisfied = 0 === validatorsMaxPower.filter(validator => {
      return !validator.call(this, devices, maxPower);
    }).length;

    return inherentConstraintsSatisfied && maxPowerConstraintsSatisfied;
  };

  _haveDevicesProperties(devices) {
    return this._haveEachObjProperties(devices, [
      'id',
      'name',
      'power',
      'duration'
    ]);
  }

  _isDeviceId32charHashsum(devices) {
    const char32HashsumRegExp = /^[A-F0-9]+$/;
    return devices.length === devices.filter(device => {
      return typeof device.id === 'string' 
              && device.id.length === 32 
              && char32HashsumRegExp.test(device.id);
    }).length;
  }

  _isDeviceNameAString(devices) {
    return devices.length === devices.filter(device => {
      return typeof device.name === 'string';
    }).length;
  }

  _isDevicePowerPositiveInt(devices) {
    return devices.length === devices.filter(device => {
      return typeof device.power === 'number'
              && !isNaN(device.power)
              && device.power > 0
              && Math.floor(device.power) === device.power;
    }).length;
  }

  _isDeviceDurationNumOfHoursInADay(devices) {
    const hours = [...Array(25).keys()].slice(1);
    return devices.length === devices.filter(device => {
      return typeof device.duration === 'number'
              && hours.includes(device.duration);
    }).length;
  }

  _isDeviceModeValid(devices) {
    const modes = ['day', 'night'];
    return devices.length === devices.filter(device => {
      return !device.hasOwnProperty('mode')
              || (typeof device.mode === 'string'
                  && modes.includes(device.mode));
    }).length;
  }

  _isDevicePowerLessThanMaxPower(devices, maxPower) {
    return devices.length === devices.filter(device => {
      return device.power < maxPower;
    }).length;
  }

  _isTotalDevicesPowerNotExceed24HourLimit(devices, maxPower) {
    return this._24HOURS * maxPower >= devices.reduce((accum, device) => {
      return accum + device.power * device.duration;
    }, 0);
  }
}