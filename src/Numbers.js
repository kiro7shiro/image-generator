class Numbers {
    static decode = function (value, { min = 0, max = 1 } = {}) {
        return max * value - min * value + min
    }

    static encode = function (value, { min = 0, max = 1 } = {}) {
        return (value - min) / (max - min)
    }

    static randFloat = function ({ min = 0, max = 1, decimals = false, inclusive = false } = {}) {
        let result = 0
        if (inclusive) {
            result = Math.random() * (max - min + 1) + min
        }else{
            result = Math.random() * (max - min) + min
        }
        if (decimals) return Numbers.round(result, { decimals })
        return result
    }

    static randInt = function ({ min = 0, max = 1, inclusive = false } = {}) {
        if (inclusive) return Math.floor(Math.random() * (max - min + 1)) + min
        return Math.floor(Math.random() * (max - min)) + min
    }

    static round = function (number, { decimals = 0 } = {}) {
        return Number(number.toFixed(decimals))
    }
}

module.exports = { Numbers }