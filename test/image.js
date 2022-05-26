/* const termkit = require('../node_modules/terminal-kit/lib/termkit.js')
const term = termkit.terminal
const sharp = require('sharp')
const getPixels = require('get-pixels')

term.clear()
const screen = termkit.ScreenBuffer.create({
    dst: term,
    height: 4,
    width: 8,
    noFill: true
})
screen.y = 1

const filler = {
    attr: {
        color: 'black',
        bgColor: 'black',
    }
}
screen.fill(filler)

describe('image', function () {
    it('fromNdArray', async function () {
        const file1 = './training/simple/circle.jpg'
        const file2 = './training/simple/square.jpg'
        let image = await termkit.ScreenBuffer.loadImage(
            file1,
            {
                terminal: term,
                shrink: { width: term.width, height: term.height / 3 }
            }
        )
        image.dst = screen
        image.x = 0
        image.draw()
        screen.draw({ delta: true })
        image = await termkit.ScreenBuffer.loadImage(
            file2,
            {
                terminal: term,
                shrink: { width: term.width, height: term.height / 3 }
            }
        )
        image.dst = screen
        image.x = 0
        image.draw()
        screen.draw({ delta: true })
        console.log(image)
        //screen.draw()
    })
}) */