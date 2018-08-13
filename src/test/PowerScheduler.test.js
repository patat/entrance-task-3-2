import { expect } from 'chai';
import { 
  loadData,
  appendGeneratedInput
} from '../utils';
import PowerScheduler from '../PowerScheduler';

describe('PowerScheduler', function() {
  let powerScheduler,
      inputData;
  beforeEach(function() {
    inputData = loadData('src/test/inputExample.json');
    powerScheduler = new PowerScheduler(inputData);
  });
  describe('constructor', function() {
    it('initializes arrays of day hours and night hours', function test() {
      const expectedDayHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const expectedNightHours = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
      expect(powerScheduler._DAY_HOURS).to.deep.equal(expectedDayHours);
      expect(powerScheduler._NIGHT_HOURS).to.deep.equal(expectedNightHours);
    });
    it('initializes rates as an array of rate values, indexed by hours from 0 to 23', function test() {
      expect(powerScheduler._hourlyRates).to.have.length(24);
      expect(powerScheduler._hourlyRates[0]).to.equal(1.79);
      expect(powerScheduler._hourlyRates[10]).to.equal(5.38);
      expect(powerScheduler._hourlyRates[23]).to.equal(1.79);
    });
    it('initializes devices as an array of device objects with cycle and cost data', function test() {
      const expected = loadData('src/test/expectedCostsObjects.json');
      expect(powerScheduler._devices).to.have.length(inputData.devices.length);
      powerScheduler._devices.forEach((device, index) => {
        expect(device.costs).to.deep.equal(expected[index]);
      });
    });
    it('initializes totalMinCost: sum of the cheepest device cycles', function test() {
      expect(powerScheduler._totalMinCost).to.equal(38.939);
    });

    describe('initializes devices', function() {
      describe('_initDevices', function() {
        it('returns devices with cycle and cost data', function test() {
            const expected = loadData('src/test/expectedCostsObjects.json');
            const devices = powerScheduler._initDevices(inputData.devices);
            devices.forEach((device, index) => {
              expect(device.costs).to.deep.equal(expected[index]);
            });
            //TODO: test cycles objects
        });
      });

      describe('_getAllAllowedDeviceCycleBeginningHours', function() {
        it(`returns all possible turn on hours for "day" mode devices;
            turn on hours are chosen at day time with respect to device duration`, 
            function() {
              let expected = [];
              for (let i = 7; i < 20; i++) {
                expected.push(i);
              }
              expect(powerScheduler._getAllAllowedDeviceCycleBeginningHours(inputData.devices[1]))
                .to.deep.equal(expected);
            }
        );

        it(`returns all possible turn on hours for "night" mode devices;
            turn on hours are chosen at night time with respect to device duration`,
            function() {
              let expected = [21, 22, 23, 0, 1, 2, 3, 4];
              expect(powerScheduler._getAllAllowedDeviceCycleBeginningHours(inputData.devices[0]))
                .to.deep.equal(expected);
            }
        );

        it(`returns only first turn on hour for 24-hour running devices`,
            function() {
              expect(powerScheduler._getAllAllowedDeviceCycleBeginningHours(inputData.devices[2]))
                .to.deep.equal([0]);
            }
        );
      });

      describe('_calculateCostForAllowedDeviceCycles', function() {
        it(`returns an array of objects for each allowed device cycle
            with it's beginning hour and cost as props`,
            function test() {
              let expected = [
                {
                  cycleBeginning: 21,
                  cycleCost: (5.38 * 2 + 1.79) * 0.95
                },
                {
                  cycleBeginning: 22,
                  cycleCost: (5.38 + 1.79 * 2) * 0.95
                },
                {
                  cycleBeginning: 23,
                  cycleCost: (1.79 * 3) * 0.95
                },
              ];
              for(let hour = 0; hour < 5; hour++) {
                expected.push({
                  cycleBeginning: hour,
                  cycleCost: 1.79 * 3 * 0.95
                });
              }
              expect(powerScheduler._calculateCostForAllowedDeviceCycles(inputData.devices[0]))
                .to.deep.equal(expected);
            }
        );
      });
    });
  });

  describe('schedule', function() {
    let data,
        powerScheduler;

    beforeEach(function() {
      data = loadData('src/test/generatedInput.json');
      powerScheduler = new PowerScheduler(inputData);
    });
    it('works', function test() {
      // let correctCnt = 0;
      // data.forEach(sample => {
      //   powerScheduler = new PowerScheduler(sample);
      //   //console.log(powerScheduler);
      //   const schedule = powerScheduler.schedule();
      //   const isWithinMaxPower = powerScheduler._testScheduleAgainstMaxPower(schedule);
      //   if (isWithinMaxPower) {
      //     appendGeneratedInput('src/test/generatedOutput.json', schedule);
      //     correctCnt++;
      //   }
      // });

      const schedule = powerScheduler.schedule();
      const isWithinMaxPower = powerScheduler._testScheduleAgainstMaxPower(schedule);
      expect(isWithinMaxPower).to.equal(true);
    });

    describe('_fitness', function() {
      it('returns fitness score for cycles entity', function test() {

        const cycles = [ 
          { id: 'F972B82BA56A70CC579945773B6866FB', beginning: 22 },
          { id: 'C515D887EDBBE669B2FDAC62F571E9E9', beginning: 9 },
          { id: '02DDD23A85DADDD71198305330CC386D', beginning: 0 },
          { id: '1E6276CC231716FE8EE8BC908486D41E', beginning: 0 },
          { id: '7D9DC84AD110500D284B33C82FE6E85E', beginning: 0 } 
        ];
        expect(powerScheduler._fitness(cycles)).to.equal(44.5095);
      });
    });

    describe('_convertCyclesToSchedule', function() {
      it('converts cycles array to schedule object', function test() {
        const caseData = loadData('src/test/convertCyclesToSchedule.json');
        const schedule = powerScheduler._convertCyclesToSchedule(caseData.cycles);
        expect(schedule).to.deep.equal(caseData.schedule);
      });
    });

    describe('_calcScheduleMostBusyHourUsage', function() {
      it('calculates power usage at peak hour', function test() {
        const schedule = loadData('src/test/outputExample.json').schedule;
        expect(powerScheduler._calcScheduleMostBusyHourUsage(schedule))
          .to.equal(2100);
      });
    });

    describe('_calcCyclesCost', function() {
      const caseData = loadData('src/test/convertCyclesToSchedule.json');
      it('calculates total cost of all devices given their cycles', function test() {
        expect(powerScheduler._calcCyclesCost(caseData.cycles))
          .to.equal(44.5095);
      });
    });
  });
});