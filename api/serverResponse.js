const Discord = require('discord.js');
//const geoip = require('geoip-lite');
//const countryList = require('country-list');
const config = require('./config.json');
const Servers = require('./servers');
const Channels = require('./channels');


class ServerResponse{

    constructor(ip, port, type, discordMessage, bEdit, messageId){

        //console.log(geoip.lookup(ip));
        //this.geo = geoip.lookup(ip);
        //console.log(this.geo);
        this.ip = ip;
        this.port = port - 1;
        this.timeStamp = Math.floor(Date.now() * 0.001);
        this.type = type;
        this.bReceivedFinal = false;
        this.bTimedOut = false;
        this.bSentMessage = false;
        this.discordMessage = discordMessage;

        this.name = "Another UT Server";
        this.gametype = "Deathmatch";
        this.map = "DM-MapName";
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

        this.servers = new Servers();
        this.channels = new Channels();

        this.bEdit = false;
        this.messageId = -1;

        if(bEdit !== undefined){
            this.bEdit = true;
        }

        if(messageId !== undefined){
            this.messageId = messageId;
        }


    }

    async parsePacket(data){


        try{

            data = `${data}`;

            this.parseServerInfoData(data);
            this.parseMapData(data);
            this.parseTeamData(data);
            this.parseMutators(data);
            this.parsePlayerData(data);
            

            const finalReg = /\\final\\$/i;

            if(finalReg.test(data)){

                if(this.type == "full"){

                    this.sendFullServerResponse();
                    return true;

                }else if(this.type == "basic"){

                    await this.servers.updateInfo(this);
                    this.bSentMessage = true;
                    return true;

                }else if(this.type == "players"){

                    this.sendPlayersResponse();
                    return true;

                }else if(this.type == "extended"){

                    this.sendExtendedResponse();
                    return true;
                }
            }

            return false;

        }catch(err){
            console.trace(err);
        }

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

        for(let i = 0; i < this.players.length; i++){

            p = this.players[i];

            currentFlag = this.getFlag(p.country);

            if(!bSpectator){

                if(team == -99){

                    if(p.frags !== undefined){
                        string += `${currentFlag} ${p.name} **${p.frags}**\n`;
                    }

                }else{

                    if(parseInt(p.team) == team){

                        if(p.mesh.toLowerCase() != "spectator"){
                            string += `${currentFlag} ${p.name} **${p.frags}**\n`;
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


        //console.table(fields);

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

            if(this.country != ''){
                country = `:flag_${this.country.toLowerCase()}: `;
            }
        }

        return country;
    }

    sendFullServerResponse(){

        if(this.type != "full"){
            return;
        }

        if(this.bTimedOut){

            if(!this.bEdit){
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
:map: ${this.mapName}**
:goal: Target Score **${this.goalscore}**
`;

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
        .setColor(config.embedColor)
        .setDescription(`${description}`)
        .addFields(fields)
        .addField("Join Server",`**<unreal://${this.ip}:${this.port}>**`,false)
        .setTimestamp();


        if(!this.bEdit){

           // console.log("NOT AN EDIT POST");
            this.discordMessage.send(embed).then(async (m) =>{

                try{

                    const autoQueryChannelId = await this.channels.getAutoQueryChannel();

                    if(autoQueryChannelId !== null){

                        if(autoQueryChannelId === m.channel.id){
                            
                            this.servers.setLastMessageId(this.ip, this.port, m.id);

                        }else{
                            //console.log("posted in a normal channel");
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

                   // console.log("Updated message");

                    this.bSentMessage = true;

                }).catch((err) =>{
                    console.trace(err);
                });

            }).catch((err) =>{

                console.trace(err);
            });
        }
    }

    parseServerInfoData(data){


        const regs = [
            /\\hostname\\(.+?)\\/i,
            /\\gametype\\(.+?)\\/i,
            /\\numplayers\\(\d+?)\\/i,
            /\\maxplayers\\(\d+?)\\/i,
            /\\maxteams\\(\d+?)\\/i,
            /\\gamever\\(\d+?)\\/i,
            /\\minnetver\\(\d+?)\\/i,
            /\\timelimit\\(\d+?)\\/i,
            /\\goalteamscore\\(\d+?)\\/i,
            /\\fraglimit\\(\d+?)\\/i,
            /\\mutators\\(.+?)\\/i,
            /\\timelimit\\(.+?)\\/i,
            /\\remainingtime\\(.+?)\\/i,
            /\\protection\\(.+?)\\/i,
            /\\listenserver\\(.+?)\\/i,
            /\\changelevels\\(.+?)\\/i,
            /\\balanceteams\\(.+?)\\/i,
            /\\playersbalanceteams\\(.+?)\\/i,
            /\\friendlyfire\\(.+?)\\/i,
            /\\tournament\\(.+?)\\/i,
            /\\gamestyle\\(.+?)\\/i,
            /\\password\\(.+?)\\/i,
            /\\adminname\\(.+?)\\/i,
            /\\adminemail\\(.+?)\\/i,
            /\\countrys\\(.+?)\\/i,
        ];

        const keys = [
            "name",
            "gametype",
            "currentPlayers",
            "maxPlayers",
            "maxTeams",
            "serverVersion",
            "minClientVersion",
            "timeLimit",
            "goalscore",
            "goalscore",
            "mutators",
            "timeLimit",
            "remainingTime",
            "protection",
            "dedicated",
            "changeLevels",
            "balancedTeams",
            "playersBalanceTeams",
            "friendlyFire",
            "tournament",
            "gamestyle",
            "password",
            "adminName",
            "adminEmail",
            "country"

        ];

        let result = "";


        const tOrF = [
            "dedicated",
            "changeLevels",
            "balancedTeams",
            "playersBalanceTeams",
            "tournament",
            "password",
        ];

        for(let i = 0; i < regs.length; i++){

            if(regs[i].test(data)){

                result = regs[i].exec(data);

                if(tOrF.indexOf(keys[i]) == -1){

                    this[keys[i]] = result[1];

                }else{

                    result[1] = result[1].toLowerCase();

                    //if(keys[i] == "dedicated"){

                        if(result[1] == "false"){
                            this[keys[i]] = false;
                        }else if(result[1] == "true"){
                            this[keys[i]] = true;
                        }
                        
                    //}
                }

            }
        }
    }


    parseMapData(data){
        
        const mapTitleReg = /\\maptitle\\(.+?)\\/i;
        const mapNameReg = /\\mapname\\(.+?)\\/i;
        
        let result = mapTitleReg.exec(data);
        if(result !== null) this.mapTitle = result[1];

        result = mapNameReg.exec(data);
        if(result !== null) this.mapName = result[1];
        

    }


    parseTeamData(data){

        const teamScoreReg = /\\score_(\d)\\(.+?)\\/ig;
        const teamSizeReg = /\\size_(\d)\\(\d+?)\\/ig;

        let result = "";
        
        while(result !== null){

            result = teamScoreReg.exec(data);  
            if(result !== null) this.teams[parseInt(result[1])].score = parseInt(result[2]);

            result = teamSizeReg.exec(data);
            if(result !== null) this.teams[parseInt(result[1])].size = parseInt(result[2]);
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

    parsePlayerData(data){

        const nameReg = /\\player_(\d+?)\\(.+?)\\/ig;
        const fragsReg = /\\frags_(\d+?)\\(.+?)\\/ig;
        const teamReg = /\\team_(\d+?)\\(\d+?)\\/ig;
        const meshReg = /\\mesh_(\d+?)\\(.*?)\\/ig;
        const faceReg = /\\face_(\d+?)\\(.*?)\\/ig;
        const countryReg = /\\countryc_(\d+?)\\(.*?)\\/ig;
        const pingReg = /\\ping_(\d+?)\\(.*?)\\/ig;
        const timeReg = /\\time_(\d+?)\\(.*?)\\/ig;
        const deathsReg = /\\deaths_(\d+?)\\(.*?)\\/ig;
        const healthReg = /\\health_(\d+?)\\(.*?)\\/ig;
        const spreeReg = /\\spree_(\d+?)\\(.*?)\\/ig;

        let result = "";
        let oldResult = "";

        let currentMesh = "";

        while(true){

            currentMesh = "";

            result = nameReg.exec(data);

            if(result !== null){
                this.updatePlayer(result[1], "name", result[2]);
            
            }else{
                //console.table(this.players);
                return;
            }

            result = teamReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "team", result[2]);

            result = meshReg.exec(data);

           // console.log(result);
            if(result !== null){
                currentMesh = result[2].toLowerCase();
                this.updatePlayer(result[1], "mesh", result[2]);
            }

            result = faceReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "face", result[2]);


            result = countryReg.exec(data);
            if(result !== null) this.updatePlayer(result[1], "country", result[2]);


            result = fragsReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "frags", parseInt(result[2]));

            result = pingReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "ping", parseInt(result[2]));

            result = timeReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "time", parseInt(result[2]));

            result = deathsReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "deaths", parseInt(result[2]));

            result = healthReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "health", parseInt(result[2]));

            result = spreeReg.exec(data);

            if(result !== null) this.updatePlayer(result[1], "spree", parseInt(result[2]));
            
        }
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

        //console.log(`Input = ${value}`);

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

        //this.discordMessage.send

        let string = `${this.getServerCountry()}**${this.name}**\n`;

        let p = 0;

        //console.table(this.players);

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
        
        let test = 0;

        
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

        let teamIcon = 0;
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

    parseMutators(message){

        const reg = /\\mutators\\(.+?)\\/i;

        if(reg.test(message)){
            
            const result = reg.exec(message);

            this.mutators = result[1].split(', ');

        }     
    }


    getTrueFalseIcon(value){

        value = value.toString().toUpperCase();

        if(value == 'TRUE'){
            return ':white_check_mark:';
        }else if(value == 'FALSE'){
            return ':x:';
        }

        return value;

    }

    sendExtendedResponse(){


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

}

module.exports = ServerResponse;