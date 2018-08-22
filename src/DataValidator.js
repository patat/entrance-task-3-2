export default class DataValidator {
  constructor () {
    this._24HOURS = 24;
    this._DAY_HOURS = 14;
    this._DAY_BEGINS = 7;
    this._NIGHT_HOURS = 10;
    this._NIGHT_BEGINS = 21;
  }

  validateRates (rates) {
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

    return validators.filter(validator => {
      return !validator.call(this, rates);
    }).length === 0;
  }

  _haveEachObjProperties (collection, props) {
    return collection.filter(obj => {
      return props.length !== props.filter(prop => obj.hasOwnProperty(prop)).length;
    }).length === 0;
  }

  _haveRatesProperties (rates) {
    return this._haveEachObjProperties(rates, ['from', 'to', 'value']);
  }

  _haveNumericValues (rates) {
    function isNumber (n) {
      return typeof n === 'number' && !isNaN(n) && isFinite(n);
    }

    return rates.filter(rate => {
      return !(isNumber(rate.from) && isNumber(rate.to) && isNumber(rate.value));
    }).length === 0;
  }

  _haveNonNegativeValues (rates) {
    return rates.filter(rate => {
      return rate.from < 0 || rate.to < 0 || rate.value < 0;
    }).length === 0;
  }

  _areFromAndToWithin24Hours (rates) {
    return rates.filter(rate => {
      return rate.from >= 24 || rate.to >= 24;
    }).length === 0;
  }

  _doRatesSpanFor24Hours (rates) {
    return this._24HOURS === rates.reduce((accum, rate) => {
      let rateSpan;
      if (rate.to > rate.from) {
        rateSpan = rate.to - rate.from;
      } else {
        rateSpan = this._24HOURS - rate.from + rate.to;
      }
      accum += rateSpan;
      return accum;
    }, 0);
  }

  _haveRatePeriodsNonZeroLength (rates) {
    return rates.reduce((accum, rate) => {
      return rate.from === rate.to ? accum + 1 : accum;
    }, 0) === 0;
  }

  _doRatesCrossMidnightNoMoreThanOnce (rates) {
    return rates.reduce((accum, rate) => {
      return rate.from < rate.to ? accum : accum + 1;
    }, 0) <= 1;
  }

  _doRatePeriodsNotIntersect (rates) {
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

  validateDevices (devices, maxPower) {
    const validators = [
      this._haveDevicesProperties,
      this._isDeviceId32charHashsum,
      this._isDeviceNameAString,
      this._isDevicePowerPositiveInt,
      this._isDeviceDurationExceed24Hours,
      this._isDayDeviceDurationExceedDayHours,
      this._isNightDeviceDurationExceedNightHours,
      this._isDeviceModeValid
    ];
    const validatorsMaxPower = [
      this._isDevicePowerLessThanMaxPower,
      this._isTotalDevicesPowerNotExceed24HourLimit,
      this._isDayDevicesPowerNotExceedDayPeriodLimit,
      this._isNightDevicesPowerNotExceedNightPeriodLimit
    ];

    const inherentConstraintsSatisfied = validators.filter(validator => {
      return !validator.call(this, devices);
    }).length === 0;

    const maxPowerConstraintsSatisfied = validatorsMaxPower.filter(validator => {
      return !validator.call(this, devices, maxPower);
    }).length === 0;

    return inherentConstraintsSatisfied && maxPowerConstraintsSatisfied;
  }

  _haveDevicesProperties (devices) {
    return this._haveEachObjProperties(devices, [
      'id',
      'name',
      'power',
      'duration'
    ]);
  }

  _isDeviceId32charHashsum (devices) {
    const char32HashsumRegExp = /^[A-F0-9]+$/;
    return devices.length === devices.filter(device => {
      return typeof device.id === 'string' &&
              device.id.length === 32 &&
              char32HashsumRegExp.test(device.id);
    }).length;
  }

  _isDeviceNameAString (devices) {
    return devices.length === devices.filter(device => {
      return typeof device.name === 'string';
    }).length;
  }

  _isDevicePowerPositiveInt (devices) {
    return devices.length === devices.filter(device => {
      return typeof device.power === 'number' &&
              !isNaN(device.power) &&
              device.power > 0 &&
              Math.floor(device.power) === device.power;
    }).length;
  }

  _isDeviceDurationExceed24Hours (devices) {
    const hours = [...Array(this._24HOURS + 1).keys()].slice(1);
    return devices.length === devices.filter(device => {
      return typeof device.duration === 'number' &&
              hours.includes(device.duration);
    }).length;
  }

  _isDayDeviceDurationExceedDayHours (devices) {
    const hours = [...Array(this._DAY_HOURS + 1).keys()].slice(1);
    const dayDevices = devices.filter(device => device.mode === 'day');
    return dayDevices.length === dayDevices.filter(device => {
      return hours.includes(device.duration);
    }).length;
  }

  _isNightDeviceDurationExceedNightHours (devices) {
    const hours = [...Array(this._DAY_BEGINS + 1).keys()].slice(1);
    const nightDevices = devices.filter(device => device.mode === 'night');
    return nightDevices.length === nightDevices.filter(device => {
      return hours.includes(device.duration);
    }).length;
  }

  _isDeviceModeValid (devices) {
    const modes = ['day', 'night'];
    return devices.length === devices.filter(device => {
      return !device.hasOwnProperty('mode') ||
              (typeof device.mode === 'string' &&
                  modes.includes(device.mode));
    }).length;
  }

  _isDevicePowerLessThanMaxPower (devices, maxPower) {
    return devices.length === devices.filter(device => {
      return device.power < maxPower;
    }).length;
  }

  _isTotalDevicesPowerNotExceed24HourLimit (devices, maxPower) {
    return this._24HOURS * maxPower >= devices.reduce((accum, device) => {
      return accum + device.power * device.duration;
    }, 0);
  }

  _isDayDevicesPowerNotExceedDayPeriodLimit (devices, maxPower) {
    return this._DAY_HOURS * maxPower >= devices.filter(device => {
      return device.mode === 'day';
    }).reduce((accum, device) => {
      return accum + device.power * device.duration;
    }, 0);
  }

  _isNightDevicesPowerNotExceedNightPeriodLimit (devices, maxPower) {
    return this._NIGHT_HOURS * maxPower >= devices.filter(device => {
      return device.mode === 'night';
    }).reduce((accum, device) => {
      return accum + device.power * device.duration;
    }, 0);
  }
}
