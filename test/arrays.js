const assert = require('assert')
const { Arrays } = require('../src/Arrays.js')

describe('Arrays', function () {
    it('crossover', function () {
        const tests = [
            {
                a: [1, 2, 3],
                b: [4, 5, 6],
                pivots: [1],
                validA: [1, 5, 6],
                validB: [4, 2, 3]
            },
            {
                a: [1, 2, 3, 4],
                b: [5, 6, 7],
                pivots: [1],
                validA: [1, 6, 7, 4],
                validB: [5, 2, 3]
            },
            {
                a: [1, 2, 3],
                b: [5, 6, 7, 8],
                pivots: [1],
                validA: [1, 6, 7],
                validB: [5, 2, 3, 8]
            },
            {
                a: [1, 2, 3, 4, 5],
                b: [6, 7, 8, 9, 0],
                pivots: [1, 3],
                validA: [1, 7, 8, 4, 5],
                validB: [6, 2, 3, 9, 0]
            },
            {
                a: [1, 2, 3, 4, 5],
                b: [6, 7, 8, 9, 0],
                pivots: [0, 2, 3],
                validA: [6, 7, 3, 9, 0],
                validB: [1, 2, 8, 4, 5]
            }
        ]
        for (let tCnt = 0; tCnt < tests.length; tCnt++) {
            const test = tests[tCnt]
            //console.log(test.a, test.b)
            Arrays.crossover(test.a, test.b, test.pivots)
            //console.log(test.a, test.validA)
            //console.log(test.b, test.validB)
            assert.deepEqual(test.a, test.validA)
            assert.deepEqual(test.b, test.validB)
        }
    })
    it('shuffle', function () {
        const test = [0, 1]
        Arrays.shuffle(test)
        const [t1, t2] = test
        assert.ok(t1 === 0 || t1 === 1)
        assert.ok(t2 === 0 || t2 === 1)
    })
    it('distribution', function () {
        const items = ['one', 'two', 'three']
        const weights = [0.5, 0.25, 0.25]
        const size = 10
        const valid = [
            'one', 'one', 'one', 'one', 'one',
            'two', 'two', 'two',
            'three', 'three', 'three'
        ]
        const test = Arrays.createDistribution(items, weights, size)
        assert.deepEqual(test, valid)
        //console.log(test)
    })
})