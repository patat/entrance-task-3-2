import merge from 'deepmerge';
import fs from 'fs';
import md5 from 'md5';

export default class TestDataGenerator {
  constructor(config = {}) {
    const defaultConfig = {
      rates: {
        periods: 5,
        priceInterval: [1, 7]
      },
      devices: {
        quantity: 5,
        powerStep: 50
      },
      maxPower: 2100
    };

    this._24HOURS = 24;
    this._DAY_BEGINS = 7;
    this._DAY_HOURS = 14;
    this._NIGHT_BEGINS = 21;
    this._NIGHT_HOURS = 10;

    this._config = merge(defaultConfig, config);
    this._powerClassEnum = ['low', 'medium', 'high'];
    this._modesEnum = ['day', 'night'];
    this._durationClassEnum = ['short', 'moderate', 'long'];

    if (this._config.maxPower % this._config.devices.powerStep !== 0) {
      throw new Error('invalid config: maxPower should be a multiple of devices.powerStep');
    }
  }

  generate() {
    return {
      devices: this.generateDevices(),
      rates: this.generateRates(),
      maxPower: this._config.maxPower
    };
  }

  generateRates() {
    let valueMin, valueMax;
    [valueMin, valueMax] = this._config.rates.priceInterval;
    const ratePeriodLengths = this._generateNrndsWithSumM(this._config.rates.periods, this._24HOURS);
    const cycleBias = this._randomInt(0, this._24HOURS);
    let currPeriodFrom = cycleBias;
    return ratePeriodLengths.map(PeriodLength => {
      let currPeriodTo = currPeriodFrom + PeriodLength;
      if (currPeriodTo >= this._24HOURS ) {
        currPeriodTo -= this._24HOURS;
      }

      const period = {
        from: currPeriodFrom,
        to: currPeriodTo,
        value: this._randomFloat2(valueMin, valueMax)   
      }

      currPeriodFrom = currPeriodTo;

      return period;
    });
    
  }

  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  _randomFloat2(min, max) {
    return +(Math.random() * (max - min) + min).toFixed(2);
  }

  _randomIntExcept(min, max, exceptions = []) {
    const rnd = this._randomInt(min, max);
    if (exceptions.includes(rnd)) {
      return this._randomIntExcept(min, max, exceptions);
    } else {
      return rnd;
    }
  }

  _generateNrndsWithSumM(n, m) {
    const numbers = [0];
    for (let i = 1; i < n; i++) {
      numbers.push(this._randomIntExcept(0, m, numbers));
    }
    numbers.push(m);
    numbers.sort((a, b) => a - b);

    return numbers.map((number, index) => index === 0 ? 0 : number - numbers[index - 1]).slice(1);
  }

  generateDevices() {
    const quantityRange = [...Array(this._config.devices.quantity).keys()];

    const powerClasses = quantityRange.map(index => {
      // ~ 2-1-1 medium-low-high
      if (index < quantityRange.length / 4) {
        return this._powerClassEnum[0];
      }
      if (index > 3 * quantityRange.length / 4) {
        return this._powerClassEnum[2];
      }

      return this._powerClassEnum[1];
    });

    const durationClasses = quantityRange.map(index => {
      // ~ 2-1-1 moderate-short-long
      if (index < quantityRange.length / 4) {
        return this._durationClassEnum[0];
      }
      if (index > 3 * quantityRange.length / 4) {
        return this._durationClassEnum[2];
      }

      return this._durationClassEnum[1];
    });

    return quantityRange.map(index => {
      const mode = this._generateDeviceMode();
      let device = {
        "id": this._generateDeviceId(index),
        "name": this._generateDeviceName(),
        "power": this._generateDevicePower('medium'),
        "duration": this._generateDeviceDuration('short', mode)
      };
      
      if (mode) {
        device.mode = mode;
      }

      return device;
    });
  }

  _generateDeviceId(index) {
    return md5(Date.now() + index * 999999).toUpperCase();
  }

  _generateDeviceName() {
    const names = [
      "Посудомоечная машина",
      "Стиральная машина",
      "Wi-Fi роутер",
      "Духовка",
      "Микроволновка",
      "Кондиционер",
      "Лампа",
      "Термостат",
      "Холодильник",
      "Полотенцесушитель",
      "Сигнализация",
      "Пылесос",
      "Стереосистема",
      "Джакузи",
      "Минибар",
      "Тёплый пол",
      "Телевизор"
    ];
    return names[this._randomInt(0, names.length)];
  }

  _generateDeviceMode() {
    const choice = this._randomInt(0, 3);
    return this._modesEnum[choice];
  }

  _generateDevicePower(powerClass) {
    const maxPowerInSteps = this._config.maxPower / this._config.devices.powerStep;
    let lowerBound,
        upperBound;

    switch(powerClass) {
      case 'low': {
        lowerBound = 1;
        upperBound = Math.floor(maxPowerInSteps / 3);
        break;
      }
      case 'medium': {
        lowerBound = Math.ceil(maxPowerInSteps / 3);
        upperBound = Math.floor(2 * maxPowerInSteps / 3);
        break;
      }
      case 'high': {
        lowerBound = Math.ceil(2 * maxPowerInSteps / 3);
        upperBound = maxPowerInSteps;
        break;
      }
    }

    return this._randomInt(lowerBound, upperBound) * this._config.devices.powerStep;
  }

  _generateDeviceDuration(durationClass, mode) {
    let shortestDuration,
        longestDuration;

    switch(durationClass) {
      case 'short': {
        shortestDuration = 1;
        longestDuration = Math.ceil(this._24HOURS / 3);
        if (mode === 'day') {
          longestDuration = Math.ceil(this._DAY_HOURS / 3);
        }
        if (mode === 'night') {
          longestDuration = Math.ceil(this._DAY_BEGINS / 3);
        }
        break;
      }
      case 'moderate': {
        shortestDuration = Math.ceil(this._24HOURS / 3);
        longestDuration = Math.ceil(2 * this._24HOURS / 3);
        if (mode === 'day') {
          shortestDuration = Math.ceil(this._DAY_HOURS / 3);
          longestDuration = Math.ceil(2 * this._DAY_HOURS / 3);
        }
        if (mode === 'night') {
          shortestDuration = Math.ceil(this._DAY_BEGINS / 3);
          longestDuration = Math.ceil(2 * this._DAY_BEGINS / 3);
        }
        break;
      }
      case 'long': {
        shortestDuration = Math.ceil(2 * this._24HOURS / 3);
        longestDuration = this._24HOURS + 1;
        if (mode === 'day') {
          shortestDuration = Math.ceil(2 * this._24HOURS / 3);
          longestDuration = this._DAY_HOURS + 1;
        }
        if (mode === 'night') {
          shortestDuration = Math.ceil(2 * this._DAY_BEGINS / 3);
          longestDuration = this._DAY_BEGINS + 1;
        }
        break;
      }
    }

    return this._randomInt(shortestDuration, longestDuration)
  }

}