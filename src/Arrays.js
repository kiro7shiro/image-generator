class Arrays {
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