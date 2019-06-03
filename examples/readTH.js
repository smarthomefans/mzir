const MZIR = require('../build/index');

const mzir = new MZIR.Mzir("68-3e-34-cc-d7-ad");
console.log(`Create new Meizu BLE IR Gadget(68-3e-34-cc-d7-ad)`);
mzir.once("ready", async () => {
    console.log("Start Read Temp.")
    let temp = await mzir.temperature();
    console.log("Start Read Hum.")
    let hum = await mzir.humidity();
    
    console.log(`Read Meizu BLE IR: temperature=${temp}C, humidity=${hum}%`);
});