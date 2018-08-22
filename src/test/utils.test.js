import { expect } from 'chai';
import fs from 'fs';

import {
  loadData,
  appendGeneratedInput
} from '../utils';

describe('utils', function () {
  describe('loadData', function () {
    it('shoud return contents of a .json file', function test () {
      const expected = [
        {
          num: 1,
          word: 'One'
        }, {
          num: 2,
          word: 'Two'
        }, {
          num: 3,
          word: 'Three'
        }, {
          num: 4,
          word: 'Four'
        }, {
          num: 5,
          word: 'Five'
        }, {
          num: 0,
          word: 'Zero'
        }
      ];
      expect(loadData('ref.json')).to.deep.equal(expected);
    });
  });

  describe('appendGeneratedInput', function () {
    let file;
    it('appends data to existing json file or creates new one', function test () {
      file = 'src/test/appendedData.json';
      const data = [
        {
          num: 1,
          word: 'One'
        },
        {
          num: 2,
          word: 'Two'
        },
        {
          num: 3,
          word: 'Three'
        }
      ];
      data.forEach((item, index) => {
        expect(() => appendGeneratedInput(file, item)).to.not.throw();
        const fileContents = loadData(file);
        expect(fileContents).to.deep.equal(data.slice(0, index + 1));
      });
    });
    afterEach(function () {
      fs.unlinkSync(file);
    });
  });
});
