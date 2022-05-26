const assert = require('assert')
const { Data } = require('../src/Data.js')

describe('Data', function () {
/* 
    it('should not initialize with params', function () {
        try {
            const test = new Data('./training/simple')
        } catch (error) {
            assert.equal(error.name, 'InitializationError')
        }
    })

    it('should only be builded with parse()', async function () {
        const test1 = await Data.parse([1, 2, 3, 4])
        assert.equal(test1.length, 4)
        const test2 = await Data.parse('./training/simple')
        assert.equal(test2.length, 4)
    })

    it('should serialize', async function () {
        const test = await Data.parse('./training/simple')
        const json = test.serialize()
        const obj = JSON.parse(json)
        console.log(obj)
        assert.equal(obj.length, 4)
    }) */

    it('fromImages2', async function () {
        const test = await Data.fromImages2(`./www/public/training/simple/`)
        console.log(test[0].output.length)
        console.log(test[0].output)
    })

})