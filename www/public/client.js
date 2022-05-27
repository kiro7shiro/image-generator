const socket = io()
/* var cvs = document.getElementById('screen')
var ctx = cvs.getContext('2d')
ctx.fillStyle = "blue";
ctx.fillRect(0, 0, cvs.width, cvs.height)
socket.on('imageData', function (imageData) {
    const { data } = imageData
    const raw = new Uint8ClampedArray(data)
    console.log({ raw })
    var img = ctx.createImageData(16, 16)
    img.data.set(raw)
    console.log({ img })
    ctx.putImageData(img, 0, 0)
}) */

socket.on('connect', function () {
    console.log(`connected`)
    socket.emit('getTargets')
})

socket.on("disconnect", function (reason) {
    console.log(`disconnected: ${reason}`)
})

socket.on('setTargets', function (targets) {
    const targetsDiv = document.getElementById('targets')
    const childs = []
    for (let tCnt = 0; tCnt < targets.length; tCnt++) {
        const target = targets[tCnt]
        const targetImg = new Image()
        targetImg.src = `/training/simple/${target}`
        childs.push(targetImg)
    }
    targetsDiv.replaceChildren(...childs)
})

function updateResults() {
    const resultsDiv = document.getElementById('results')
    for (let cCnt = 0; cCnt < resultsDiv.children.length; cCnt++) {
        const child = resultsDiv.children[cCnt]
        const imgUrl = child.src
        // create a new timestamp
        let timestamp = new Date().getTime()
        let queryString = "?t=" + timestamp
        if (imgUrl.indexOf('?t=') > 1) {
            child.src = imgUrl.split('?t=')[0] + queryString
        } else {
            child.src = imgUrl + queryString
        }
    }
}

socket.on('update', function (info) {
    const { iterations, error, results, genome, fitness } = info
    const resultsDiv = document.getElementById('results')
    if (resultsDiv.children.length < 1) {
        const childs = []
        for (let tCnt = 0; tCnt < results.length; tCnt++) {
            const result = results[tCnt]
            const resultImg = new Image()
            resultImg.src = `/training/results/${result}`
            childs.push(resultImg)
        }
        resultsDiv.replaceChildren(...childs)
    } else {
        requestAnimationFrame(updateResults)
    }
    let reportTxt = `iterations: ${iterations}\nerror: ${error}\n`
    reportTxt += JSON.stringify(genome, null, 4)
    const lines = reportTxt.split('\n')
    const consoleDiv = document.getElementById('console')
    for (let lCnt = 0; lCnt < lines.length; lCnt++) {
        const lineTxt = lines[lCnt]
        const newLine = document.createElement('li')
        newLine.innerHTML = lineTxt
        consoleDiv.appendChild(newLine)
        consoleDiv.scrollTop = consoleDiv.scrollHeight
    }
    //console.log({ iterations, error })
})