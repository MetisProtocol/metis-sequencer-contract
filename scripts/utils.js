const fs = require('fs')

function getContractAddresses() {
    return JSON.parse(fs.readFileSync(`${process.cwd()}/contractAddresses.json`).toString())
}

function writeContractAddresses(contractAddresses) {
    fs.writeFileSync(
        `${process.cwd()}/contractAddresses.json`,
        JSON.stringify(contractAddresses, null, 2) // Indent 2 spaces
    )
}

module.exports = {
    getContractAddresses,
    writeContractAddresses
}