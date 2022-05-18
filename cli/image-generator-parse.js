const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const { Data } = require('../src/Data.js')

const program = new Command

program
    .description('parse data into a training set')
    .argument('<source>', 'data source to parse')
    .argument('[destination]', 'destination to save data to')
    .action(async function (source, destination) {
        const resolved = path.resolve(source)
        const result = await Data.parse(resolved)
        const json = result.serialize({ space: 4 })
        const name = path.basename(resolved)
        if (!destination) {
            destination = path.resolve(source, `${name}.json`)
        } else {
            destination = path.resolve(destination, `${name}.json`)
        }
        fs.writeFileSync(destination, json)
        console.log({ destination })
    })

program.parse()