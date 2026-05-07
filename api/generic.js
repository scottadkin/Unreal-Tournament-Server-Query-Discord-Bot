import dns from 'node:dns';
const dnsPromises = dns.promises;


export function bIP4Address(value){

    const reg = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i;

    const result = reg.exec(value);

    if(result === null) return false;

    for(let i = 1; i < result.length; i++){

        const part = parseInt(result[i]);
        if(part !== part) return false;

        if(part < 0 || part > 255) return false;
    }

    return true;
}

export function bValidPort(port){

    port = parseInt(port);

    if(port !== port) return false;

    if(port < 0 || port > 65535) return false;

    return true;
}

export async function getIP4Address(address){

    try{

        if(bIP4Address(address)) return address;

        const result = await dnsPromises.lookup(address, {"family": 4});

        return result.address;

    }catch(err){

        console.trace(err);
        return null;
    }

}