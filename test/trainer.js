const assert = require('assert')
const brain = require('brain.js')
const { Data } = require('../src/Data.js')
const { Trainer } = require('../src/Trainer.js')

describe('Trainer', function () {

    it('mutate', function () {
        const genome = Trainer.makeRandomGenome({ maxLayers: 4, maxNeurons: 16 })
        const mutation = Trainer.mutate(genome, { rate: 1 / 10, maxLayers: 4, maxNeurons: 8 })
        assert.ok(mutation.leakyReluAlpha >= genome.leakyReluAlpha || mutation.leakyReluAlpha <= genome.leakyReluAlpha)
    })

    this.timeout(100000)
    it('evolve', async function () {
        const data = await Data.parse('./training/simple')
        const trainer = new Trainer()
        const callback = info => console.log(info)
        const best = trainer.evolve(data, {
            callback,
            callbackPeriod: 1,
            maxGenerations: 16,
            populationSize: 128,
            elitism: 1 / 10,
            maxLayers: 4,
            maxNeurons: 16,
            training: {
                errorThresh: 0.00005,
                iterations: 50
            }
        })
        console.log(best.genome)
    })
    this.timeout(2000)

})