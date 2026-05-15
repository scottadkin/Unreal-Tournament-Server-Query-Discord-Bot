import { EmbedBuilder } from 'discord.js';
import { passIcon, failIcon, defaultAdminRole, embedColor } from '../config/config.js';
import { sqliteGet, sqliteRun , sqliteGetAll} from './database.js';

export default class Roles{

    constructor(){}

    bUserAdmin(message){

        let passed = false;

        const userRoles = message.member.roles.cache;

        const adminRolesData = this.getAllAddedRoles();

        const adminRoleIds = [];

        for(let i = 0; i < adminRolesData.length; i++){

            const a = adminRolesData[i];

            if(adminRoleIds.indexOf(a.id) === -1){
                adminRoleIds.push(a.id);
            }
        }

        if(userRoles.some((r) =>{

            if(adminRoleIds.indexOf(r.id) !== -1 || r.name.toLowerCase() == defaultAdminRole.toLowerCase()){
            
                passed = true;
            }

        }));

        return passed;


    }

    bRoleAdded(role){

        const query = "SELECT COUNT(*) as total_roles FROM roles WHERE id=?";

        const result = sqliteGet(query, [role]);
        if(result === undefined) return null;

        return result.total_roles > 0;
    }


    removeRole(message){

        const reg = /^.removerole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){
            return;
        }

        const roleData = this.getRole(result[1], message);

        if(roleData === null){
            message.channel.send(`${failIcon} The role **${roleData.name}** does not exist in this server.`);
        }

        const bRoleExist = this.bRoleAdded(roleData.id);

        if(bRoleExist){

            this.deleteRole(roleData.id, message, roleData.name);

            message.channel.send(`${passIcon} Users with the role **${roleData.name}** can no longer use the bots admin commands.`);

        }else{
            message.channel.send(`${failIcon} The role **${roleData.name}** has not been enabled to use admin commands.`);
        }
    
    }

    deleteRole(role, message, roleName){

        const query = "DELETE FROM roles WHERE id=?";

        return sqliteRun(query, [role]);

    }

    insertRole(role, roleName){

        const query = "INSERT INTO roles VALUES(?,?)";

        const now = Math.floor(Date.now() * 0.001);

        return sqliteRun(query, [role, now]);

    }

    getRole(name, message){

        const roles = message.guild.roles.cache;

        for(let i = 0; i < roles.size; i++){

            if(roles.at(i).name.toLowerCase() == name.toLowerCase()){
                return roles.at(i);
            }
        }

        return null;
    }

    addRole(role, message){

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle("Allow Role");

        const roleData = this.getRole(role, message);

        if(roleData === null){

            embed.setDescription(`${failIcon} Failed to get role data.`);
            return message.channel.send({"embeds": [embed]});
        }


        const bRoleAdded = this.bRoleAdded(roleData.id);

        if(!bRoleAdded){

            this.insertRole(roleData.id, roleData.name);

            embed.setDescription(`${passIcon} User with the role **${roleData.name}** can now use admin commands.`);
            return message.channel.send({"embeds": [embed]});
        }else{

            embed.setDescription(`${failIcon} **${role}** has already been allowed to use the bots admin commands.`);
            return message.channel.send({"embeds": [embed]});
        }

    }

    allowRole(message){

        
        const reg = /^.allowrole (.+)$/i;

        const result = reg.exec(message.content);

        if(result === null){

            const embed = new EmbedBuilder().setColor(embedColor).setTitle("Allow Role");
            embed.setDescription(`${failIcon} Wrong syntax for allowrole command.`);
            return message.channel.send({"embeds": [embed]});
            
        }

        const channelRoles = message.channel.guild.roles.cache;

        let bFound = false;

        for(let i = 0; i < channelRoles.size; i++){

            const c = channelRoles.at(i);

            if(c.name.toLowerCase() == result[1].toLowerCase()){

                bFound = true;
                this.addRole(c.name, message);
                break;
            }
        }

        if(!bFound){

            const embed = new EmbedBuilder().setColor(embedColor).setTitle("Allow Role");
            embed.setDescription(`${failIcon} There is no role called **${result[1]}** in this channel.`);
            return message.channel.send({"embeds": [embed]});
        }

    }

    getAllAddedRoles(){

        return sqliteGetAll("SELECT * FROM roles");
 
    }


    listRoles(message){

        const roles = this.getAllAddedRoles();

        const discordRoles = message.guild.roles.cache;

        const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle("Roles that have access to admin commands.");

        const fields = [
            {"name": "Default Admin Role(config.js)", "value": defaultAdminRole, "inline": false}
        ];

        let addedString = "";
        
        for(let i = 0; i < roles.length; i++){

            const r = roles[i];

            const added = new Date(r.added * 1000);

            const currentRole = discordRoles.get(r.id);

            if(currentRole !== undefined){
                addedString += `:small_blue_diamond: **${currentRole.name}** Added ${added}\n`;
            }else{
                addedString += `:no_entry: This role no longer exists in this server, removing it from database.\n`;

                this.deleteRole(r.id, message, "DELETED");
            }
        }

        if(addedString === ""){
            addedString = "There are currently no discord roles allowed to use the bots admin commands.";
        }

        fields.push({"name": "Added Discord Roles", "value": addedString, "inline": false})
        embed.setFields(fields);

        message.channel.send({"embeds": [embed]});
 
    }
}