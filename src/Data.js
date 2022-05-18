const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const { Numbers } = require('./Numbers.js')

class InitializationError extends Error {
    constructor(msg) {
        super(msg)
        this.name = 'InitializationError'
    }
}

class Data extends Array {

    static types = { CLASSIFICATION: 'classification' }

    /**
     * Read in images from a directory and prepare image data for classification learning.
     * @param {String} location where the data is stored
     * @returns {Array} set of training data ready for use
     */
    static fromImages = async function (location) {
        const dir = fs.readdirSync(location)
        const result = []
        for (let fCnt = 0; fCnt < dir.length; fCnt++) {
            const file = path.resolve(location, dir[fCnt])
            const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
            const output = new Uint8ClampedArray(data.buffer)
            for (let oCnt = 0; oCnt < output.length; oCnt++) {
                output[oCnt] = Numbers.encode(output[oCnt], { max: 255 })
            }
            result.push(
                {
                    input: [Numbers.encode(fCnt, { max: dir.length - 1 })],
                    output,
                    info,
                    file
                }
            )
        }
        return result
    }

    /**
     * Make data from a source object.
     * @param {[Number]|String} source
     * @returns {Data} parsed data
     */
    static parse = async function (source) {
        let result = []
        let location
        switch (typeof source) {
            case 'object':
                // TODO : parse arrays and objects
                if (Array.isArray(source)) {
                }
                break

            case 'string':
                if (source === '.') source = process.cwd()
                location = path.parse(path.resolve(source))
                const { ext } = location
                // TODO : search location for pre compiled data files
                if (ext === '.json') {
                    result = JSON.parse(fs.readFileSync(path.format(location)))
                } else {
                    result = await Data.fromImages(path.format(location))
                }
                break
        }
        return new Data({ source: result, location: path.format(location) }, true)
    }

    /**
     * Cannot be called directly use Data.parse() instead.
     */
    constructor({ source, location } = {}) {
        const args = [...arguments]
        const [asyncCall] = args.slice(-1)
        if (asyncCall !== true) throw new InitializationError('Cannot be called directly use Data.parse() instead.')
        super()
        this.push(...source)
        this.location = location
        this.type = Data.types.CLASSIFICATION
    }

    async toImages({ location, save = false } = {}) {
        const decoded = []
        for (let dCnt = 0; dCnt < this.length; dCnt++) {
            const { output, info, file } = this[dCnt]
            for (let oCnt = 0; oCnt < output.length; oCnt++) {
                decoded[dCnt] = Numbers.decode(output[oCnt], { max: 255 })
            }
            let raw = new Uint8ClampedArray(decoded)
            let image = await sharp(raw, { raw: info })
            this[dCnt] = image
        }
        return this
    }

    deserialize(input) {
        // TODO : deserialize
    }

    serialize({ replacer = null, space = 0 } = {}) {
        return JSON.stringify(this, replacer, space)
    }

}

module.exports = { Data }