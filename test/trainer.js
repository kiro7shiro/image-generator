const assert = require('assert')
const brain = require('brain.js')
const { Data } = require('../src/Data.js')
const { Trainer } = require('../src/Trainer.js')

describe('Trainer', function () {
    it('test', async function () {
        const data = await Data.make('./training/simple')
        const trainer = new Trainer()
        const callback = info => console.log(info)
        trainer.evolve(data, {
            callback,
            callbackPeriod: 1,
            maxGenerations: 8,
            populationSize: 100,
            elitism: 1 / 10,
            maxLayers: 4,
            maxNeurons: 16,
            training: {
                iterations: 25
            }
        })
    })
})