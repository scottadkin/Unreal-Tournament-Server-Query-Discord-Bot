import { EmbedBuilder } from "discord.js";
import { getTeamName, getMMSS, appendSpaces, prependSpaces, getTrueFalseIcon, getFlag } from "./generic.js";
import { getAutoQueryChannel } from "./channels.js";
import { EventEmitter } from "node:events";
import { serverTimeout, embedColor, commandPrefix } from "../config/config.js";
import { setServerLastMessageId, getServerCountry } from "./servers.js";


class ServerResponseEmitter extends EventEmitter {}


export default class ServerResponse{

    /**
     * 
     * @param {*} ip 
     * @param {*} port 
     * @param {*} type 
     * @param {*} discordChannel only included in autoquery
     * @param {*} bEdit only included in autoquery
     * @param {*} discordMessage message ref to edit
     */
    constructor(address, port, type, discordChannel, bEdit, discordMessage){


        this.ip = address.ip;
        this.originalAddress = address.originalIP;
        this.port = port - 1;
        this.timeStamp = Math.floor(Date.now() * 0.001);
        this.type = type;
        this.bTimedOut = false;
        //used for full server query to prevent bot editing same message twice if edit is taking a long time
        this.bSentMessage = false;
        this.discordChannel = 0;
        this.bUnreal = false; //Unreal instead of UT
        this.bHaveUnrealBasic = false;
        this.bHaveUnrealMutators = false;
        this.country = "";

        this.bDelete = false;

        this.events = new ServerResponseEmitter(); 


        this.events.once("timeout", () =>{

            if(this.bSentMessage || this.bDelete) return;
            this.bTimedOut = true;
            if(this.type === "players"){

                this.sendPlayersResponse();
                //this.bDelete = true;
            }else if(this.type === "extended"){
                
               // process.exit();
               this.sendExtendedResponse();
            }else{
                this.sendFullServerResponse();
            }
            //process.exit();
        });
        
        setTimeout(() =>{

            this.events.emit("timeout");

        }, serverTimeout * 1000);
   
        

        if(discordChannel !== undefined){

            this.discordChannel = discordChannel;

            this.bEdit = false;
            this.discordMessage = discordMessage;

            if(bEdit !== undefined){
                this.bEdit = true;
            }
        }

        this.name = "Another UT Server";
        this.gametype = "Deathmatch";
        this.mapName = "DM-MapName";
        this.currentPlayers = 0;
        this.maxPlayers = 0;
        this.spectators = 0;
        this.players = [];
        this.totalPlayers = 0;

        this.mutators = [];

        this.adminName = "N/A";
        this.adminEmail = "N/A";
        this.friendlyFire = "0%";
        this.changeLevels = false;
        this.balancedTeams = false;
        this.playersBalanceTeams = false;
        this.maxTeams = "N/A";


        this.teams = [
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0}
        ];
    }

    triggerFinished(){

        this.bSentMessage = true;
        this.bDelete = true;
        this.events.emit("loaded-data");
    }

    getSex(mesh){

        const femaleReg = /female/i;

        if(femaleReg.test(mesh)){
            return "Female";
        }

        return "Male";
    }


    getMaxPlayerNameLength(){

        let longest = 0;

        for(let i = 0; i < this.players.length; i++){

            const p = this.players[i];

            if(p.name.length > longest){
                longest = p.name.length;
            }
        }

        return longest;
    }

    createPlayersString(team, bSpectator){

        let string = "";

        for(let i = 0; i < this.players.length; i++){

            const p = this.players[i];

            let currentFlag = getFlag(p.country);


            if(!bSpectator){

                if(p.mesh?.toLowerCase() != "spectator"){

                    if(team == -99){

                        if(p.frags !== undefined){
                            string += `${currentFlag} ${this.sanitizeName(p.name)} **${p.frags}**\n`;
                        }

                    }else{

                        if(parseInt(p.team) == team){

                            string += `${currentFlag} ${this.sanitizeName(p.name)} **${p.frags}**\n`;
                          
                        }
                    }
                }
                continue;
            }
     
            if(p.mesh?.toLowerCase() == "spectator" || p.frags === undefined){

                if(string != ""){
                    string += ", ";
                }

                if(currentFlag == ":video_game:"){
                    currentFlag = ":eyes:";
                }
                string += `${currentFlag} ${this.sanitizeName(p.name)}`;
            }
           
        }

        if(string == ""){
            if(!bSpectator){
                string = ":zzz: No players.";
            }else{
                string = ":zzz: There are currently no spectators.";
            }
        }

        return string;
    }

    sanitizeName(name) {
        return name.replaceAll(":", "\\:").replaceAll("*", "\\*").replaceAll("__", "\\_\\_");
    }

    createPlayerFields(){

        const fields = [];

        const teamNames = [
            `:red_square: Red Team ${this.teams[0].score}`,
            `:blue_square: Blue Team ${this.teams[1].score}`,
            `:green_square: Green Team ${this.teams[2].score}`,
            `:yellow_square: Yellow Team ${this.teams[3].score}`
        ];

        this.maxTeams = parseInt(this.maxTeams);

        if(this.maxTeams !== this.maxTeams){

            fields.push(
                {"name": "Players", "value":this.createPlayersString(-99, false), "inline": false}
            );

        }else if(this.totalPlayers > 0){

            for(let i = 0; i < this.maxTeams; i++){

                fields.push(
                    {"name": teamNames[i], "value": this.createPlayersString(i, false), "inline": true }
                );
            }
        }

        if(this.spectators > 0) {

            fields.push({
                "name": `${this.spectators} ${this.spectators === 1 ? 'Spectator' : 'Spectators'}`, "value": `${this.createPlayersString(-1, true)}`, "inline": false
            });
        }


        return fields;
    }

    sortPlayersByScore(){

        this.players.sort((a, b) =>{

            if(a.frags === undefined){
                a = -Infinity;
            }else{
                a = a.frags;
            }

            if(b.frags === undefined){
                b = -Infinity;
            }else{
                b = b.frags;
            }


            if(a < b){
                return 1;
            }else if(a > b){
                return -1;
            }

            return 0;
        });

    }

    getServerCountry(){

        let country = "";

        /*if(this.country !== '' && this.country.toLowerCase() !== 'none'){

            country = `:flag_${this.country.toLowerCase()}: `;

        }else{*/

            country = getServerCountry(this.ip, this.port);

            if(country === null || country === ""){
                country = "";
            }else{
                country = `:flag_${country.toLowerCase()}:`;
            }
        //}
        

        return country;
    }

    async sendFullServerResponse(){

        try{
                

            if(this.type != "full"){

                return;
            }

            //prevent bot trying to edit the same message twice
            this.bSentMessage = true;

            if(this.bTimedOut && !this.bEdit){

                const autoChannelId = getAutoQueryChannel();

                if(autoChannelId !== null){
                    //stop bot posting timeouts in autochannel
                    if(this.discordChannel.id === autoChannelId){
                        this.bDelete = true;
                        return;
                    }
                }

                let string = `:no_entry: **${this.ip}:${this.port}** has timed out!`;

                if(this.ip === undefined){
                    string = `:no_entry: That ip does not exist!`;
                }

                
                await this.discordChannel.send(string);
                this.bDelete = true;
                return;
        
            }
    
            this.sortPlayersByScore();
            
            let description = `:wrestling: Players **${this.totalPlayers}/${this.maxPlayers}\n`;
            description += `:pushpin: ${this.gametype}\n`;
            description += `:map: ${this.mapName}**\n`;

            
            if(!this.bUnreal){
                description += `:goal: Target Score **${this.goalscore}**\n`;
            }

            if(this.timeLimit !== undefined){
                description += `:stopwatch: Time Limit **${this.timeLimit} Minutes**
                `;
            }

            if(this.remainingTime !== undefined){
                description += `:stopwatch: Time Remaining **${getMMSS(this.remainingTime)} Minutes**
                `;
            }

            if(this.protection !== undefined){
                description += `:shield: ${this.protection}`;
            }

            const country = `${this.getServerCountry()} `;

            let fields = this.createPlayerFields()

            if(this.ip !== this.originalAddress){
                fields.push({"name": "Domain Address", "value": `unreal://${this.originalAddress}:${this.port}`, "inline": false});
            }

            fields.push({"name": "IP Address", "value": `unreal://${this.ip}:${this.port}`, "inline": false});
            
                
            const embed = new EmbedBuilder()
            .setTitle(`${country}${this.name}`)
            .setColor(embedColor)
            .setDescription(`${description}`)
            .addFields(fields)
            .setTimestamp(new Date(Date.now()));


            if(!this.bEdit){

                const m = await this.discordChannel.send({ embeds: [embed] });

                const autoQueryChannelId = getAutoQueryChannel();

                if(autoQueryChannelId !== null){

                    if(autoQueryChannelId === m.channel.id){
                        
                        setServerLastMessageId(this.ip, this.port, m.id);
                    }
                }

                this.bDelete = true;

            }else{

                embed.setTimestamp(new Date(Date.now()));

                await this.discordMessage.edit({ embeds: [embed]});

                this.bDelete = true;
            
                
            }

        }catch(err){
            console.trace(err);
            
            this.bDelete = true;
        }
    }

    updatePlayer(id, key, value){

        id = parseInt(id);

        for(let i = 0; i < this.players.length; i++){

            if(this.players[i].id !== id) continue;

            if(key === "mesh"){

                if(value.toLowerCase() == "spectator"){
                    this.spectators++;
                }else{
                    this.totalPlayers++;
                }
            }

            this.players[i][key] = value;
            return;
            
        }

        this.players.push(
            {"id": id, "name": value.toString().replace(/`/ig,'') }
        );
    }

    getLongestDeaths(bAlt){

        let best = 0;

        for(let i = 0; i < this.players.length; i++){

            const p = this.players[i];

            const c = (bAlt === undefined) ? p.deaths : p.frags;

            if(c === undefined) continue;

            const length = c.toString().length;

            if(length > best){
                best = length;
            }  
        }

        return best;
    }

    bAnyPlayerHave(key){

        for(let i = 0; i < this.players.length; i++){

            if(this.players[i][key] !== undefined){
                return true;
            }
        }

        return false;
    }

    sendPlayersResponse(){

        if(this.mapName === "DM-MapName"){

            this.discordChannel.send("```Failed to get data from server.```");
            this.bDelete = true;
            return;
        }

        let playerNameLength = this.getMaxPlayerNameLength() + 1;

        if(playerNameLength < 5){
            playerNameLength = 5;
        }

        let longestDeaths = this.getLongestDeaths() + 1;
        let longestFrags = this.getLongestDeaths(true) + 1;

        if(longestDeaths < 6){
            longestDeaths = 6;
        }

        if(longestFrags < 6){
            longestFrags = 6;
        }

        this.sortPlayersByScore();
        
        const nameTitle = appendSpaces("Name", playerNameLength);
        const sexTitle = appendSpaces("Model", 7);
        const teamTitle = prependSpaces("Team", 9);
        let deathsTitle = prependSpaces("Deaths", longestDeaths);
        const fragsTitle = prependSpaces("Frags", longestFrags);
        let timeTitle = prependSpaces("Time", 6);
        const pingTitle = prependSpaces("Ping", 6);
        let spreeTitle = prependSpaces("Spree", 5);
        let healthTitle = prependSpaces("Health", 7);

        let bIgnoreDeaths = false;
        let bIgnoreTime = false;
        let bIgnoreSpree = false;
        let bIgnoreHealth = false;

        if(!this.bAnyPlayerHave("deaths")){
            deathsTitle = "";
            bIgnoreDeaths = true;
        }

        if(!this.bAnyPlayerHave("time")){
            timeTitle = "";
            bIgnoreTime = true;
        }

        if(!this.bAnyPlayerHave("spree")){
            spreeTitle = "";
            bIgnoreSpree = true;
        }

        if(!this.bAnyPlayerHave("health")){
            healthTitle = "";
            bIgnoreHealth = true;
        }    


        let string = "";

        if(this.players.length > 0){

            string = `:flag_white: \`${nameTitle}${sexTitle}${teamTitle}${pingTitle}${timeTitle}${healthTitle} ${spreeTitle} ${deathsTitle}${fragsTitle}\`\n`;
        }


        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${this.getServerCountry()} ${this.name}`);

        for(let i = 0; i < this.players.length; i++){

            const p = this.players[i];

            if(p.country == ""){
                p.country = "None";
            }

            if(p.spree == 0 || p.spree === undefined){
                p.spree = "";
            }

            if(p.deaths === undefined){
                p.deaths = "";
            }

            if(p.time === undefined){
                p.time = "";
            }

            if(p.health === undefined){
                p.health = "";
            }

            const name = appendSpaces(p.name, playerNameLength);

            const flag = getFlag(p.country);
            const sex = appendSpaces(this.getSex(p.mesh), 7);

            let deaths = "";

            if(!bIgnoreDeaths){
                deaths = prependSpaces(p.deaths, longestDeaths);
            }

            const frags = prependSpaces(p.frags, longestFrags);

            let time = "";

            if(!bIgnoreTime){
                time = prependSpaces(p.time, 6);
            }

            const ping = prependSpaces(p.ping, 6);  

            let health = "";

            if(!bIgnoreHealth){
                health = prependSpaces(p.health, 7);
            }

            let spree = "";

            if(!bIgnoreSpree){
                spree = prependSpaces(p.spree, 5);
            }

            let team = getTeamName(p.team);

            if(p.mesh == "Spectator"){
                team = "Spectator";
            }

            team = prependSpaces(team, 9);
            string += `${getFlag(p.country)} \`${name}${sex}${team}${ping}${time}${health} ${spree} ${deaths}${frags}\`\n`;
        }

        if(this.players.length == 0){
            string += `:zzz: **There are currently no players in the server.**`;
        }

        embed.setDescription(string)

        this.discordChannel.send({"embeds": [embed]});

        this.bDelete = true;
    }

    sendExtendedResponse(){

        if(this.bUnreal){
            this.sendUnrealExtendedResponse();
            return;
        }

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${this.getServerCountry()} ${this.name}`);

        if(this.serverVersion === undefined){

            embed.setDescription("Failed to fetch data.")
            .setTitle(`${commandPrefix}extended ${this.ip}:${this.port}`);
            this.discordChannel.send({"embeds": [embed]});
            this.bDelete = true;
            return;
        }

        const fields = [];

        const dedicated = (this.dedicated) ? "Listen" : "Dedicated";

        this.password = getTrueFalseIcon(this.password);
        this.balancedTeams = getTrueFalseIcon(this.balancedTeams);
        this.playersBalanceTeams = getTrueFalseIcon(this.playersBalanceTeams);
        this.changeLevels = getTrueFalseIcon(this.changeLevels);
        this.tournament = getTrueFalseIcon(this.tournament);

        fields.push({"name": "Address", "value": `${this.ip}:${this.port}`, "inline": false});
        fields.push({"name": "Admin Info", "value": `**Admin:** ${this.adminName} **Email:** ${this.adminEmail}`, "inline": false});
        fields.push({"name": "Patch Info", "value": `**Server Version: ** ${this.serverVersion}, **Min Compatible Client: **${this.minClientVersion} `, "inline": false});
        fields.push({
            "name": "Server Settings", 
            "value": 
                `**Server Type:** ${dedicated}
                **Password Protected:** ${this.password}
                **Change Levels:** ${this.changeLevels}
                **Balance Teams:** ${this.balancedTeams}
                **Players Balance Teams:** ${this.playersBalanceTeams}
                **Max Teams:** ${this.maxTeams}
                **FriendlyFire:** ${this.friendlyFire}
                **Tournament Mode:** ${this.tournament}
                **Gamestyle:** ${this.gamestyle}`, 
            "inline": false
        });

        fields.push({
            "name": "Current Match",
            "inline": false,
            "value": `**Gametype:** ${this.gametype}
                **Map:** ${this.mapName}
                **Players:** ${this.currentPlayers}/${this.maxPlayers}`
        });

        let mutatorString = "";

        if(this.mutators.length === 0 || (this.mutators.length === 1 && this.mutators[0] === " ")){
            mutatorString += `None publicly listed.`;
            this.mutators = [];

        }


        for(let i = 0; i < this.mutators.length; i++){

            const m = this.mutators[i];

            mutatorString += `${m}`;

            if(i < this.mutators.length - 1){
                mutatorString += ', ';
            }else{
                mutatorString += '.';
            }
        }

        fields.push({"name": "Mutators", "value": mutatorString, "inline": false});

        embed.addFields(fields);
        this.discordChannel.send({"embeds": [embed]});
        //this.discordChannel.send(string);
        this.bDelete = true;
    }


    sendUnrealExtendedResponse(){

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${this.getServerCountry()} ${this.name}`);

        const fields = [];

        fields.push({"name": "Address", "value": `${this.ip}:${this.port}`, "inline": false});
        fields.push({
            "name": "Patch Info", 
            "value": `**Server Version:** ${this.serverVersion} **Min Compatible: **${this.minClientVersion} **Admin:** ${this.adminName}`,
            "inline": false
        });
        fields.push({
            "name": "Current Match", 
            "value": 
                `**Gametype:** ${this.gametype}
                **Map:** ${this.mapName}
                **Players:** ${this.currentPlayers}/${this.maxPlayers}`, 
            "inline": false
        });

        let mutatorString = "";

        if(this.mutators.length == 0){
            mutatorString += `None publicly listed.`;
        }

        for(let i = 0; i < this.mutators.length; i++){

            const m = this.mutators[i];

            mutatorString += `${m}`;

            if(i < this.mutators.length - 1){
                mutatorString += ', ';
            }else{
                mutatorString += '.';
            }
        }

        fields.push({
            "name": "Mutators", 
            "value": mutatorString,
            "inline": false
        });


        embed.setFields(fields);

        this.discordChannel.send({"embeds": [embed]});
        this.bDelete = true;
    }

    //used to check unreal player count
    getCurrentPlayers(){

        let total = 0;

        for(let i = 0; i < this.players.length; i++){

            const p = this.players[i];

            if(p.mesh.toLowerCase() !== 'spectator'){
                total++;
            }
        }

        return total;
    }

    bFetchedAllPlayers(){

        const totalPlayers = this.getCurrentPlayers();

        if(parseInt(this.currentPlayers) <= totalPlayers){
            return true;
        }

        return false;
    }
}