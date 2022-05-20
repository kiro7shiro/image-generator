const assert = require('assert')
const { Arrays } = require('../src/Arrays.js')

describe('Arrays', function () {
    it('crossover', function () {
        const tests = [
            {
                a: [1, 2, 3],
                b: [4, 5, 6],
                pivots: [2],
                validA: [1, 2, 6],
                validB: [4, 5, 3],
            },
            {
                a: [1, 2, 3, 4],
                b: [5, 6, 7],
                pivots: [2],
                validA: [1, 2, 7, 4],
                validB: [5, 6, 3],
            },
            {
                a: [1, 2, 3, 4, 5],
                b: [6, 7, 8, 9, 0],
                pivots: [2, 4],
                validA: [1, 2, 8, 9, 5],
                validB: [6, 7, 3, 4, 0],
            },
            {
                a: [1, 2, 3, 4, 5],
                b: [6, 7, 8, 9, 0],
                pivots: [1, 3, 4],
                validA: [1, 7, 8, 4, 0],
                validB: [6, 2, 3, 9, 5],
            }
        ]
        for (let tCnt = 0; tCnt < tests.length; tCnt++) {
            const test = tests[tCnt]
            Arrays.crossover(test.a, test.b, test.pivots)
            assert.deepEqual(test.a, test.validA)
            assert.deepEqual(test.b, test.validB)
            //console.table(test)
        }
    })
})