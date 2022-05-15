const fs = require('fs')
const path = require('path')
const brain = require('brain.js')
const sharp = require('sharp')

const { Arrays } = require('./Arrays.js')
const { Numbers } = require('./Numbers.js')

class Trainer {

    static activations = ['sigmoid', 'relu', 'leaky-relu', 'tanh']
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
        for (let pCnt = 0; pCnt < parentsA.length; pCnt++) {
            const { genome: genomeA } = parentsA[pCnt]
            const { genome: genomeB } = parentsB[pool[pCnt]]
            const offspringA = {}
            const offspringB = {}
            let coin = Numbers.randInt({ inclusive: true })
            for (const key in genomeA) {
                if (key === 'hiddenLayers') {
                    const hPoolA = Array.from({ length: genomeA.hiddenLayers.length }, (item, index) => item = genomeA.hiddenLayers[index])
                    const hPoolB = Array.from({ length: genomeB.hiddenLayers.length }, (item, index) => item = genomeB.hiddenLayers[index])
                    Arrays.shuffle(hPoolA)
                    Arrays.shuffle(hPoolB)
                    const layersA = Array.from({
                        length: coin ? genomeA.hiddenLayers.length : genomeB.hiddenLayers.length
                    }, (item, index) => {
                        let selectA = index
                        if (coin) {
                            if (index > hPoolA.length - 1) selectA = Numbers.randInt({ max: hPoolA.length })
                            item = hPoolA[selectA]
                        } else {
                            if (index > hPoolB.length - 1) selectA = Numbers.randInt({ max: hPoolB.length })
                            item = hPoolB[selectA]
                        }
                        coin = Numbers.randInt({ inclusive: true })
                        return item
                    })
                    const layersB = Array.from({
                        length: coin ? genomeB.hiddenLayers.length : genomeA.hiddenLayers.length
                    }, (item, index) => {
                        let selectB = index
                        if (coin) {
                            if (index > hPoolB.length - 1) selectB = Numbers.randInt({ max: hPoolB.length })
                            item = hPoolB[selectB]
                        } else {
                            if (index > hPoolA.length - 1) selectB = Numbers.randInt({ max: hPoolA.length })
                            item = hPoolA[selectB]
                        }
                        coin = Numbers.randInt({ inclusive: true })
                        return item
                    })
                    offspringA[key] = layersA
                    offspringB[key] = layersB
                    continue
                }
                offspringA[key] = coin ? genomeA[key] : genomeB[key]
                offspringB[key] = coin ? genomeB[key] : genomeA[key]
                coin = Numbers.randInt({ inclusive: true })
            }
            offsprings.push(offspringA, offspringB)
        }
        return offsprings
    }

    static imageFromData = async function (data, location) {
        for (let dCnt = 0; dCnt < data.length; dCnt++) {
            data[dCnt] = Numbers.decode(data[dCnt], { max: 255 })
        }
        const raw = new Uint8ClampedArray(data)
        await sharp(raw, {
            raw: {
                width: 8,
                height: 8,
                channels: 3
            }
        }).toFile(location)
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

    /**
     * Read in images from a directory and prepare image data
     * @param {String} location 
     * @returns {Array} set of training data ready for use
     */
    static trainingDataFromImages = async function (location) {
        const dir = fs.readdirSync(location)
        const result = []
        for (let fCnt = 0; fCnt < dir.length; fCnt++) {
            const image = path.resolve(location, dir[fCnt])
            const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true })
            const output = new Uint8ClampedArray(data.buffer)
            for (let oCnt = 0; oCnt < output.length; oCnt++) {
                output[oCnt] = Numbers.encode(output[oCnt], { max: 255 })
            }
            result.push(
                {
                    input: [Numbers.encode(fCnt, { max: dir.length - 1 })],
                    output
                }
            )
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
     * @param {Number} [options.maxGenerations] maximum generations to evolve
     * @param {Number} [options.populationSize] size of population
     * @param {Number} [options.elitism] 
     * @param {Number} [options.maxLayers] maximum layers of one brain
     * @param {Number} [options.maxNeurons] maximum neurons per layer of one brain
     * @param {Object} [options.training] training options
     * @param {Number} [options.training.iterations] the maximum times to iterate the training data
     * @param {Number} [options.training.errorThresh] the acceptable error percentage from training data
     * @param {Number} [options.training.learningRate] multiply's against the input and the delta then adds to momentum
     * @param {Number} [options.training.momentum] multiply's against the specified "change" then adds to learning rate for change
     * @param {Number} [options.training.timeout] the max number of milliseconds to train for
     */
    evolve(data,
        {
            maxGenerations = 1024,
            populationSize = 100,
            elitism = 1 / 10,
            maxLayers = 128,
            maxNeurons = 128,
            training = {}
        } = {}) {
        const options = Object.assign({}, Trainer.trainDefaults, training)
        this.population = Trainer.spawn(populationSize, { maxLayers, maxNeurons })

        let error = 1
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
            error = elite[0].error
            //console.log({ error, elite })
            const breed = Trainer.breed(elite)
            console.log(breed)
            maxGenerations--
        }
        /* for (let gCnt = 0; gCnt < maxGenerations; gCnt++) {
        } */

    }

}

module.exports = { Trainer }