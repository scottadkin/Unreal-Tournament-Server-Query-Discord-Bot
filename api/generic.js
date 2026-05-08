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
        throw new Error(`Ip4 address not found for domain ${address}`);
    }
}

export function getTeamName(teamId){

    teamId = parseInt(teamId);
    
    if(teamId !== teamId) return "None";

    switch(teamId){
        case 0:     return "Red";
        case 1:     return "Blue";
        case 2:     return "Green";
        case 3:     return "Yellow";
        default:    return null; 
    }
}

export function getMMSS(input){

    let seconds = Math.floor(input % 60);
    let minutes = Math.floor(input / 60);

    if(seconds < 10){
        seconds = "0"+seconds;
    }

    if(minutes < 10){
        minutes = "0"+minutes;
    }

    return minutes+":"+seconds;
    
}


export function appendSpaces(value, targetLength){

    value = value.toString();

    if(value.length > targetLength){

        return value.substring(0, targetLength)

    }else{

        while(value.length < targetLength){

            value += " ";
        }
    }

    return value;
}


export function prependSpaces(value, targetLength){

    if(value === undefined){
        value = 0;
    }

    value = value.toString();

    if(value.length > targetLength){

        return value.substring(0, targetLength)

    }else{

        while(value.length < targetLength){

            value = ` ${value}`;
        }
    }

    return value;
}


export function getTrueFalseIcon(value){

    if(value === undefined) return;

    value = value.toString().toUpperCase();

    if(value == 'TRUE'){
        return ':white_check_mark:';
    }else if(value == 'FALSE'){
        return ':x:';
    }

    return value;
}

export function getFlag(country){

    if(country === undefined){
        return ":video_game:";
    }else{

        let currentFlag = "";

        currentFlag = `:flag_${country}:`;

        if(country.toLowerCase() == "none"){
            return ":video_game:";
        }

        return currentFlag;
    }
}