const brain = require('brain.js')
const { Trainer } = require('../src/Trainer.js')

describe('Trainer', function () {
    it('test', async function () {
        const data = await Trainer.trainingDataFromImages('./training/simple')
        const trainer = new Trainer()
        trainer.evolve(data,
            {
                maxGenerations: 2,
                populationSize: 9,
                elitism: 1,
                maxLayers: 8,
                maxNeurons: 8,
                training: {
                    iterations: 3
                }
            })
    })
})