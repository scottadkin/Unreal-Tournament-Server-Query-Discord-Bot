import { serverTimeout, embedColor, commandPrefix } from "../config/config.js";
import { EventEmitter } from "node:events";
import { EmbedBuilder } from "discord.js";
import { forceStringLength } from "./generic.js";
import { getAllServers } from "./servers.js";

class ServersCommandEmitter extends EventEmitter {}

const SERVERS_TITLE = ":desktop: UT Server List";
const ACTIVE_SERVERS_TITLE = ":desktop: Active UT Server List";
const INFO_FIELD = {
    "name": "Shorter server query command",
    "value": `Type **${commandPrefix}q id** to query a server instead of ip:port.`,
    "inline": false
};

export default class ServersCommand{

    constructor(discordChannel, servers, bOnlyActive){

        this.discordChannel = discordChannel;
        this.servers = servers;
        this.bOnlyActive = bOnlyActive;
        this.created = new Date(Date.now());
        this.responses = [];
        this.discordMessage = null;
        this.lastEditTime = 0;
        
        this.responsesCompleted = 0;
        
        this.events = new ServersCommandEmitter();

        this.createEvents();

        setTimeout(() =>{

            if(this.responsesCompleted === this.servers.length) return;
            
            this.events.emit("timeout");
        }, serverTimeout * 1000);
    }


    createEvents(){

        this.events.once("timeout", () =>{

            //edit message with timeout for missing servers

            this.updateMessage();

            this.events.emit("delete");
        })

        this.events.once("responses-created", async () =>{

            const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(SERVERS_TITLE)
            .setDescription("Pinging servers...")
            .setFields([INFO_FIELD])
            .setTimestamp();

            this.discordMessage = await this.discordChannel.send({"embeds": [embed]});
        });
    }

    addResponse(response){


        for(let i = 0; i < this.servers.length; i++){

            const s = this.servers[i];

            if(s.real_ip === response.ip && s.port === response.port){

                response.serverIndex = s.current_index;
                response.alias = s.alias;
          

                response.events.once("loaded-data", () =>{

                    this.responsesCompleted++;

                    if(this.responsesCompleted === this.servers.length){
                        this.updateMessage();
                        return;
                    }

                    const now = Math.floor(Date.now() * 0.001);
                    const diff = now - this.lastEditTime;

                    if(diff > 1){
                        this.updateMessage();
                    }
                });
            }
        }

        this.responses.push(response);
        

        if(this.responses.length === this.servers.length){
            this.events.emit("responses-created");
        }
    }

    updateMessage(){


        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];
        }

        if(this.discordMessage === null){
            //cant edit the message if it hasn't been created yet
            return;
        }

        this.lastEditTime = Math.floor(Date.now() * 0.001);

        const serverParts = this.createServerListParts(this.responses);

        const embeds = [];

        for(let i = 0; i < serverParts.length; i++){

            const embed = new EmbedBuilder()
            .setColor(embedColor);

            if(i === 0){
                embed.setTitle(SERVERS_TITLE)
            }

            embed.setDescription(serverParts[i]);

            if(i === serverParts.length - 1){
                embed.setFields([INFO_FIELD]);
            }

            embeds.push(embed);
        }

        this.discordMessage.edit({"embeds": embeds});
    }

    getMatchingResponse(ip, port){

        for(let i = 0; i < this.responses.length; i++){

            const r = this.responses[i];

            if(r.ip === ip && r.port === port) return r;
        }

        return null;
    }

    createServerString(server){

        const idLength = 2;
        const aliasLength = 25;
        const mapLength = 25;
        const playersLength = 7;

        const alias = forceStringLength(server.alias, aliasLength);
        const serverId = forceStringLength(server.serverIndex, idLength);

        if(server.map === "DM-MapName"){

            const mapFailed = forceStringLength("Server Timed Out!", mapLength)+" "; 
            const playersFailed = forceStringLength("N/A", playersLength, true);

            return `\`${serverId} - ${alias} ${mapFailed} ${playersFailed}\``;
        }

        
        let playerString = "";

        if(server.maxPlayers == "ers"){
            playerString = "Players";
        }else{
            playerString = server.totalPlayers+"/"+server.maxPlayers;
        }

        const map = forceStringLength(server.map, mapLength)+" "; 
        const players = forceStringLength(playerString, playersLength, true);

        return `\`${serverId} - ${alias} ${map} ${players}\``;

    }

    sendNoServers(bOnlyActive){

        const title =  SERVERS_TITLE;

        const desc = (bOnlyActive) ? `There are currently no active servers.` : "There aren't any servers added to the bot.";

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${(bOnlyActive) ? "Active" : ""} ${title}`)
        .setDescription(desc)
        .setTimestamp();

        return this.discordChannel.send({"embeds": [embed]});
    }


    sortResponsesByIndex(){

        this.responses.sort((a, b) =>{

            a = a.serverIndex;
            b = b.serverIndex;

            if(a > b){
                return 1;
            }else if(a < b){
                return -1;
            }

            return 0;
        });
    }

    createServerListParts(servers){

        const maxCharsPerDesc = 4096;

        const parts = [];

        let desc = this.createServerString({
            "serverIndex": "ID",
            "alias": "Alias", 
            "map": "Map", 
            "totalPlayers": 0,
            "maxPlayers": "ers"}
        );

        desc += `\n`;


        this.sortResponsesByIndex();

        for(let i = 0; i < this.responses.length; i++){

            const response = this.responses[i];

            if(this.bOnlyActive && (response.currentPlayers === "0" || response.mapName === "DM-MapName")){
                continue;
            }

            if(response.serverIndex === undefined) continue;

            const currentString = this.createServerString({
                "serverIndex": response.serverIndex,
                "alias": response.alias,
                "map": response.mapName,
                "totalPlayers": response.currentPlayers,
                "maxPlayers": response.maxPlayers
            });

            if(desc.length + currentString.length >= maxCharsPerDesc){
            
                parts.push(desc);
                desc = currentString;
            }else{

                desc += currentString;
            }

            if(i < servers.length - 1) desc += `\n`;
 
        }

        if(parts.length === 0){
            parts.push(desc);
        }else if(desc !== ""){
            parts.push(desc);
        }

        return parts;
    }
}
