import { expect } from 'chai';
import { loadData } from '../index';
import DataValidator from '../DataValidator';

describe('DataValidator', function() {
  let dataValidator;
  beforeEach(function() {
    dataValidator = new DataValidator();
  });
  // it('exists', function test() {

  // });

  describe('@validateRates', function() {
    let validRates,
      invalidRates,
      iterateThroughData;
    beforeEach(function() {
      validRates = loadData('src/test/validRates.json');
      invalidRates = loadData('src/test/invalidRates.json');
      iterateThroughData = (method, validSamples, invalidSamples) => {
        validSamples.forEach(sample => {
          expect(dataValidator[method](sample)).to.equal(true);
        });
        invalidSamples.forEach(sample => {
          expect(dataValidator[method](sample)).to.equal(false);
        });    
      };
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

});