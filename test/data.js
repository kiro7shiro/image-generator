const assert = require('assert')
const { Data } = require('../src/Data.js')

describe('Data', function () {

    it('should not initialize with params', function () {
        try {
            const test = new Data('./training/simple')
        } catch (error) {
            assert.equal(error.name, 'InitializationError')
        }
    })

    it('should only be builded with make function', async function () {
        const test = await Data.make('./training/simple')
        assert.equal(test.length, 4)
    })

})