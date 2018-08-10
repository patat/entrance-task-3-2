import { expect } from 'chai';
import { loadData } from '../index';
import DataValidator from '../DataValidator';

describe('DataValidator', function() {
  let dataValidator,
    iterateThroughData;
  beforeEach(function() {
    dataValidator = new DataValidator();
    iterateThroughData = (method, validSamples, invalidSamples) => {
      validSamples.forEach(sample => {
        expect(dataValidator[method](sample)).to.equal(true);
      });
      invalidSamples.forEach(sample => {
        expect(dataValidator[method](sample)).to.equal(false);
      });    
    };
  });

  describe('@validateRates', function() {
    let validRates,
      invalidRates;
    beforeEach(function() {
      validRates = loadData('src/test/validRates.json');
      invalidRates = loadData('src/test/invalidRates.json');
    });
    it('validates rates', function test() {
      validRates.forEach(sample => {
        expect(dataValidator.validateRates(sample)).to.equal(true);
      });
      for (const flaw in invalidRates) {
        invalidRates[flaw].forEach(sample => {
          expect(dataValidator.validateRates(sample)).to.equal(false);
        });
      }
    });

    describe('_haveRatesProperties', function() {
      it('checks if `from`, `to` and `value` props are present', function test() {
        iterateThroughData('_haveRatesProperties', validRates, invalidRates.missingProps);
      });
    });

    describe('_haveNumericValues', function() {
      it('checks if rates props have numeric values', function test() {
        iterateThroughData('_haveNumericValues', validRates, invalidRates.nonNumeric);
      });
    });

    describe('_haveNonNegativeValues', function() {
      it('checks if rate props have non negative values', function test() {
        iterateThroughData('_haveNonNegativeValues', validRates, invalidRates.negative);
      });
    })

    describe('_doRatesSpanFor24Hours', function() {
      it('checks if rate periods sum up to 24 hours', function test() {       
        iterateThroughData('_doRatesSpanFor24Hours', validRates, invalidRates.not24hoursSpan);
      });
    });

    describe('_areFromAndToWithin24Hours', function() {
      it('checks if `from` and `to` props are less than 24', function test() {
        iterateThroughData('_areFromAndToWithin24Hours', validRates, invalidRates.not24hoursFromTo);
      });
    });

    describe('_doRatesCrossMidnightNoMoreThanOnce', function() {
      it(
        'checks if rate periods have no more than one entry with `from` > `to`',
        function test() {
        iterateThroughData(
          '_doRatesCrossMidnightNoMoreThanOnce',
          validRates,
          invalidRates.midnightCrossedMoreThenOnce
        );
      });
    });

    describe('_haveRatePeriodsNonZeroLength', function() {
      it('checks if rate periods never have from === to', function() {
        iterateThroughData('_haveRatePeriodsNonZeroLength', validRates, invalidRates.periodsZeroLength);
      });
    });

    describe('_doRatePeriodsNotIntersect', function() {
      it('checks if rate periods not intersect', function test() {
        iterateThroughData('_doRatePeriodsNotIntersect', validRates, invalidRates.periodsIntersect);
      });
    });

  });

  describe('@validateDevices', function() {
    let validDevices,
      invalidDevices,
      maxPower;
    beforeEach(function() {
      const validData = loadData('src/test/inputExample.json');
      validDevices = validData.devices;
      maxPower = validData.maxPower;
      invalidDevices = loadData('src/test/invalidDevices.json');
    });
    it('validates devices', function test() {
      expect(dataValidator.validateDevices(validDevices, maxPower)).to.equal(true);
      for (const flaw in invalidDevices) {
        invalidDevices[flaw].forEach(sample => {
          expect(dataValidator.validateDevices(sample, maxPower)).to.equal(false);
        });
      }
    });

    describe('_haveDevicesProperties', function() {
      it('checks if devices have `id`, `name`, `power`, `duration` props', function test() {
        iterateThroughData('_haveDevicesProperties', [validDevices], invalidDevices.noProps);
      });
    });

    describe('_isDeviceId32charHashsum', function() {
      it('checks if device `id`s are 32 char long strings that represent uppercase base-16 numbers', function test() {
        iterateThroughData('_isDeviceId32charHashsum', [validDevices], invalidDevices.invalidId);
      });
    });

    describe('_isDeviceNameAString', function() {
      it('checks if device `name` is a string', function test() {
        iterateThroughData('_isDeviceNameAString', [validDevices], invalidDevices.invalidName);
      });
    });

    describe('_isDevicePowerPositiveInt', function() {
      it('checks if device `power` is positive integer', function test() {
        iterateThroughData('_isDevicePowerPositiveInt', [validDevices], invalidDevices.invalidPower);
      });
    });

    describe('_isDeviceDurationNumOfHoursInADay', function() {
      it('checks if device `duration` is integer in [1, 2, ..., 24]', function test() {
        iterateThroughData('_isDeviceDurationNumOfHoursInADay', [validDevices], invalidDevices.invalidDuration);
      });
    });

    describe('_isDeviceModeValid', function() {
      it('checks if device `mode` property if present is one of ["day", "night"]', function test() {
        iterateThroughData('_isDeviceModeValid', [validDevices], invalidDevices.invalidMode);
      });
    });

    describe('_isDevicePowerLessThanMaxPower', function() {
      it('checks if each device `power` is less than maxPower', function test() {
        expect(dataValidator._isDevicePowerLessThanMaxPower(validDevices, maxPower))
          .to.equal(true);

        invalidDevices.tooMuchPower.forEach(devices => {
          expect(dataValidator._isDevicePowerLessThanMaxPower(devices, maxPower))
            .to.equal(false);
        });
      });
    });

    describe('_isTotalDevicesPowerNotExceed24HourLimit', function() {
      it('checks if total consumption by all devices is less, than can be consumed in 24 hours', function test() {
        expect(dataValidator._isTotalDevicesPowerNotExceed24HourLimit(validDevices, maxPower))
          .to.equal(true);
        invalidDevices.totalPowerExeedsDayLimit.forEach(devices => {
          expect(dataValidator._isTotalDevicesPowerNotExceed24HourLimit(devices, maxPower))
            .to.equal(false);
        });
      });
    });
  });
});