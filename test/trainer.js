const assert = require('assert')
const brain = require('brain.js')
const { Data } = require('../src/Data.js')
const { Trainer } = require('../src/Trainer.js')

describe('Trainer', function () {

    it('mate', async function () {
        const data = [
            {
                input: [0],
                output: [1]
            },
            {
                input: [1],
                output: [0]
            }
        ]
        const genA = Trainer.makeRandomGenome({ maxLayers: 3, maxNeurons: 4 })
        const genB = Trainer.makeRandomGenome({ maxLayers: 3, maxNeurons: 4 })
        const mateA = new brain.NeuralNetwork(genA)
        const mateB = new brain.NeuralNetwork(genB)
        const options = Object.assign({}, Trainer.trainDefaults, {
            iterations: 2
        })
        mateA.train(data, options)
        mateB.train(data, options)
        Trainer.mate(mateA.toJSON(), mateB.toJSON())
    })

    it('mutate', function () {
        const data = [
            {
                input: [0],
                output: [1]
            },
            {
                input: [1],
                output: [0]
            }
        ]
        const genA = Trainer.makeRandomGenome({ maxLayers: 3, maxNeurons: 8 })
        const mateA = new brain.NeuralNetwork(genA)
        const options = Object.assign({}, Trainer.trainDefaults, {
            iterations: 2
        })
        mateA.train(data, options)
        const genome = mateA.toJSON()
        /* console.log({
            options: genome.options,
            weights: genome.layers[1].weights
        }) */
        Trainer.mutate(genome, { rate: 1 / 10 })
        /* console.log({
            options: genome.options,
            weights: genome.layers[1].weights
        }) */
    })

    this.timeout(100000)
    it('evolve', async function () {
        const data = [
            {
                input: [0],
                output: [1]
            },
            {
                input: [1],
                output: [0]
            }
        ]
        //const data = await Data.parse('./training/simple')
        const trainer = new Trainer()
        const callback = info => {return;console.log({ info })}
        const best = trainer.evolve(data, {
            callback,
            callbackPeriod: 1,
            maxGenerations: 2,
            populationSize: 3,
            elitism: 1 / 1,
            maxLayers: 4,
            maxNeurons: 16,
            training: {
                errorThresh: 0.00005,
                iterations: 2
            }
        })
        //console.log(best.genome)
    })
    this.timeout(2000)

})