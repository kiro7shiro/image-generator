class Arrays {

    /**
     * Creates a new distribution of the items whose frequency is controlled by the weights passed.
     * @param {Array} items to distribute
     * @param {Array} weights factors to control the frequency
     * @param {Number} size of the new distribution
     * @returns 
     */
    static createDistribution = (items, weights, size) => {
        const distribution = []
        const sum = weights.reduce((a, b) => a + b)
        const quant = size / sum
        for (let i = 0; i < items.length; ++i) {
            const limit = quant * weights[i]
            for (let j = 0; j < limit; ++j) {
                distribution.push(items[i])
            }
        }
        return distribution
    }

    /**
     * Crossover the values of two arrays in place.
     * @param {Array} arrayA 
     * @param {Array} arrayB 
     * @param {Number|Array} pivots pivot point(s) where to crossover
     * @returns {Array} [arrayA, arrayB]
     */
    static crossover = function (arrayA, arrayB, pivots) {
        const length = arrayA.length < arrayB.length ? arrayA.length : arrayB.length
        if (typeof pivots === 'number') pivots = [pivots]
        let pivot = pivots.shift()
        if (pivot < 0 || pivot > length) {
            return [arrayA, arrayB]
        }
        for (let cCnt = pivot; cCnt < length; cCnt++) {
            [arrayA[cCnt], arrayB[cCnt]] = [arrayB[cCnt], arrayA[cCnt]]
        }
        if (pivots.length) [arrayA, arrayB] = Arrays.crossover(arrayA, arrayB, pivots)
        return [arrayA, arrayB]
    }

    /**
     * Shuffles array in place.
     * @param {Array} array items An array containing the items.
     */
    static shuffle = function (array) {
        let j, tmp, i
        for (i = array.length - 1; i >= 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            //[array[i], array[j]] = [array[j], array[i]]
            tmp = array[i]
            array[i] = array[j]
            array[j] = tmp
        }
        return array
    }
}

module.exports = { Arrays }