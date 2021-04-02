#!/usr/bin/env node

const csv = require('csvtojson');
const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const { execSync } = require("child_process");

var database, collection;
const DATABASE_NAME = process.env.DATABASE_NAME;
const CONNECTION_URL = "localhost:27017";

MongoClient.connect("mongodb://" + CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
    if(error) {
        throw error;
    }
    database = client.db(DATABASE_NAME);
    collection = database.collection("awesome_mod");
    console.log("Connected to `" + DATABASE_NAME + "`!");
});

client.on("guildCreate", async guild => {
  let awesomeModCatID, botLogID, roleReqID;
  collection.insertOne({ guild_id: guild.id }, (error, result) => {
      if(error) {
        console.error;
      }
  });
  // Create "Awesome Mod" category for other channels to reside in
  guild.channels.create('Awesome Mod', {
    type: 'category',
    position: 1,
    // Remove view permissions from "@everyone"
    permissionOverwrites: [{
      id: guild.id,
      deny: ['VIEW_CHANNEL'],
    }]
  })
  .then(channel => {
    // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
    guild.channels.create('bot-logs', {
      type: 'text',
      parent: channel.id,
      // Remove view permissions from "@everyone"
      permissionOverwrites: [{
        id: guild.id,
        deny: ['VIEW_CHANNEL'],
      }]
    }).then(channel => {
      // Add the ID of the "#bot-logs" channel to the database
      collection.updateOne({ guild_id: guild.id }, { $set: { "bot_logs_id": `${channel.id}` }});
    });
    // Create "#role-requests" text channel to have people request roles
    guild.channels.create('role-requests', {
      type: 'text',
      parent: channel.id,
      // Remove view permissions from "@everyone"
      permissionOverwrites: [{
        id: guild.id,
        allow: ['VIEW_CHANNEL'],
      }]
    }).then(channel => {
      // Add the ID of the "#bot-logs" channel to the database
      collection.updateOne({ guild_id: guild.id }, { $set: { "role_requests_id": `${channel.id}` }});
      // Add slowmode
      channel.setRateLimitPerUser(60);
    });

  });
});

client.on("guildDelete", async guild => {
  collection.deleteOne({ "guild_id": `${guild.id}` }, (error, result) => {
      if(error) {
        console.error;
      }
  });
});

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
});

client.on("message", async message => {
/*  switch (message.content.toLowerCase()) {
    case '$score':
      startScoring(message);
      break;
    case '$membercount':
      memberCount(message);
      break;
    case '$addroles':
    execSync("wget --no-check-certificate --output-document=participants.csv https://docs.google.com/spreadsheets/d/1lufn28YR29OkCS4wH_WQXfCalAgJRi8_r4NCesJSbQY/export\\?gid\\=2119488170\\&format\\=csv", { encoding: 'utf-8' });
    csv().fromFile('participants.csv')
        .then(users => {
            users.forEach(function (user) {
                addRoles(user, message);
            });
        }).catch(err => {
           console.log(err);
        });
      break;
    case '$aboutserver':
      aboutServer(message);
      break;
  }*/

  if (message.content.toLowerCase().startsWith("$bulkdelete")) {
    bulkDelete(message);
  } /*else if (message.content.toLowerCase().startsWith("$rolerequest")) {
    roleRequest(message);
  }*/ else if (message.content.toLowerCase().startsWith("$userswithrole")) {
    usersWithRole(message);
  }
});

async function usersWithRole(message) {
  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }
  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  const roleEmbed = new Discord.MessageEmbed()
    .setTitle(`${roles.array()[0].members.array().length} user(s) with the role \`${roles.array()[0].name}\`:`)
    .setDescription(" • " + roles.array()[0].members.map(m => m.user.tag).join('\n\n • '))
    .setFooter(`Role ID: ${roles.array()[0].id}`)
    .setTimestamp();
  message.channel.send(roleEmbed);
}/*

async function aboutServer(message) {
  const textChannelCount = message.guild.channels.cache.filter(c => c.type === 'text').size;
  const voiceChannelCount = message.guild.channels.cache.filter(c => c.type === 'voice').size;
  const categoryChannelCount = message.guild.channels.cache.filter(c => c.type === 'category').size;
  const numHumans = message.guild.members.cache.filter(member => !member.user.bot).size;
  const numBots = message.guild.members.cache.filter(member => member.user.bot).size;
  const numRoles = message.guild.roles.cache.size;
  const numOnline = message.guild.members.cache.filter(member => member.user.presence.status === "online" && !member.user.bot).size;
  const numOffline = message.guild.members.cache.filter(member => member.user.presence.status === "offline" && !member.user.bot).size;
  const numAway = message.guild.members.cache.filter(member => member.user.presence.status === "idle" && !member.user.bot).size;
  const numDND = message.guild.members.cache.filter(member => member.user.presence.status === "dnd" && !member.user.bot).size;
  const aboutServerEmbed = new Discord.MessageEmbed()
    .setTitle(`About \`${message.guild.name}\``)
    .addField("Owner", `<@${message.guild.ownerID}>`)
    .addField("Region", message.guild.region)
    .addField("Verification Level", message.guild.verificationLevel)
    .addField("Channels", `Total: ${message.guild.channels.cache.size} ‖ Text: ${textChannelCount} • Voice: ${voiceChannelCount} • Categories: ${categoryChannelCount}`)
    .addField("Members", `Total: ${numHumans + numBots} ‖ Human: ${numHumans} • Bot: ${numBots}`)
    .addField("Roles", numRoles)
    .addField("Created", message.guild.createdAt)
    .addField("User Statuses", `🟦 • ${numOnline} online\n\n🟧 • ${numAway} away\n\n⬛ • ${numOffline} offline\n\n🟥 • ${numDND} DND`)
    .setThumbnail(message.guild.iconURL())
    .setFooter(`Server ID: ${message.guild.id}`)
    .setTimestamp();
  message.channel.send(aboutServerEmbed).catch(console.error);
}

async function addRoles(user, message) {
    const noviceRole = message.guild.roles.cache.get("827220856983519232");
    const advancedRole = message.guild.roles.cache.get("827220906908450826");
    const compRole = message.guild.roles.cache.get("826846965114339419");
    const botRole = message.guild.roles.cache.get("826871012724441158");
    console.log(user['What is your discord tag? (Ex: foodboi#9161)']);
    if (client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)'])) {
    if (!message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.cache.has(compRole.id)) {
        message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.add(compRole).catch(console.error);
        message.channel.send(`Adding "Competitor" role for: \`${user['What is your discord tag? (Ex: foodboi#9161)']}\``).catch(console.error);
    }
    if (user['Are you playing in the Novice or Advanced division?'] === "Novice") {
        if (message.guild.members.cache.get(message.author.id).hasPermission("ADMINISTRATOR")) {
            if (!message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.cache.has(noviceRole.id)) {
                message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.add(noviceRole).catch(console.error);
                message.channel.send(`Adding "Novice" role for: \`${user['What is your discord tag? (Ex: foodboi#9161)']}\``).catch(console.error);
            }
        }
    }

    if (user['Are you playing in the Novice or Advanced division?'] === "Advanced") {
        if (message.guild.members.cache.get(message.author.id).hasPermission("ADMINISTRATOR")) {
            if (!message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.cache.has(advancedRole.id)) {
                message.guild.members.cache.get(client.users.cache.find(u => u.tag === user['What is your discord tag? (Ex: foodboi#9161)']).id).roles.add(advancedRole).catch(console.error);
                message.channel.send(`Adding "Advanced" role for: \`${user['What is your discord tag? (Ex: foodboi#9161)']}\``).catch(console.error);
            }
        }
    }
    }
}

async function roleRequest(message) {
  const readerRole = message.guild.roles.cache.get("826840765526835240");
  const specRole = message.guild.roles.cache.get("826849213954523216");
  const writerRole = message.guild.roles.cache.get("826508727855087723");
  const role = message.content.substring(13).toLowerCase();
  const possibleRoles = ['spec', 'spectator', 'reader', 'writer'];
  if (message.channel.id !== "826904255012667452") {
    message.reply("wrong channel!");
    return;
  }
  if (possibleRoles.indexOf(role) === -1) {
    message.reply("no roles found with that name!");
    return;
  }
  if (role === "reader" && message.member.roles.cache.has(readerRole.id)) {
    message.reply("you already have that role!");
    return;
  }

  if (role === "spectator" && message.member.roles.cache.has(specRole.id)) {
    message.reply("you already have that role!");
    return;
  }

  if (role === "spec" && message.member.roles.cache.has(specRole.id)) {
    message.reply("you already have that role!");
    return;
  }

  if (role === "writer" && message.member.roles.cache.has(writerRole.id)) {
    message.reply("you already have that role!");
    return;
  }
  const verificationMessage = message.channel.send(`<@${message.author.id}> would like the **${role}** role. Are they worthy?`);
  message.react('👍');
  message.react('👎');
  const filter = (reaction, user) => {
    return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
  };
  message.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
    .then(userReaction => {
      const reaction = userReaction.first();
      if (reaction.emoji.name === '👍') {
        message.reply("wow I guess you ARE worthy! ||mods must be real mistaken||");
        if (role === 'reader') {
          message.member.roles.add(readerRole).catch(console.error);
        } else if (role === 'writer') {
          message.member.roles.add(writerRole).catch(console.error);
        } else if (role === 'spectator' || role === 'spec') {
          message.member.roles.add(specRole).catch(console.error);
        }
      } else {
        message.reply("I guess you won't be getting that role!");
      }
    }).catch("Role reaction timeout, I guess the mods don't really care about you and forgot.");
}

*/async function bulkDelete(message) {
  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.reply("you do not have high enough permissions!");
    return;
  }
  const amount = parseInt(message.content.substring(12));

  if (!amount) {
    message.reply('please add the number of messages to be deleted!');
    return;
  }

  if (!Number.isInteger(amount)) {
    message.reply('the number is not an integer!');
    return;
  }

  if (amount > 100 || amount < 1) {
    message.reply('the number is invalid! It must be between 1 and 99 inclusive.');
    return;
  }

  await message.channel.messages.fetch( { limit: amount + 1 } ).then(messages => {
    message.channel.bulkDelete(messages).catch(console.error);
  }).catch(console.error);
}/*

async function startScoring(message) {
  let scoreA = 0;
  let scoreB = 0;
  const scoreboard = await message.channel.send(`Here's the score:\nTeam A: ${scoreA}\nTeam B: ${scoreB}`)
    .then((scoreboard) => {
      const filter = m => m.content.includes('$score');
      const collector = message.channel.createMessageCollector(filter, { time: 1500000 });
      collector.on('collect', m => {
        if (m.content.toLowerCase() === "$score a+4") {
          //m.delete({ timeout: 1000 }).catch(console.error);
          scoreA += 4;
          scoreboard.channel.send(`Here's the score:\nTeam A: ${scoreA}\nTeam B: ${scoreB}`).catch(console.error);
        } else if (m.content.toLowerCase() === "$score a+10") {
          //m.delete({ timeout: 1000 }).catch(console.error);
          scoreA += 10;
          scoreboard.channel.send(`Here's the score:\nTeam A: ${scoreA}\nTeam B: ${scoreB}`).catch(console.error);
        } else if (m.content.toLowerCase() === "$score b+4") {
          m.delete({ timeout: 1000 }).catch(console.error);
          scoreB += 4;
          scoreboard.channel.send(`Here's the score:\nTeam A: ${scoreA}\nTeam B: ${scoreB}`).catch(console.error);
        } else if (m.content.toLowerCase() === "$score b+10") {
          //m.delete({ timeout: 1000 }).catch(console.error);
          scoreB += 10;
          scoreboard.channel.send(`Here's the score:\nTeam A: ${scoreA}\nTeam B: ${scoreB}`).catch(console.error);
        } else if (m.content === "$score finish") {
          //m.delete({ timeout: 1000 }).catch(console.error);
          //scoreboard.delete({ timeout: 1000 });
          m.channel.send(`**FINAL SCORE:**\nTeam A: ${scoreA}\nTeam B: ${scoreB}`).catch(console.error);
          collector.stop();
        }
      });
    })
}

client.on("guildMemberAdd", member => {
//  const compRole = member.guild.roles.cache.get("826846965114339419");
  const botRole = member.guild.roles.cache.get("826871012724441158");
  if (member.bot) {
    member.roles.add(botRole).catch(console.error);
  } else {
    //member.roles.add(compRole).catch(console.error);
    const welcomeDM = new Discord.MessageEmbed()
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription("Please take a look at <#826510368620413018> for information about roles and registration!")
      .setFooter(`Guild ID: ${member.guild.id}`)
      .setTimestamp();
    client.users.cache.get(member.user.id).send(welcomeDM).catch(console.error);
  }
});

client.on('messageDelete', message => {
  let messageContent;
  let messageAvatar;
  let messageID;
  let messageAuthor;
  if (message) {
    messageAuthor = message.author.tag;
    messageContent = message.content;
    messageAvatar = message.author.avatarURL();
    messageID = message.id;
  } else {
    messageAuthor = "Someone else deleted this message";
    messageAvatar = "https://64.media.tumblr.com/db1db81cadcf6211524ce9ef1b89bae7/tumblr_inline_olcfuexwZy1se2zq9_500.png";
    messageContent = "Unknown";
    messageID = "Unknown";
  }
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  const deleteEmbed = new Discord.MessageEmbed()
    .setTitle('Message Deleted')
    .addField('Author', messageAuthor)
    .addField('Message', messageContent)
    .setThumbnail(messageAvatar)
    .setFooter("ID: " + messageID)
    .setTimestamp()
    .setColor('ff0000');
  client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(deleteEmbed).catch(console.error);
});

client.on('messageUpdate', (originalMessage, editedMessage) => {
  if (editedMessage.author) {
    if (editedMessage.author.bot) {
      return;
    }
    const editEmbed = new Discord.MessageEmbed()
      .setTitle("Message Edited")
      .addField("Author", editedMessage.author.tag)
      .addField("Message", `<< ${originalMessage}\n>> ${editedMessage}`)
      .setThumbnail(editedMessage.author.avatarURL())
      .setFooter("ID: " + editedMessage.id)
      .setTimestamp()
      .setColor('006699');
    client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(editEmbed).catch(console.error);
  }
});

client.on('channelCreate', channel => {
  if (channel.guild.id = "826506878976000030") {
    const channelName = channel.name;
    const channelID = channel.id;
    const channelType = channel.type;
    let channelCategory;
    if (channel.parent) {
      channelCategory = channel.parent.name;
    } else {
      channelCategory = "None";
    }
    const channelCreateEmbed = new Discord.MessageEmbed()
      .setTitle("Channel Created")
      .addField("Name", channelName)
      .addField("Type", channelType)
      .addField("Category", channelCategory)
      .setFooter("ID: " + channelID)
      .setTimestamp()
      .setColor('00aaff');
    client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(channelCreateEmbed).catch(console.error);
  }
});*/

client.login(process.env.BOT_TOKEN);
