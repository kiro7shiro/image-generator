'use strict';

const fs = require('fs')
const path = require('path')
const brain = require('brain.js')

const { Arrays } = require('./Arrays.js')
const { Data } = require('./Data.js')
const { Numbers } = require('./Numbers.js')

class Trainer {

    static activations = ['sigmoid', 'relu', 'leaky-relu', 'tanh']

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
        training: Trainer.trainDefaults,
        settings: Trainer.brainDefaults
    }

    static breed = function (elite, dataSizes, { populationSize = 1024, mutationRate = 1 / 10, mixRands = 1 / 2, settings = {} } = {}) {
        const brood = []
        const rands = Math.ceil(populationSize - populationSize * mixRands)
        for (let eCnt = 0; eCnt < populationSize - rands; eCnt++) {
            const rndA = Numbers.randInt({ max: elite.length })
            const rndB = Numbers.randInt({ max: elite.length })
            const [genomeA, genomeB] = Trainer.mate(elite[rndA], elite[rndB])
            Trainer.mutate(genomeA, mutationRate)
            Trainer.mutate(genomeB, mutationRate)
            brood.push(genomeA, genomeB)
        }
        for (let rCnt = 0; rCnt < rands; rCnt++) {
            const genomeR = Trainer.makeRandomGenome(Object.assign({}, Trainer.brainDefaults, settings))
            const rand = new brain.NeuralNetwork(Object.assign(genomeR, dataSizes))
            rand.initialize()
            brood.push(rand.toJSON())
        }
        return brood.slice(0, populationSize)
        //return brood
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
        const genome = {
            leakyReluAlpha,
            binaryThresh,
            hiddenLayers,
            activation
        }
        return genome
    }

    static mate = function (genomeA, genomeB) {
        const layerCount = genomeA.layers.length > genomeB.layers.length ? genomeB.layers.length : genomeA.layers.length
        for (let lCnt = 1; lCnt < layerCount - 1; lCnt++) {
            const layerA = genomeA.layers[lCnt]
            const layerB = genomeB.layers[lCnt]
            const weightsLength = layerA.weights.length > layerB.weights.length ? layerB.weights.length : layerA.weights.length
            const biasesLength = layerA.biases.length > layerB.biases.length ? layerB.biases.length : layerA.biases.length
            const wPivot = [Math.floor(weightsLength * 0.25), Math.floor(weightsLength * 0.5), Math.floor(weightsLength * 0.75)]
            const bPivot = [Math.floor(biasesLength * 0.25), Math.floor(biasesLength * 0.5), Math.floor(biasesLength * 0.75)]
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
            const nLookup = new Array(layer.weights.length).map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
            const bLookup = new Array(layer.biases.length).map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
            for (let nCnt = 0; nCnt < nLookup.length; nCnt++) {
                const nIdx = nLookup[nCnt]
                const weights = layer.weights[nIdx]
                const wLookup = new Array(weights.length).map((v, idx) => v = Numbers.probability(rate) ? idx : false).filter(v => v !== false)
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
        const dist = Arrays.createDistribution(activations, weights, 100)
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
        let mutatedLeakyReluAlpha = coin ? genome.options.leakyReluAlpha * (1 + rate) : genome.options.leakyReluAlpha * (1 - rate)
        if (mutatedLeakyReluAlpha > 1) {
            mutatedLeakyReluAlpha = genome.options.leakyReluAlpha * (1 - rate)
        } else if (mutatedLeakyReluAlpha < 0) {
            mutatedLeakyReluAlpha = genome.options.leakyReluAlpha * (1 + rate)
        }
        genome.options.leakyReluAlpha = mutatedLeakyReluAlpha
        genome.trainOpts.leakyReluAlpha = genome.options.leakyReluAlpha
        return genome
    }

    static spawn = function (size, dataSizes, { maxLayers = 128, maxNeurons = 128 } = {}) {
        const result = []
        while (size) {
            const genome = Trainer.makeRandomGenome({ maxLayers, maxNeurons })
            Object.assign(genome, dataSizes)
            const generator = new brain.NeuralNetwork(genome)
            generator.initialize()
            result.push(generator.toJSON())
            size--
        }
        return result
    }

    constructor() {
        this.population = []
        this.iterations = 0
        this.error = 1
        this.best = undefined
        this.running = false
    }

    /**
     * 
     * @param {[Object]} data training data
     * @param {Object} [options]
     * @param {Object} [options.evolution] evolution options
     * @param {Object} [options.training] training options
     * @param {Number} [options.settings] brain options
     */
    async evolve(data, { evolution } = {}) {
        // build options
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
        const dataSizes = {
            inputSize: data[0].input.length,
            outputSize: data[0].output.length
        }
        // setup evolution
        if (populationSize < 1) {
            this.population = Trainer.spawn(2, dataSizes, { maxLayers, maxNeurons })
        } else {
            this.population = Trainer.spawn(populationSize, dataSizes, { maxLayers, maxNeurons })
        }
        let counter = maxGenerations
        this.error = 1
        this.running = true
        // start evolution
        while (counter && this.error > training.errorThresh) {
            // break if flag is set, useful if something goes wrong
            if (!this.running) break
            // train population
            const promises = []
            const network = new brain.NeuralNetwork()
            for (let pCnt = 0; pCnt < this.population.length; pCnt++) {
                const generator = network.fromJSON(this.population[pCnt])
                const trainPromise = await new Promise(async function (resolve, reject) {
                    let gError = 1
                    training.callback = function (trainInfo) {
                        gError = trainInfo.error || 1
                    }
                    training.callbackPeriod = 1
                    try {
                        await generator.trainAsync(data, training)
                    } catch (error) {
                        reject(error)
                    }
                    const gJson = generator.toJSON()
                    gJson.error = gError
                    resolve(gJson)
                })
                promises.push(trainPromise)
            }
            this.population = (await Promise.allSettled(promises)).map(({ status, value }) => value)
            // calc fitness
            for (let pCnt = 0; pCnt < this.population.length; pCnt++) {
                const generator = this.population[pCnt]
                const { hiddenLayers } = generator.options
                let layerFitness = hiddenLayers.reduce(function (accu, curr) {
                    accu += curr / maxNeurons
                    return accu
                }, 0)
                layerFitness = layerFitness / maxLayers
                //const hiddenFitness = 1 - Numbers.encode(hiddenLayers.length, { min: 1, max: maxLayers })
                generator.fitness = 1 - layerFitness
            }
            // sort population
            /* this.population.sort((a, b) => {
                return a.error - b.error
            }) */
            this.population.sort((a, b) => {
                return a.error - b.error || b.fitness - a.fitness
            })
            // set current run infos
            this.best = this.population[0]
            this.error = this.best.error
            this.iterations = maxGenerations - counter + 1
            // breed new generation
            const pivot = this.population.length * elitism > 2 ? Math.floor(this.population.length * elitism) : 2
            const elite = this.population.slice(0, pivot)
            this.population = []
            this.population = Trainer.breed(elite, dataSizes, {
                populationSize,
                mutationRate,
                mixRands: 1 / 3,
                settings: {
                    maxLayers,
                    maxNeurons
                }
            })
            this.used = process.memoryUsage()
            //
            if (callback && counter % callbackPeriod === 0) {
                callback({
                    iterations: this.iterations,
                    error: this.error
                })
            }
            counter--
        }
        this.running = false
        return this.best
    }
}

module.exports = {
    Data,
    Trainer,
}