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

class SaveError extends Error {
    constructor(msg) {
        super(msg)
        this.name = 'SaveError'
    }
}

class Data extends Array {

    static types = { CLASSIFICATION: 'classification' }
    static rgbaMax = 4294967295

    static rgbaToInt = function (r, g, b, a) {
        const bytes = Uint8Array.from([r, g, b, a])
        const dataView = new DataView(bytes.buffer)
        return dataView.getUint32(0)
    }

    static intToRgba = function (int) {
        const bytes = new Uint8Array(4)
        const dataView = new DataView(bytes.buffer)
        dataView.setUint32(0, int)
        return new Uint8Array(dataView.buffer)
    }

    static fromImages2 = async function (location) {
        const supported = ['.jpg', '.png', '.webp', '.gif', '.avif', '.tif', '.svg']
        const dir = fs.readdirSync(location).filter(f => {
            const file = path.parse(f)
            const found = supported.find(e => e === file.ext) ? true : false
            return found
        })
        const result = []
        for (let fCnt = 0; fCnt < dir.length; fCnt++) {
            const file = path.resolve(location, dir[fCnt])
            const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
            const output = new Uint8ClampedArray(data.buffer)
            const encoded = []
            for (let oCnt = 0; oCnt < output.length; oCnt += 4) {
                const bytes = output.slice(oCnt, oCnt + 4)
                const intRgba = Data.rgbaToInt(...bytes)
                encoded.push(Numbers.encode(intRgba, { max: Data.rgbaMax }))
            }
            result.push(
                {
                    input: [Numbers.encode(fCnt, { max: dir.length - 1 })],
                    output: encoded,
                    info,
                    file
                }
            )
        }
        return result
    }

    // TODO : add param for encoding
    /**
     * Read in images from a directory and prepare image data for classification learning.
     * @param {String} location where the data is stored
     * @returns {Array} set of training data ready for use
     */
    static fromImages = async function (location) {
        const supported = ['.jpg', '.png', '.webp', '.gif', '.avif', '.tif', '.svg']
        const dir = fs.readdirSync(location).filter(f => {
            const file = path.parse(f)
            const found = supported.find(e => e === file.ext) ? true : false
            return found
        })
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
        let formatted = 'none'
        const data = new Data(true)
        switch (typeof source) {
            case 'object':
                if (Array.isArray(source)) {
                    // arrays don't need to be parsed
                    result = source
                } else {
                    // TODO : parse objects
                }
                break

            case 'string':
                if (source === '.') source = process.cwd()
                let location = path.parse(path.resolve(source))
                formatted = path.format(location)
                const { ext } = location
                // TODO : search location for pre compiled data files
                if (ext === '.json') {
                    result = JSON.parse(fs.readFileSync(formatted))
                } else {
                    result = await Data.fromImages(formatted)
                }
                break
        }
        data.push(...result)
        data.location = formatted
        //data.type = Data.types.CLASSIFICATION
        return data
    }

    /**
     * Cannot be called directly use Data.parse() instead.
     */
    constructor() {
        const args = [...arguments]
        const [asyncCall] = args.slice(-1)
        if (asyncCall !== true) throw new InitializationError('Cannot be called directly use Data.parse() instead.')
        super()
    }

    // TODO : add param for decoding
    async toImages({ location, save = false } = {}) {

        if (location) this.location = path.resolve(location)
        if (!fs.existsSync(this.location) && save) throw new SaveError(`Cannot save data. Location doesn't exists.`)

        for (let dCnt = 0; dCnt < this.length; dCnt++) {
            const decoded = []
            const { output, info, file } = this[dCnt]
            for (let oCnt = 0; oCnt < output.length; oCnt++) {
                //output[dCnt] = Numbers.decode(output[oCnt], { max: 255 })
                decoded.push(Numbers.decode(output[oCnt], { max: 255 }))
            }
            let raw = new Uint8ClampedArray(decoded)
            //let raw = new Uint8ClampedArray(output)
            let image = await sharp(raw, { raw: info })
            this[dCnt] = image
            if (save) {
                const name = path.basename(file)
                const dest = path.resolve(location, name)
                await image.toFile(dest)
            }
        }
        return this
    }

    async toImages2({ location, save = false } = {}) {

        if (location) this.location = path.resolve(location)
        if (!fs.existsSync(this.location) && save) throw new SaveError(`Cannot save data. Location doesn't exists.`)

        for (let dCnt = 0; dCnt < this.length; dCnt++) {
            const decoded = []
            const { output, info, file } = this[dCnt]
            for (let oCnt = 0; oCnt < output.length; oCnt++) {
                const rgbaInt = Numbers.decode(output[oCnt], { max: Data.rgbaMax })
                const bytes = Data.intToRgba(rgbaInt)
                decoded.push(...bytes)
            }
            let raw = new Uint8ClampedArray(decoded)
            let image = await sharp(raw, { raw: info })
            this[dCnt] = image
            if (save) {
                const name = path.basename(file)
                const dest = path.resolve(location, name)
                await image.toFile(dest)
            }
        }
        return this
    }

    deserialize(input) {
        // TODO : everything
        return JSON.parse(input)
    }

    serialize({ replacer = null, space = 0 } = {}) {
        return JSON.stringify(this, replacer, space)
    }

}

module.exports = { Data }