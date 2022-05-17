const fs = require('fs')
const path = require('path')
const brain = require('brain.js')
const sharp = require('sharp')

const { Arrays } = require('./Arrays.js')
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
        callback: null,         // a periodic call back that can be triggered while training
        callbackPeriod: 10,     // the number of iterations through the training data between callback calls
        timeout: Infinity,      // the max number of milliseconds to train for
        praxis: null,
        beta1: 0.9,
        beta2: 0.999,
        epsilon: 1e-8
    }

    static breed = function (elite, { populationSize = 1024 } = {}) {
        const parentsA = elite.slice(0, elite.length / 2)
        const parentsB = elite.slice(elite.length / 2)
        // TODO : do something with the loner
        let loner = undefined
        if (parentsB.length > parentsA.length) {
            loner = parentsB.pop()
        }
        const pool = Array.from({ length: parentsA.length }, (item, index) => item = index)
        Arrays.shuffle(pool)
        const offsprings = []
        let pCnt = 0
        while (populationSize) {
            let select = Numbers.wrapNumber(pCnt, 0, parentsA.length)
            const parentA = parentsA[select]
            const parentB = parentsB[pool[select]]
            const [genomeA, genomeB] = Trainer.mate(parentA, parentB)
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

    static mate = function (mateA, mateB, { strategy = 'random' } = {}) {
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

    static mutate = function (genome, { rate = 1 / 50 } = {}) {
        const mutation = JSON.parse(JSON.stringify(genome))
        const leakyReluAlpha = genome.leakyReluAlpha * rate
        const binaryThresh = genome.binaryThresh * rate
        let coin = Numbers.randInt({ inclusive: true })
        mutation.leakyReluAlpha = coin ? genome.leakyReluAlpha + leakyReluAlpha : genome.leakyReluAlpha - leakyReluAlpha
        mutation.binaryThresh = coin ? genome.binaryThresh + binaryThresh : genome.binaryThresh - binaryThresh
        return mutation
    }

    static spawn = function (size, { maxLayers = 128, maxNeurons = 128 } = {}) {
        const result = []
        while (size) {
            const genome = Trainer.makeRandomGenome({ maxLayers, maxNeurons })
            const generator = new brain.NeuralNetwork(genome)
            result.push({
                genome,
                generator
            })
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
            populationSize = 100,
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
            if (callback && callbackCnt === callbackPeriod) {
                callback({ maxGenerations, error, genome: JSON.stringify(elite[0].genome) })
                callbackCnt--
                callbackCnt = callbackCnt ? callbackCnt : callbackPeriod
            }
            maxGenerations--
        }
    }

}

module.exports = { Trainer }