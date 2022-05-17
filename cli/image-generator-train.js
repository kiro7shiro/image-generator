const fs = require('fs')
const path = require('path')
const { Command } = require('commander')

const program = new Command

program
    .description('train a list of images')
    .argument('[location]', 'location of the images', process.cwd())
    .action(location => {
        console.log({ location: path.resolve(location) })
        
    })

program.parse()