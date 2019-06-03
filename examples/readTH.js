const MZIR = require('../build/index');

async function demo(mzir) {
    let temp = await mzir.temperature();
    let hum = await mzir.humidity();
    
    console.log(`Read Meizu BLE IR: temperature=${temp}C, humidity=${hum}%`);
}

const mzir = new MZIR.Mzir();
demo(mzir);