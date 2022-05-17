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
     * Read in images from a directory and prepare image data
     * @param {String} location 
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
     * @param {[Number]|String} source array or an array of arrays filled with numbers or a string pointing to the location of the data
     * @returns {Data} parsed data
     */
    static make = async function (source) {
        let result = []
        let location
        switch (typeof source) {
            case 'object':
                if (Array.isArray(source)) {
                    // TODO 
                }
                break

            case 'string':
                // TODO : check type of files, for now only images are supported
                location = path.resolve(source)
                result = await Data.fromImages(location)
                break
        }
        return new Data({ source: result, location }, true)
    }

    /**
     * Cannot be called directly use Data.make() instead.
     */
    constructor({ source, location } = {}) {
        const args = [...arguments]
        const [asyncCall] = args.slice(-1)
        if (asyncCall !== true) throw new InitializationError('Cannot be called directly use Data.make() instead.')
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

}

module.exports = { Data }