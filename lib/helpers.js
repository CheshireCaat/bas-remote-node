const random = (min, max) => {
    return min + Math.floor(Math.random() * (max - min + 1));
}

const sleep = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

module.exports = {
    random,
    sleep
};