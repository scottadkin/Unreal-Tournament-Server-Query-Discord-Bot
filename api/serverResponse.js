//const Discord = require('discord.js');
//const geoip = require('geoip-lite');
//const countryList = require('country-list');
//const config = require('./config.json');
//const Servers = require('./servers');
//const Channels = require('./channels');
//const Buffer = require('buffer');


class ServerResponse{

    constructor(ip, port, type, discordMessage, bEdit, messageId){

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
            //this.channels = new Channels();

            this.bEdit = false;
            this.messageId = -1;

            if(bEdit !== undefined){
                this.bEdit = true;
            }

            if(messageId !== undefined){
                this.messageId = messageId;
            }
        }

        //this.servers = new Servers();


        this.name = "Another UT Server";
        this.gametype = "Deathmatch";
       // this.map = "DM-MapName";
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


    getFlag(country){

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


    getSex(mesh){

        const femaleReg = /female/i;

        if(femaleReg.test(mesh)){
            return "Female";
        }

        return "Male";
    }


    getMaxPlayerNameLength(){

        let longest = 0;

        let p = 0;

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

            if(p.name.length > longest){
                longest = p.name.length;
            }
        }

        return longest;
    }

    createPlayersString(team, bSpectator){

        let string = "";

        let p = 0;

        let currentFlag = "";

        //console.table(this.players);

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

            currentFlag = this.getFlag(p.country);

            if(!bSpectator){
                
                if(p.mesh.toLowerCase() != "spectator"){
                    if(team == -99){

                        if(p.frags !== undefined){
                            string += `${currentFlag} ${p.name} **${p.frags}**\n`;
                        }

                    }else{

                        if(parseInt(p.team) == team){

                            //if(p.mesh.toLowerCase() != "spectator"){
                                string += `${currentFlag} ${p.name} **${p.frags}**\n`;
                           // }
                        }
                    }
                }

            }else if(bSpectator){
                    
                if(p.mesh.toLowerCase() == "spectator" || p.frags === undefined){

                    if(string != ""){
                        string += ", ";
                    }

                    if(currentFlag == ":video_game:"){
                        currentFlag = ":eyes:";
                    }
                    string += `${currentFlag} ${p.name}`;
                }
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

                fields.push(
                    {"name": teamNames[i], "value": this.createPlayersString(i, false), "inline": true }
                );
            }

        }else{
            fields.push(
                {"name": ":wrestling: Players", "value":this.createPlayersString(-99, false), "inline": false}
            );
        }

        fields.push({
            "name": ":eye: Spectators", "value": `${this.createPlayersString(-1, true)}`, "inline": false}
        );


        return fields;
    }

    getMMSS(input){

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

    async sendFullServerResponse(channels, servers,embedColor, Discord){

        try{
            if(this.type != "full"){
                return;
            }

            if(this.bTimedOut){

                if(!this.bEdit){


                    const autoChannelId = await channels.getAutoQueryChannel();

                    if(autoChannelId !== null){
                        //stop bot posting timeouts in autochannel
                        if(this.discordMessage.id === autoChannelId){
                            this.bSentMessage = true;
                            return;
                        }
                    }

                    let string = `:no_entry: **${this.ip}:${this.port}** has timedout!`;

                    if(this.ip === undefined){
                        string = `:no_entry: That ip does not exist!`;
                    }

                    this.bSentMessage = true;
                    this.discordMessage.send(string);
                    return;
                }
                

                this.bSentMessage = true;
                return;
            }

            this.sortPlayersByScore();

            //console.table(this.players);

            this.bReceivedFinal = true;


            let description = `
:wrestling: Players **${this.totalPlayers}/${this.maxPlayers}
:pushpin: ${this.gametype}
:map: ${this.mapName}**\n`;
            
            if(!this.bUnreal){
                description += `:goal: Target Score **${this.goalscore}**\n`;
            }

            /*description = :stopwatch: Time Limit ${this.timeLimit} Minutes
            :stopwatch: Time Remaining ${this.getMMSS(this.remainingTime)} Minutes*/

            if(this.timeLimit !== undefined){
                description += `:stopwatch: Time Limit **${this.timeLimit} Minutes**
                `;
            }

            if(this.remainingTime !== undefined){
                description += `:stopwatch: Time Remaining **${this.getMMSS(this.remainingTime)} Minutes**
                `;
            }

            if(this.protection !== undefined){
                description += `:shield: ${this.protection}`;
            }
        // console.table(this.players);

            const country = this.getServerCountry();

            const fields = this.createPlayerFields();

            
            const embed = new Discord.MessageEmbed()
            .setTitle(`${country}${this.name}`)
            .setColor(embedColor)
            .setDescription(`${description}`)
            .addFields(fields)
            .addField("Join Server",`**<unreal://${this.ip}:${this.port}>**`,false)
            .setTimestamp();


            if(!this.bEdit){

                this.discordMessage.send(embed).then(async (m) =>{

                    try{

                        const autoQueryChannelId = await channels.getAutoQueryChannel();

                        if(autoQueryChannelId !== null){

                            if(autoQueryChannelId === m.channel.id){
                                
                                servers.setLastMessageId(this.ip, this.port, m.id);

                            }
                        }

                        this.bSentMessage = true;

                    }catch(err){
                        console.trace(err);
                    }    
                });

            }else{

                this.discordMessage.messages.fetch(this.messageId).then((message) =>{

                    message.edit(embed).then(() =>{

                        this.bSentMessage = true;

                    }).catch((err) =>{
                        console.trace(err);
                    });

                }).catch((err) =>{

                    console.trace(err);
                });
            }
        }catch(err){
            console.trace(err);
        }
    }

    updatePlayer(id, key, value){

        id = parseInt(id);

        for(let i = 0; i < this.players.length; i++){

            if(this.players[i].id === id){

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
        }

        this.players.push(
            {"id": id, "name": value.toString().replace(/`/ig,'') }
        );
    }

    appendSpaces(value, targetLength){

        value = value.toString();

        //console.log(`Input = ${value}`);

        if(value.length > targetLength){

            return value.substring(0, targetLength)

        }else{

            while(value.length < targetLength){

                value += " ";
            }
        }

        return value;
    }

    prependSpaces(value, targetLength){

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


    getLongestDeaths(bAlt){

        let best = 0;

        let length = 0;

        let c = 0;

        for(let i = 0; i < this.players.length; i++){

            if(bAlt === undefined){
                c = this.players[i].deaths;
            }else{
                c = this.players[i].frags;
            }

            if(c !== undefined){

                length = c.toString().length

                if(length > best){
                    best = length;
                }
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

        let p = 0;

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
        
        let nameTitle = this.appendSpaces("Name", playerNameLength);
        let sexTitle = this.appendSpaces("Model", 7);
        let teamTitle = this.prependSpaces("Team", 9);
        let deathsTitle = this.prependSpaces("Deaths", longestDeaths);
        let fragsTitle = this.prependSpaces("Frags", longestFrags);
        let timeTitle = this.prependSpaces("Time", 6);
        let pingTitle = this.prependSpaces("Ping", 6);
        let spreeTitle = this.prependSpaces("Spree", 5);
        let healthTitle = this.prependSpaces("Health", 7);

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

        string += `:rainbow_flag: \`${nameTitle}${sexTitle}${teamTitle}${pingTitle}${timeTitle}${healthTitle} ${spreeTitle} ${deathsTitle}${fragsTitle}\`\n`;

        let name = "";
        let flag = "";
        let sex = "";
        let deaths = "";
        let frags = "";
        let time = "";
        let ping = "";
        let spree = 0;
        let health = 0;
        let team = "Red";

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

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

            name = this.appendSpaces(p.name, playerNameLength);

            flag = this.getFlag(p.country);
            sex = this.appendSpaces(this.getSex(p.mesh), 7);

            if(!bIgnoreDeaths){
                deaths = this.prependSpaces(p.deaths, longestDeaths);
            }else{
                deaths = "";
            }

            frags = this.prependSpaces(p.frags, longestFrags);

            if(!bIgnoreTime){
                time = this.prependSpaces(p.time, 6);
            }else{
                time = "";
            }

            ping = this.prependSpaces(p.ping, 6);  

            if(!bIgnoreHealth){
                health = this.prependSpaces(p.health, 7);
            }else{
                health = "";
            }

            if(!bIgnoreSpree){
                spree = this.prependSpaces(p.spree, 5);
            }else{
                spree = "";
            }

            if(p.team == '0'){
                team = "Red";
                //teamIcon = ":red_square:";
            }else if(p.team == '1'){
                team = "Blue";
               // teamIcon = ":blue_square:"
            }else if(p.team == '2'){
                //teamIcon = ":green_square:";
                team = "Green";
            }else if(p.team == '3'){
                //teamIcon = ":yellow_square:";
                team = "Yellow";
            }else{
                //teamIcon = ":white_large_square:";
                team = "None";
            }

            if(p.mesh == "Spectator"){
                team = "Spectator";
            }

            team = this.prependSpaces(team, 9);
            //console.log(`name = ${test} (${p.name}) targetLength = ${playerNameLength}`);
            string += `${this.getFlag(p.country)} \`${name}${sex}${team}${ping}${time}${health} ${spree} ${deaths}${frags}\`\n`;
        }

        if(this.players.length == 0){
            string += `:zzz: **There are currently no players in the servers.**`
        }

        this.discordMessage.send(string);

        this.bSentMessage = true;
    }

    getTrueFalseIcon(value){

        if(value === undefined) return;

        value = value.toString().toUpperCase();

        if(value == 'TRUE'){
            return ':white_check_mark:';
        }else if(value == 'FALSE'){
            return ':x:';
        }

        return value;

    }

    sendExtendedResponse(){

        if(this.bUnreal){
            this.sendUnrealExtendedResponse();
            return;
        }

        let string = `${this.getServerCountry()}**${this.name}**\n`;

        const dedicated = (this.dedicated) ? "Listen" : "Dedicated";

        this.password = this.getTrueFalseIcon(this.password);
        this.balancedTeams = this.getTrueFalseIcon(this.balancedTeams);
        this.playersBalanceTeams = this.getTrueFalseIcon(this.playersBalanceTeams);
        

        this.changeLevels = this.getTrueFalseIcon(this.changeLevels);

        this.tournament = this.getTrueFalseIcon(this.tournament);

        string += `**Address:** ${this.ip}:${this.port}\n`;
        string += `**Server Version:** ${this.serverVersion} **Min Compatible: **${this.minClientVersion} **Admin:** ${this.adminName} **Email:** ${this.adminEmail}\n`;
        string += `**Server Type:** ${dedicated} **Password Protected:** ${this.password} **Change Levels:** ${this.changeLevels}\n`;
        string += `**Balance Teams:** ${this.balancedTeams} **Players Balance Teams:** ${this.playersBalanceTeams} **Max Teams:** ${this.maxTeams}\n`;
        string += `**FriendlyFire:** ${this.friendlyFire} **Tournament Mode:** ${this.tournament} **Gamestyle:** ${this.gamestyle}\n`;
        string += `**Gametype:** ${this.gametype} `;
        string += `**Map:** ${this.mapName} `;
        string += `**Players:** ${this.currentPlayers}/${this.maxPlayers}\n`;
        

        let m = 0;

        //console.table(this.mutators);

        string += `**Mutators: **`;

        if(this.mutators.length == 0){
            string += `None publicly listed.`;
        }

        for(let i = 0; i < this.mutators.length; i++){

            m = this.mutators[i];

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

        this.password = this.getTrueFalseIcon(this.password);
        this.balancedTeams = this.getTrueFalseIcon(this.balancedTeams);
        this.playersBalanceTeams = this.getTrueFalseIcon(this.playersBalanceTeams);
        

        this.changeLevels = this.getTrueFalseIcon(this.changeLevels);

        this.tournament = this.getTrueFalseIcon(this.tournament);

        string += `**Address:** ${this.ip}:${this.port}\n`;
        string += `**Server Version:** ${this.serverVersion} **Min Compatible: **${this.minClientVersion} **Admin:** ${this.adminName}\n`;
        string += `**Gametype:** ${this.gametype} `;
        string += `**Map:** ${this.mapName} `;
        string += `**Players:** ${this.currentPlayers}/${this.maxPlayers}\n`;
        

        let m = 0;

        //console.table(this.mutators);

        string += `**Mutators: **`;

        if(this.mutators.length == 0){
            string += `None publicly listed.`;
        }

        for(let i = 0; i < this.mutators.length; i++){

            m = this.mutators[i];

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

        let p = 0;

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

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

module.exports = ServerResponse;