import merge from 'deepmerge';
import fs from 'fs';

export default class TestDataGenerator {
  constructor(config = {}) {
    const defaultConfig = {
      rates: {
        periods: 5,
        priceInterval: [1, 7]
      }
    };

    this._24HOURS = 24;

    this.config = merge(defaultConfig, config);

  }

  generate() {
    return 'hello schedule';
  }

  generateRates() {
    let valueMin, valueMax;
    [valueMin, valueMax] = this.config.rates.priceInterval;
    const ratePeriodLengths = this._generateNrndsWithSumM(this.config.rates.periods, this._24HOURS);
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
}