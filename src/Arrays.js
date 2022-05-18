class Arrays {
    static createDistribution = (array, weights, size) => {
        const distribution = []
        const sum = weights.reduce((a, b) => a + b)
        const quant = size / sum
        for (let i = 0; i < array.length; ++i) {
            const limit = quant * weights[i]
            for (let j = 0; j < limit; ++j) {
                distribution.push(i)
            }
        }
        return distribution
    }
    /**
     * Shuffles array in place.
     * @param {Array} array items An array containing the items.
     */
    static shuffle = function (array) {
        let j, tmp, i
        for (i = array.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            tmp = array[i]
            array[i] = array[j]
            array[j] = tmp
        }
        return array
    }
}

module.exports = { Arrays }