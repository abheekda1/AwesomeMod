#!/usr/bin/env node

const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

var database, collection;
const DATABASE_NAME = process.env.DATABASE_NAME;
const CONNECTION_URL = "localhost:27017";
const prefix = '$';

MongoClient.connect("mongodb://" + CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
  if (error) {
    throw error;
  }
  database = client.db(DATABASE_NAME);
  collection = database.collection("awesome_mod");
  console.log("Connected to `" + DATABASE_NAME + "`!");
});

client.on("guildCreate", async guild => {
  let awesomeModCatID, botLogID, roleReqID;
  collection.insertOne({ guild_id: guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
  });
});

client.on("guildDelete", async guild => {
  // If the bot is removed from a guild or the guild is deleted, the bot deletes the old data
  collection.deleteOne({ "guild_id": `${guild.id}` }, (error, result) => {
    if (error) {
      console.error;
    }
  });
});

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
  client.user.setActivity(`for \`${prefix}help\` | Add me to your own server: adat.link/awesomemod`, { type: "WATCHING" });
});

client.on("message", async message => {
  if (message.author.bot) {
    return;
  }

  switch (message.content.toLowerCase()) {
    case `${prefix}aboutserver`:
      aboutServer(message);
      break;
    case `${prefix}help`:
      helpMessage(message);
      break;
    case `${prefix}startlogs`:
      startLogs(message);
      break;
  }

  if (message.content.toLowerCase().startsWith(`${prefix}bulkdelete`)) {
    bulkDelete(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}rolerequest`)) {
    roleRequest(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}userswithrole`)) {
    usersWithRole(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}ban`)) {
    ban(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}kick`)) {
    kick(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}addrole`)) {
    addRole(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}userinfo`)) {
    userInfo(message);
  }
});

async function startLogs(message) {
  if (!message.member.hasPermission("ADMINISTRATOR")) {
    message.reply("you do not have admin permissions!");
    return;
  }
  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (message.guild.channels.cache.get(botLogsChannel)) {
        message.reply('bot logs channel already exists!');
      } else {
        // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
        message.guild.channels.create('bot-logs', {
          type: 'text',
          // Remove view permissions from "@everyone"
          permissionOverwrites: [{
            id: message.guild.id,
            deny: ['VIEW_CHANNEL'],
          }]
        }).then(channel => {
          // Add the ID of the "#bot-logs" channel to the database
          collection.updateOne({ guild_id: message.guild.id }, { $set: { "bot_logs_id": `${channel.id}` } });
        });
      }
    }
  });
}

async function userInfo(message) {
  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

  const userInfoEmbed = new Discord.MessageEmbed()
    .setAuthor(member.user.tag, member.user.avatarURL())
    .addField("Roles", member.roles.cache.map(r => `${r}`).join(' • '))
    .addField("Permissions", member.permissions.toArray().map(p => `\`${p}\``.toLowerCase()).join(' • '))
    .addField("Joined at", `${new Date(member.joinedTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`, true)
    .addField("Account created", `${new Date(member.user.createdTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`, true)
    .setColor("00c5ff")
    .setFooter(`User ID: ${member.user.id}`)
    .setTimestamp();
  message.channel.send(userInfoEmbed).catch(console.error);
}

async function addRole(message) {
  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.reply("you do not have adequate permissions!")
  }

  if (!message.content.split(" ")[1]) {
    message.reply("role query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("role query must contain at least 3 characters!")
    return;
  }

  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  let roleChannel;

  if (!message.content.split(" ")[2]) {
    message.reply("user query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[2].length < 3) {
    message.reply("user query must contain at least 3 characters!")
    return;
  }

  if (roles.array().length < 1) {
    message.reply("no roles found with that name!");
    return;
  }

  const role = roles.array()[0];

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[2].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[2].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[2].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

  if (member.roles.cache.has(role.id)) {
    message.reply(`${member.user} already has that role!`);
    return;
  }

  const verificationEmbed = new Discord.MessageEmbed()
    .setTitle(`Are you sure you want to give \`${member.user.tag}\` the **${role.name}** role?`)
    .setDescription("React to this message to verify")
    .setThumbnail(member.user.avatarURL())
    .setColor("fda172")
    .setTimestamp();
  message.channel.send(verificationEmbed)
  .then(verificationEmbed => {
    verificationEmbed.react('👍');
    verificationEmbed.react('👎');
    const filter = (reaction, user) => {
      return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
    };
    verificationEmbed.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
      .then(userReaction => {
        const reaction = userReaction.first();
        if (reaction.emoji.name === '👍') {
          member.roles.add(role).then(message.reply(`${member.user} has been given the **${role}** role!`)).catch(() => { message.reply("It seems I don't have permissions to give that role, as it's likely above me :(") });
        } else {
          message.reply("I guess you won't be getting that role!");
        }
      }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
  }).catch(console.error);
}

async function ban(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

    let verificationEmbed = new Discord.MessageEmbed()
      .setTitle(`Are you sure you would like to ban \`${member.user.tag}\`?`)
      .setDescription("React to this message to verify")
      .setThumbnail(member.user.avatarURL())
      .setColor("fda172")
      .setTimestamp();
    message.channel.send(verificationEmbed)
    .then(verificationEmbed => {
      verificationEmbed.react('👍');
      verificationEmbed.react('👎');
      const filter = (reaction, user) => {
        return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
      };
      verificationEmbed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(userReaction => {
          const reaction = userReaction.first();
          if (reaction.emoji.name === '👍') {
            message.guild.members.ban(member.user).then(user => message.reply(`<@${user.id}> has been banned!`)).catch(() => message.channel.send(`Unfortunately, I don't have the ability to ban ${member.user.username}, likely because their role is higher than mine.`));
          } else {
            message.reply(`phew! ${member}'s safe!`);
          }
        }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
      }).catch(console.error);
}

async function kick(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

    const verificationEmbed = new Discord.MessageEmbed()
      .setTitle(`Are you sure you would like to kick \`${member.user.tag}\`?`)
      .setDescription("React to this message to verify")
      .setThumbnail(member.user.avatarURL())
      .setColor("fda172")
      .setTimestamp();
    message.channel.send(verificationEmbed)
    .then( verificationEmbed => {
      verificationEmbed.react('👍');
      verificationEmbed.react('👎');
      const filter = (reaction, user) => {
        return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
      };
      verificationEmbed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(userReaction => {
          const reaction = userReaction.first();
          if (reaction.emoji.name === '👍') {
            member.kick().then(user => message.reply(`<@${user.id}> has been kicked!`)).catch(() => message.channel.send(`Unfortunately, I don't have the ability to kick ${member.user.username}, likely because their role is higher than mine.`));
          } else {
            message.reply(`phew! ${member}'s safe!`);
          }
        }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
      }).catch(console.error);
}

async function helpMessage(message) {
  const helpEmbed = new Discord.MessageEmbed()
    .setTitle(`Helping \`${message.author.tag}\``)
    .setURL('https://adat.link/awesomemod')
    .addField(`Creator`, `ADawesomeguy#2235`, true)
    .addField(`Prefix`, `\`${prefix}\``, true)
    .addField(`Using the bot`, "Once <@780562707254083584> joins the server, it will create a category called `Awesome Mod` and two channels within it. One is for regular members to request roles (called `#role-requests`) and the other is for bot logs (`#bot-logs`). These can be renamed and moved around but should not be deleted. If one of them does end up getting deleted, just kick and re-add the bot to add new, functioning versions of these channels.<@780562707254083584> also comes with a ton of handy commands to analyze and manage your server.")
    .addField(`Meta commands:`, `Help command: \`${prefix}help\`\nAbout your server: \`${prefix}aboutServer\``)
    .addField(`Admin commands:`, `Bulk delete: \`${prefix}bulkDelete\`\nBan: \`${prefix}ban [user]\`\nKick: \`${prefix}kick [user]\`\nGive user role: \`${prefix}addRole [role]\``)
    .addField(`User commands:`, `Role request: \`${prefix}roleRequest [role]\`\nView users with role: \`${prefix}usersWithRole [role]\`\nUser info: \`${prefix}userInfo [user]\``)
    .setThumbnail(client.user.avatarURL())
    .setFooter(`Bot ID: ${client.user.id}`)
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(helpEmbed).catch(console.error);
}

async function usersWithRole(message) {
  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }
  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  const role = roles.array()[0];
  const roleEmbed = new Discord.MessageEmbed()
    .setTitle(`${role.members.array().length} user(s) with the role \`${role.name}\`:`)
    .setDescription(" • " + roles.array()[0].members.map(m => m.user.tag).join('\n\n • '))
    .setFooter(`Role ID: ${role.id}`)
    .setTimestamp();
  message.channel.send(roleEmbed);
}

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
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(aboutServerEmbed).catch(console.error);
}

async function roleRequest(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  let roleChannel;

  if (roles.array().length < 1) {
    message.reply("no roles found with that name!");
    return;
  }

  const role = roles.array()[0];

  if (message.member.roles.cache.has(role.id)) {
    message.reply("you already have that role!");
    return;
  }

  const verificationEmbed = new Discord.MessageEmbed()
    .setTitle(`\`${message.author.tag}\` would like the **${role.name}** role. Are they worthy?`)
    .setDescription("React to this message to verify")
    .setThumbnail(message.author.avatarURL())
    .setColor("fda172")
    .setTimestamp();
  message.channel.send(verificationEmbed)
  .then(verificationEmbed => {
    verificationEmbed.react('👍');
    verificationEmbed.react('👎');
    const filter = (reaction, user) => {
      return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
    };
    verificationEmbed.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
      .then(userReaction => {
        const reaction = userReaction.first();
        if (reaction.emoji.name === '👍') {
          message.member.roles.add(role).then(message.reply("wow I guess you ARE worthy! ||mods must be real mistaken||")).catch(() => { message.reply("It seems I don't have permissions to give that role, as it's likely above me :(") });
        } else {
          message.reply("I guess you won't be getting that role!");
        }
      }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
  }).catch(console.error);
}

async function bulkDelete(message) {
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

  await message.channel.messages.fetch({ limit: amount + 1 }).then(messages => {
    message.channel.bulkDelete(messages).catch(console.error);
  }).catch(console.error);
}

client.on('messageDelete', message => {
  let messageContent = message.content;
  let messageAvatar;
  const messageID = message.id;
  let messageAuthor;
  if (message.author) {
    messageAuthor = message.author.tag;
    messageAvatar = message.author.avatarURL();
  } else {
    messageAuthor = "Someone else deleted this message";
    messageAvatar = "https://www.myhowtoonline.com/wp-content/uploads/2020/10/discord-512x474.png";
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
    .setColor('e7778b');

  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (message.guild.channels.cache.get(botLogsChannel)) {
        message.guild.channels.cache.get(botLogsChannel).send(deleteEmbed).catch(console.error);
      }
    }
  });
});

client.on('messageDeleteBulk', messages => {
  const numMessages = messages.array().length;
  const messagesChannel = messages.array()[0].channel;
  const bulkDeleteEmbed = new Discord.MessageEmbed()
    .setTitle(`${numMessages} Messages Bulk Deleted`)
    .addField(`Channel`, messagesChannel.name)
    .setFooter("Channel ID: " + messagesChannel.id)
    .setTimestamp()
    .setColor('e7778b');

  collection.findOne({ guild_id: messagesChannel.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (messagesChannel.guild.channels.cache.get(botLogsChannel)) {
        messagesChannel.guild.channels.cache.get(botLogsChannel).send(bulkDeleteEmbed).catch(console.error);
      }
    }
  });
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
      .setColor('c9ff00');
    collection.findOne({ guild_id: editedMessage.guild.id }, (error, result) => {
      if (error) {
        console.error;
      }
      if (result.bot_logs_id) {
        botLogsChannel = result.bot_logs_id;
        if (editedMessage.guild.channels.cache.get(botLogsChannel)) {
          editedMessage.guild.channels.cache.get(botLogsChannel).send(editEmbed).catch(console.error);
        }
      }
    });
  }
});

client.on('channelCreate', channel => {
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
  collection.findOne({ guild_id: channel.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (channel.guild.channels.cache.get(botLogsChannel)) {
        channel.guild.channels.cache.get(botLogsChannel).send(channelCreateEmbed).catch(console.error);
      }
    }
  });
});

client.on('messageReactionAdd', (messageReaction, user) => {
  const userTag = user.tag;
  const emoji = messageReaction.emoji.name;
  const numEmoji = messageReaction.count;
  let messageContent = messageReaction.message.content;
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  let channelCategory;
  const messageReactionAddEmbed = new Discord.MessageEmbed()
    .setTitle("Reaction Added")
    .addField("Message", messageContent)
    .addField("Reactions", `${userTag} reacted with ${emoji}, along with ${numEmoji - 1} other people in #${messageReaction.message.channel.name}.`)
    .setFooter("Message ID: " + messageReaction.message.id)
    .setTimestamp()
    .setColor('00aaff');
  collection.findOne({ guild_id: messageReaction.message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id)
      botLogsChannel = result.bot_logs_id;
      if (messageReaction.message.guild.channels.cache.get(botLogsChannel)) {
        messageReaction.message.guild.channels.cache.get(botLogsChannel).send(messageReactionAddEmbed).catch(console.error);
      }
  });
});

client.on('messageReactionRemove', (messageReaction, user) => {
  const userTag = user.tag;
  const emoji = messageReaction.emoji.name;
  let messageContent = messageReaction.message.content;
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  let channelCategory;
  const messageReactionRemoveEmbed = new Discord.MessageEmbed()
    .setTitle("Reaction Removed")
    .addField("Message", messageContent)
    .addField("Reactions", `${userTag} removed their reaction ${emoji} in #${messageReaction.message.channel.name}.`)
    .setFooter("Message ID: " + messageReaction.message.id)
    .setTimestamp()
    .setColor('e7778b');
  collection.findOne({ guild_id: messageReaction.message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (messageReaction.message.guild.channels.cache.get(botLogsChannel)) {
        messageReaction.message.guild.channels.cache.get(botLogsChannel).send(messageReactionRemoveEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleCreate', role => {
  const roleCreateEmbed = new Discord.MessageEmbed()
    .setTitle("Role Added")
    .addField("Name", role.name)
    .addField("Permissions", role.permissions.bitfield)
    .addField("Mentionable", role.mentionable)
    .setFooter("Role ID: " + role.id)
    .setTimestamp()
    .setColor('00aaff');
  collection.findOne({ guild_id: role.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (role.guild.channels.cache.get(botLogsChannel)) {
        role.guild.channels.cache.get(botLogsChannel).send(roleCreateEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleDelete', role => {
  const roleDeleteEmbed = new Discord.MessageEmbed()
    .setTitle("Role Removed")
    .addField("Name", role.name)
    .addField("Permissions", role.permissions.bitfield)
    .addField("Mentionable", role.mentionable)
    .setFooter("Role ID: " + role.id)
    .setTimestamp()
    .setColor('e7778b');
  collection.findOne({ guild_id: role.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.botLogsChannel) {
      botLogsChannel = result.bot_logs_id;
      if (role.guild.channels.cache.get(botLogsChannel)) {
        role.guild.channels.cache.get(botLogsChannel).send(roleDeleteEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleUpdate', (oldRole, newRole) => {
  const roleUpdateEmbed = new Discord.MessageEmbed()
    .setTitle("Role Updated")
    .addField("Name", `${oldRole.name} >> ${newRole.name}`)
    .addField("Permissions", `${oldRole.permissions.bitfield} >> ${newRole.permissions.bitfield}`)
    .addField("Mentionable", `${oldRole.mentionable} >> ${newRole.mentionable}`)
    .setFooter("Role ID: " + newRole.id)
    .setTimestamp()
    .setColor('c9ff00');
  collection.findOne({ guild_id: newRole.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (newRole.guild.channels.cache.get(botLogsChannel)) {
        newRole.guild.channels.cache.get(botLogsChannel).send(roleUpdateEmbed).catch(console.error);
      }
    }
  });
});

/*client.on('userUpdate', (oldUser, newUser) => {
  if (oldUser.bot) {
    return;
  }
    const oldUserTag = oldUser.tag;
    const newUserTag = newUser.tag;
    const oldUserStatus = oldUser.presence.status;
    const newUserStatus = newUser.presence.status;
    const oldAvatarURL = oldUser.avatarURL();
    const newAvatarURL = newUser.avatarURL();

    const userUpdateEmbed = new Discord.MessageEmbed()
      .setTitle("Channel Created")
      .addField("Tag", `${oldUserTag} >> ${newUserTag}`)
      .addField("Status", `${oldUserStatus} >> ${newUserStatus}`)
      .setThumbnail(oldAvatarURL)
      .setImage(newAvatarURL)
      .setTimestamp()
      .setColor('00aaff');
    collection.findOne({ guild_id: channel.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      botLogsChannel = result.bot_logs_id;
      if (client.channels.cache.get(botLogsChannel)) {
        client.channels.cache.get(botLogsChannel).send(userUpdateEmbed).catch(console.error);
      }
    });
});*/

client.login(process.env.BOT_TOKEN);
