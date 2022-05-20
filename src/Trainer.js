const fs = require('fs')
const path = require('path')
const brain = require('brain.js')
const sharp = require('sharp')

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
        activation: 'sigmoid'   // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
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

    static breed = function (elite, { populationSize = 1024, mutation = { rate: 1 / 10, maxLayers: 128, maxNeurons: 128 } } = {}) {
        const parentsA = elite.slice(0, elite.length / 2)
        const parentsB = elite.slice(elite.length / 2)
        if (parentsB.length > parentsA.length) {
            // TODO : do something with the loner
            let loner = parentsB.pop()
        }
        const pool = Array.from({ length: parentsA.length }, (item, index) => item = index)
        Arrays.shuffle(pool)
        const offsprings = [parentsA[0], parentsB[0]]
        populationSize -= 2
        let pCnt = 2
        while (populationSize) {
            let select = Numbers.wrapNumber(pCnt, 0, parentsA.length)
            const parentA = parentsA[select]
            const parentB = parentsB[pool[select]]
            // TODO : update call 
            let [genomeA, genomeB] = Trainer.mate(parentA, parentB)
            /* genomeA = Trainer.mutate(genomeA, mutation)
            genomeB = Trainer.mutate(genomeB, mutation) */
            const offspringA = {
                genome: genomeA,
                generator: new brain.NeuralNetwork(genomeA)
            }
            const offspringB = {
                genome: genomeB,
                generator: new brain.NeuralNetwork(genomeB)
            }
            offsprings.push(offspringA, offspringB)
            pCnt++
            populationSize -= 2
        }
        return offsprings
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

    static mateOld = function (mateA, mateB, { strategy = 'random' } = {}) {
        const { genome: genomeA } = mateA
        const { genome: genomeB } = mateB
        const offspringA = {}
        const offspringB = {}
        let coin = Numbers.randInt({ inclusive: true })
        const keys = Object.keys(genomeA)
        for (let kCnt = 0; kCnt < keys.length; kCnt++) {
            const key = keys[kCnt]
            if (key === 'hiddenLayers') {
                const hPoolA = [...genomeA.hiddenLayers]
                const hPoolB = [...genomeB.hiddenLayers]
                Arrays.shuffle(hPoolA)
                Arrays.shuffle(hPoolB)
                function selectAB(index) {
                    let item
                    let select = index
                    coin = Numbers.randInt({ inclusive: true })
                    if (coin === 0) {
                        if (index > hPoolA.length - 1)
                            select = Numbers.randInt({ max: hPoolA.length })
                        item = hPoolA[select]
                    } else {
                        if (index > hPoolB.length - 1)
                            select = Numbers.randInt({ max: hPoolB.length })
                        item = hPoolB[select]
                    }
                    return item
                }
                const layersA = []
                const layersB = []
                const lenA = coin ? hPoolA.length : hPoolB.length
                const lenB = coin ? hPoolB.length : hPoolA.length
                for (let aCnt = 0; aCnt < lenA; aCnt++) {
                    layersA.push(selectAB(aCnt))
                }
                for (let bCnt = 0; bCnt < lenB; bCnt++) {
                    layersB.push(selectAB(bCnt))
                }
                offspringA.hiddenLayers = layersA
                offspringB.hiddenLayers = layersB
            } else {
                offspringA[key] = coin ? genomeA[key] : genomeB[key]
                offspringB[key] = coin ? genomeB[key] : genomeA[key]
            }
            coin = Numbers.randInt({ inclusive: true })
        }
        return [offspringA, offspringB]
    }

    static mate = function (genomeA, genomeB) {
        /* const genomeA = JSON.parse(JSON.stringify(genomeA.toJSON()))
        const genomeB = JSON.parse(JSON.stringify(genomeB.toJSON())) */
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
        //console.log({ jsonA, jsonB })
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
                    const wIdx = wLookup[wCnt]
                    const newWeight = Numbers.probability(rate) ? weights[wIdx] * (1 + rate) : weights[wIdx] * (1 - rate)
                    weights[wIdx] = newWeight
                }
            }
            for (let bCnt = 0; bCnt < bLookup.length; bCnt++) {
                const bIdx = bLookup[bCnt]
                const newBias = Numbers.probability(rate) ? (layer.biases[bIdx] * (1 + rate)) : (layer.biases[bIdx] * (1 - rate))
                layer.biases[bIdx] = newBias
            }
        }
        // activation
        const part = rate / (Trainer.activations.length - 1)
        const activations = [genome.options.activation, ...Trainer.activations.filter(actv => actv !== genome.options.activation)]
        const weights = [Trainer.activations.length - rate]
        for (let wCnt = 1; wCnt < Trainer.activations.length; wCnt++) {
            weights.push(part)
        }
        const dist = Arrays.createDistribution(activations, weights, 10)
        genome.options.activation = dist[Numbers.randInt({ max: dist.length })]
        // binaryThresh
        genome.options.binaryThresh = Numbers.probability(rate) ? genome.options.binaryThresh * (1 + rate) : genome.options.binaryThresh * (1 - rate)
        // leakyReluAlpha
        genome.options.leakyReluAlpha = Numbers.probability(rate) ? genome.options.leakyReluAlpha * (1 + rate) : genome.options.leakyReluAlpha * (1 - rate)
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
    }

    /**
     * 
     * @param {[Object]} data training data
     * @param {Object} [options]
     * @param {Function} [options.callback]
     * @param {Number} [options.callbackPeriod]
     * @param {Number} [options.elitism]
     * @param {Number} [options.maxGenerations] maximum generations to evolve
     * @param {Number} [options.maxLayers] maximum layers of one brain
     * @param {Number} [options.maxNeurons] maximum neurons per layer of one brain
     * @param {Number} [options.populationSize] size of population
     * @param {Object} [options.training] training options
     * @param {Number} [options.training.iterations] the maximum times to iterate the training data
     * @param {Number} [options.training.errorThresh] the acceptable error percentage from training data
     * @param {Number} [options.training.learningRate] multiply's against the input and the delta then adds to momentum
     * @param {Number} [options.training.momentum] multiply's against the specified "change" then adds to learning rate for change
     * @param {Number} [options.training.timeout] the max number of milliseconds to train for
     */
    evolve(data,
        {
            callback = null,
            callbackPeriod = 10,
            elitism = 1 / 10,
            maxGenerations = 1024,
            maxLayers = 128,
            maxNeurons = 128,
            populationSize = 128,
            training = {}
        } = {}) {
        const options = Object.assign({}, Trainer.trainDefaults, training)
        this.population = Trainer.spawn(populationSize, { maxLayers, maxNeurons })
        let error = 1
        let callbackCnt = callbackPeriod
        while (maxGenerations && error > options.errorThresh) {
            for (let pCnt = 0; pCnt < this.population.length; pCnt++) {
                const member = this.population[pCnt]
                const { generator } = member
                const saveError = function (data) {
                    member.error = data.error
                }
                options.callback = saveError
                options.callbackPeriod = 1
                generator.train(data, options)
            }
            this.population.sort(function (a, b) {
                return a.error - b.error
            })
            const pivot = this.population.length * elitism > 2 ? this.population.length * elitism : 2
            const elite = this.population.slice(0, pivot)
            const breed = Trainer.breed(elite, { populationSize })
            error = elite[0].error
            this.population = breed
            /* const bnomes = breed.reduce((accu, curr) => { accu.push(curr.genome); return accu }, [])
            console.table(bnomes.slice(0, 3)) */
            if (callback && callbackCnt === callbackPeriod) {
                callback({ maxGenerations, error })
                callbackCnt--
                callbackCnt = callbackCnt ? callbackCnt : callbackPeriod
            }
            maxGenerations--
        }
        return this.population[0]
    }

}

module.exports = {
    Data,
    Trainer,
}