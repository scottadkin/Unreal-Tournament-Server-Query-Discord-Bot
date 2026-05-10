import { EmbedBuilder } from "discord.js";
import { getTeamName, getMMSS, appendSpaces, prependSpaces, getTrueFalseIcon, getFlag } from "./generic.js";
import { getAutoQueryChannel } from "./channels.js";
import { EventEmitter } from 'node:events';


class TestEventEmitter extends EventEmitter{}



export default class ServerResponse{

    constructor(ip, port, type, discordMessage, bEdit, messageId){


        this.events = new TestEventEmitter();

        this.ip = ip;
        this.port = port - 1;
        this.timeStamp = Math.floor(Date.now() * 0.001);
        this.type = type;
        this.bReceivedFinal = false;
        this.bTimedOut = false;
        this.bSentMessage = false;
        this.discordMessage = 0;
        this.bUnreal = false; //Unreal instead of UT
        this.bHaveUnrealBasic = false;
        this.bHaveUnrealMutators = false;

        if(discordMessage !== undefined){

            this.discordMessage = discordMessage;

            this.bEdit = false;
            this.messageId = -1;

            if(bEdit !== undefined){
                this.bEdit = true;
            }

            if(messageId !== undefined){
                this.messageId = messageId;
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
        this.changeLevels = "N/A";
        this.balancedTeams = "N/A";
        this.playersBalanceTeams = "N/A";
        this.maxTeams = "N/A";


        this.teams = [
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0},
            {"score": 0, "size": 0}
        ];

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

        if(this.maxTeams === this.maxTeams){

            for(let i = 0; i < this.maxTeams; i++){

                if(this.totalPlayers > 0) {

                    fields.push(
                        {"name": teamNames[i], "value": this.createPlayersString(i, false), "inline": true }
                    );

                }
            }

        }else{
            fields.push(
                {"name": "Players", "value":this.createPlayersString(-99, false), "inline": false}
            );
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

        if(this.country != undefined){

            if(this.country != '' && this.country.toLowerCase() !== 'none'){
                country = `:flag_${this.country.toLowerCase()}: `;
            }
        }

        return country;
    }

    async sendFullServerResponse(channels, servers, embedColor){

        try{


            if(this.type != "full"){
                return;
            }

            if(this.bTimedOut && !this.bEdit){

                const autoChannelId = getAutoQueryChannel();

                if(autoChannelId !== null){
                    //stop bot posting timeouts in autochannel
                    if(this.discordMessage.id === autoChannelId){
                        this.bSentMessage = true;
                        return;
                    }
                }

                let string = `:no_entry: **${this.ip}:${this.port}** has timed out!`;

                if(this.ip === undefined){
                    string = `:no_entry: That ip does not exist!`;
                }

                this.bSentMessage = true;
                return await this.discordMessage.send(string);
        
            }
    
            this.sortPlayersByScore();

            this.bReceivedFinal = true;
            
            let description = `:wrestling: Players **${this.totalPlayers}/${this.maxPlayers}`;
            description += `:pushpin: ${this.gametype}`;
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

            const country = this.getServerCountry();

            let fields = this.createPlayerFields()
            fields.push({"name": "Join Server", "value": `unreal://${this.ip}:${this.port}`, "inline": false});
                
            const embed = new EmbedBuilder()
            .setTitle(`${country}${this.name}`)
            .setColor(embedColor)
            .setDescription(`${description} ${new Date(Date.now())}`)
            .addFields(fields)
            .setTimestamp();


            if(!this.bEdit){

                const m = await this.discordMessage.send({ embeds: [embed] });

                const autoQueryChannelId = getAutoQueryChannel();

                if(autoQueryChannelId !== null){

                    if(autoQueryChannelId === m.channel.id){
                        
                        servers.setLastMessageId(this.ip, this.port, m.id);
                    }
                }

                this.bSentMessage = true;

            }else{

                console.log("FETCH DISCORD");
                const messageToEdit = await this.discordMessage.messages.fetch(this.messageId)
                embed.setTimestamp();

                console.log("EDIT DISCORD");


                //get around rate limit?
                setTimeout(async () =>{
                    await messageToEdit.edit({ embeds: [embed]});
                    this.bSentMessage = true;
                }, 1500);
                
            }

        }catch(err){
            console.trace(err);
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

        let string = `${this.getServerCountry()}**${this.name}**\n`;

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

        string += `:flag_white: \`${nameTitle}${sexTitle}${teamTitle}${pingTitle}${timeTitle}${healthTitle} ${spreeTitle} ${deathsTitle}${fragsTitle}\`\n`;

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
            string += `:zzz: **There are currently no players in the servers.**`;
        }

        this.discordMessage.send(string);

        this.bSentMessage = true;
    }

    sendExtendedResponse(){

        if(this.bUnreal){
            this.sendUnrealExtendedResponse();
            return;
        }

        let string = `${this.getServerCountry()}**${this.name}**\n`;

        const dedicated = (this.dedicated) ? "Listen" : "Dedicated";

        this.password = getTrueFalseIcon(this.password);
        this.balancedTeams = getTrueFalseIcon(this.balancedTeams);
        this.playersBalanceTeams = getTrueFalseIcon(this.playersBalanceTeams);
        this.changeLevels = getTrueFalseIcon(this.changeLevels);
        this.tournament = getTrueFalseIcon(this.tournament);

        string += `**Address:** ${this.ip}:${this.port}\n`;
        string += `**Server Version:** ${this.serverVersion} **Min Compatible: **${this.minClientVersion} **Admin:** ${this.adminName} **Email:** ${this.adminEmail}\n`;
        string += `**Server Type:** ${dedicated} **Password Protected:** ${this.password} **Change Levels:** ${this.changeLevels}\n`;
        string += `**Balance Teams:** ${this.balancedTeams} **Players Balance Teams:** ${this.playersBalanceTeams} **Max Teams:** ${this.maxTeams}\n`;
        string += `**FriendlyFire:** ${this.friendlyFire} **Tournament Mode:** ${this.tournament} **Gamestyle:** ${this.gamestyle}\n`;
        string += `**Gametype:** ${this.gametype} `;
        string += `**Map:** ${this.mapName} `;
        string += `**Players:** ${this.currentPlayers}/${this.maxPlayers}\n`;   
        string += `**Mutators: **`;

        if(this.mutators.length == 0){
            string += `None publicly listed.`;
        }

        for(let i = 0; i < this.mutators.length; i++){

            const m = this.mutators[i];

            string += `${m}`;

            if(i < this.mutators.length - 1){
                string += ', ';
            }else{
                string += '.';
            }
        }

        this.discordMessage.send(string);
        this.bSentMessage = true;
    }


    sendUnrealExtendedResponse(){

        let string = `${this.getServerCountry()}**${this.name}**\n`;

        const dedicated = (this.dedicated) ? "Listen" : "Dedicated";

        this.password = getTrueFalseIcon(this.password);
        this.balancedTeams = getTrueFalseIcon(this.balancedTeams);
        this.playersBalanceTeams = getTrueFalseIcon(this.playersBalanceTeams);
        this.changeLevels = getTrueFalseIcon(this.changeLevels);
        this.tournament = getTrueFalseIcon(this.tournament);

        string += `**Address:** ${this.ip}:${this.port}\n`;
        string += `**Server Version:** ${this.serverVersion} **Min Compatible: **${this.minClientVersion} **Admin:** ${this.adminName}\n`;
        string += `**Gametype:** ${this.gametype} `;
        string += `**Map:** ${this.mapName} `;
        string += `**Players:** ${this.currentPlayers}/${this.maxPlayers}\n`;
        string += `**Mutators: **`;

        if(this.mutators.length == 0){
            string += `None publicly listed.`;
        }

        for(let i = 0; i < this.mutators.length; i++){

            const m = this.mutators[i];

            string += `${m}`;

            if(i < this.mutators.length - 1){
                string += ', ';
            }else{
                string += '.';
            }
        }

        this.discordMessage.send(string);
        this.bSentMessage = true;
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