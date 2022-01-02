const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const { createReadStream } = require('fs-extra');
const concat = require('concat-stream');
const toml = require('toml');

const argv = yargs(hideBin(process.argv))
    .option('c', {
        type: 'string',
        describe: 'Path to configuration file',
        demandOption: true
    })
    .option('v', {
        type: 'string',
        describe: 'Name of config value to obtain',
        demandOption: true
    })
    .option('e', {
        type: 'string',
        describe: 'Name of SAM config environment',
        default: 'default'
    })
    .argv;


createReadStream(argv.c, 'utf8').pipe(concat(function(data) {
    let parsed;
    try {
        parsed = toml.parse(data);
    } catch (ex) {
        console.error(new Error(`Error occured during parsing ${ex}`));
        process.exitCode = 1;
        process.exit();
    }

    const environmentConfig = parsed[argv.e]?.deploy?.parameters;
    if (!environmentConfig || !environmentConfig[argv.v]) {
        console.error(
            new Error(`Configuration does not exist for environment ${argv.e}`)
        );

        process.exitCode = 1;
        process.exit();
    }

    console.log(environmentConfig[argv.v]);
}));
