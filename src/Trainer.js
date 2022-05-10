const fs = require('fs')
const path = require('path')
const brain = require('brain.js')
const sharp = require('sharp')

const { Numbers } = require('./Numbers.js')

class Trainer {

    static makeRandomGenome = function ({}) {
        
    }

    /**
     * Read in images from a directory and prepare image data
     * @param {String} location 
     * @returns {Array} set of training data ready for use
     */
    static makeTrainingData = async function (location) {
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

    static makeResultImage = async function (data, location) {
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

    static spawn = function (size) {
        const result = []
        while (size) {
            
        }
        return result
    }

    constructor() {
        this.population = []
    }

    train(data, { populationSize = 100, maxGenerations = 1024 } = {}) {
        
    }

}

module.exports = { Trainer }