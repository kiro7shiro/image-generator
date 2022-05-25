const fs = require('fs')
const path = require('path')
const brain = require('brain.js')

const { Arrays } = require('./Arrays.js')
const { Data } = require('./Data.js')
const { Numbers } = require('./Numbers.js')

class Trainer {

    static activations = ['sigmoid', 'relu', 'leaky-relu', 'tanh']

    static matingStrategies = ['random', 'crossover']

    static brainDefaults = {
        leakyReluAlpha: 0.01,   // supported for activation type 'leaky-relu'
        binaryThresh: 0.5,
        hiddenLayers: null,     // array of ints for the sizes of the hidden layers in the network
        activation: 'sigmoid',  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
        maxLayers: 128,        // maximum layers of one brain
        maxNeurons: 128,       // maximum neurons per layer of one brain
    }

    static trainDefaults = {
        iterations: 20000,      // the maximum times to iterate the training data
        errorThresh: 0.005,     // the acceptable error percentage from training data
        log: false,             // true to use console.log, when a function is supplied it is used
        logPeriod: 10,          // iterations between logging out
        learningRate: 0.3,      // multiply's against the input and the delta then adds to momentum
        momentum: 0.1,          // multiply's against the specified "change" then adds to learning rate for change
        callback: undefined,    // a periodic call back that can be triggered while training
        callbackPeriod: 10,     // the number of iterations through the training data between callback calls
        timeout: Infinity,      // the max number of milliseconds to train for
        praxis: null,
        beta1: 0.9,
        beta2: 0.999,
        epsilon: 1e-8
    }

    static evolutionDefaults = {
        callback: undefined,
        callbackPeriod: 10,
        elitism: 1 / 10,
        maxGenerations: 1024,
        mutationRate: 1 / 10,
        populationSize: 128,
        restart: false,
        training: Trainer.trainDefaults,
        settings: Trainer.brainDefaults
    }

    static breed = function (elite, { populationSize = 1024, mutationRate = 1 / 10, mixRands = 1 / 2, settings = {} } = {}) {
        settings = Object.assign({}, Trainer.brainDefaults, settings)
        const offsprings = []
        const rands = Math.ceil(populationSize - populationSize * mixRands)
        for (let eCnt = 0; eCnt < populationSize - rands; eCnt++) {
            const parentA = elite[Numbers.randInt({ max: elite.length })].toJSON()
            const parentB = elite[Numbers.randInt({ max: elite.length })].toJSON()
            const [genomeA, genomeB] = Trainer.mate(parentA, parentB)
            Trainer.mutate(genomeA, mutationRate)
            Trainer.mutate(genomeB, mutationRate)
            const offspringA = new brain.NeuralNetwork(genomeA.options)
            const offspringB = new brain.NeuralNetwork(genomeB.options)
            offspringA.fromJSON(genomeA)
            offspringB.fromJSON(genomeB)
            offsprings.push(offspringA, offspringB)
        }
        for (let rCnt = 0; rCnt < rands; rCnt++) {
            const genomeR = Trainer.makeRandomGenome(settings)
            const rand = new brain.NeuralNetwork(genomeR)
            offsprings.push(rand)
        }
        return offsprings.slice(0, populationSize)
    }

    static makeRandomGenome = function ({ maxLayers = 128, maxNeurons = 128 } = {}) {
        // Math.max(3, Math.floor(data[0].input.length / 2))
        const leakyReluAlpha = Numbers.randFloat({ min: 0.001, max: 0.1, decimals: 4 })
        const binaryThresh = Numbers.randFloat({ min: 0.001, max: 0.999, decimals: 4 })
        const activation = Trainer.activations[Numbers.randInt({ max: Trainer.activations.length - 1 })]
        const hiddenLayers = Array(Numbers.randInt({ min: 1, max: maxLayers, inclusive: true }))
        for (let hCnt = 0; hCnt < hiddenLayers.length; hCnt++) {
            hiddenLayers[hCnt] = Numbers.randInt({ min: 1, max: maxNeurons, inclusive: true })
        }
        return {
            leakyReluAlpha,
            binaryThresh,
            hiddenLayers,
            activation
        }
    }

    static mate = function (genomeA, genomeB) {
        const layerCount = genomeA.layers.length > genomeB.layers.length ? genomeB.layers.length : genomeA.layers.length
        for (let lCnt = 1; lCnt < layerCount - 1; lCnt++) {
            const layerA = genomeA.layers[lCnt]
            const layerB = genomeB.layers[lCnt]
            const weightsLength = layerA.weights.length > layerB.weights.length ? layerB.weights.length : layerA.weights.length
            const biasesLength = layerA.biases.length > layerB.biases.length ? layerB.biases.length : layerA.biases.length
            const wPivot = Math.floor(weightsLength / 2)
            const bPivot = Math.floor(biasesLength / 2)
            Arrays.crossover(layerA.weights, layerB.weights, wPivot)
            Arrays.crossover(layerA.biases, layerB.biases, bPivot)
        }
        return [genomeA, genomeB]
    }

    static mutate = function (genome, { rate = 1 / 10 } = {}) {
        for (let lCnt = 1; lCnt < genome.layers.length - 1; lCnt++) {
            // mutate weights and biases
            // build a lookup table of the values which will be mutated based on the probability rate
            // so we only have to iterate over the values that are actually changing
            const layer = genome.layers[lCnt]
            const nLookup = [...new Array(layer.weights.length)].map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
            const bLookup = [...new Array(layer.biases.length)].map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
            for (let nCnt = 0; nCnt < nLookup.length; nCnt++) {
                const nIdx = nLookup[nCnt]
                const weights = layer.weights[nIdx]
                const wLookup = [...new Array(weights.length)].map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
                for (let wCnt = 0; wCnt < wLookup.length; wCnt++) {
                    const coin = Numbers.randInt({ max: 1, inclusive: true })
                    const wIdx = wLookup[wCnt]
                    //const newWeight = Numbers.probability(rate) ? weights[wIdx] * (1 + rate) : weights[wIdx] * (1 - rate)
                    const newWeight = coin ? weights[wIdx] * (1 + rate) : weights[wIdx] * (1 - rate)
                    weights[wIdx] = newWeight
                }
            }
            for (let bCnt = 0; bCnt < bLookup.length; bCnt++) {
                const coin = Numbers.randInt({ max: 1, inclusive: true })
                const bIdx = bLookup[bCnt]
                //const newBias = Numbers.probability(rate) ? (layer.biases[bIdx] * (1 + rate)) : (layer.biases[bIdx] * (1 - rate))
                const newBias = coin ? (layer.biases[bIdx] * (1 + rate)) : (layer.biases[bIdx] * (1 - rate))
                layer.biases[bIdx] = newBias
            }
        }
        // activation
        const part = rate / (Trainer.activations.length - 1)
        const activations = [genome.options.activation, ...Trainer.activations.filter(function (actv) {
            return actv !== genome.options.activation
        })]
        const weights = [Trainer.activations.length - rate]
        for (let wCnt = 1; wCnt < Trainer.activations.length; wCnt++) {
            weights.push(part)
        }
        const dist = Arrays.createDistribution(activations, weights, 10)
        genome.options.activation = dist[Numbers.randInt({ max: dist.length })]
        genome.trainOpts.activation = genome.options.activation
        // binaryThresh
        let coin = Numbers.randInt({ max: 1, inclusive: true })
        //genome.options.binaryThresh = Numbers.probability(rate) ? genome.options.binaryThresh * (1 + rate) : genome.options.binaryThresh * (1 - rate)
        genome.options.binaryThresh = coin ? genome.options.binaryThresh * (1 + rate) : genome.options.binaryThresh * (1 - rate)
        genome.trainOpts.binaryThresh = genome.options.binaryThresh
        // leakyReluAlpha
        coin = Numbers.randInt({ max: 1, inclusive: true })
        //genome.options.leakyReluAlpha = Numbers.probability(rate) ? genome.options.leakyReluAlpha * (1 + rate) : genome.options.leakyReluAlpha * (1 - rate)
        genome.options.leakyReluAlpha = coin ? genome.options.leakyReluAlpha * (1 + rate) : genome.options.leakyReluAlpha * (1 - rate)
        genome.trainOpts.leakyReluAlpha = genome.options.leakyReluAlpha
        return genome
    }

    static spawn = function (size, { maxLayers = 128, maxNeurons = 128 } = {}) {
        const result = []
        while (size) {
            const genome = Trainer.makeRandomGenome({ maxLayers, maxNeurons })
            const generator = new brain.NeuralNetwork(genome)
            result.push(generator)
            size--
        }
        return result
    }

    constructor() {
        this.population = []
        this.best = undefined
    }

    /**
     * 
     * @param {[Object]} data training data
     * @param {Object} [options]
     * @param {Object} [options.evolution] evolution options
     * @param {Object} [options.training] training options
     * @param {Number} [options.brain] brain options
     */
    async evolve(data, { evolution } = {}) {
        const options = Object.assign({}, Trainer.evolutionDefaults, evolution)
        const { elitism,
            callback,
            callbackPeriod,
            populationSize,
            maxGenerations,
            mutationRate,
            training,
            settings
        } = options
        const { maxLayers, maxNeurons } = settings
        if (populationSize < 1) {
            this.population = Trainer.spawn(2, { maxLayers, maxNeurons })
        } else {
            this.population = Trainer.spawn(populationSize, { maxLayers, maxNeurons })
        }
        let iterations = maxGenerations
        let error = 1
        let callbackCnt = callbackPeriod
        while (iterations && error > training.errorThresh) {
            for (let pCnt = 0; pCnt < this.population.length; pCnt++) {
                const generator = this.population[pCnt]
                const saveError = function (data) {
                    generator.error = data.error || 1
                }
                training.callback = saveError
                training.callbackPeriod = 1
                await generator.trainAsync(data, training)
            }
            //this.population = this.population.filter(g => !isNaN(g.error) && g.error < 1)
            for (let pCnt = 0; pCnt < this.population.length; pCnt++) {
                const generator = this.population[pCnt]
                const { hiddenLayers } = generator.options
                const lWeight = 1 / hiddenLayers.length
                const layerFitness = hiddenLayers.reduce(function (accu, curr) {
                    accu += 1 - Numbers.encode(curr, { min: 1, max: maxNeurons }) * lWeight
                    return accu
                }, 0)
                const hiddenFitness = 1 - Numbers.encode(hiddenLayers.length, { min: 1, max: hiddenLayers.length })
                generator.fitness = 1 - (generator.error * 0.5 + hiddenFitness * 0.25 + layerFitness * 0.25)
            }
            //this.population.sort((a, b) => a.error - b.error)
            this.population.sort((a, b) => b.fitness - a.fitness)
            if (this.population.length < 1) {
                return undefined
            } else {
                this.best = this.population[0]
            }
            error = this.best.error
            const pivot = this.population.length * elitism > 2 ? Math.floor(this.population.length * elitism) : 2
            const elite = this.population.slice(0, pivot)
            this.population = Trainer.breed(elite, {
                populationSize,
                mutationRate,
                mixRands: 1 / 2,
                settings: {
                    maxLayers,
                    maxNeurons
                }
            })
            if (callback && callbackCnt === callbackPeriod) {
                callback({
                    iterations: maxGenerations - iterations + 1,
                    error,
                    best: this.best
                })
                callbackCnt--
                callbackCnt = callbackCnt ? callbackCnt : callbackPeriod
            }
            iterations--
        }
        return this.best
    }
}

module.exports = {
    Data,
    Trainer,
}