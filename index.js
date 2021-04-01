#!/usr/bin/env node

const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const readerRole = message.guild.roles.cache.get("826840765526835240");
const specRole = message.guild.roles.cache.get("826849213954523216");
const writerRole = message.guild.roles.cache.get("826508727855087723");

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
});

client.on("message", message => {
  switch (message.content.toLowerCase()) {
    case '$score':
      startScoring(message);
      break;
  }
  if (message.content.toLowerCase().startsWith("$bulkdelete")) {
    bulkDelete(message);
  } else if (message.content.toLowerCase().startsWith("$rolerequest")) {
    roleRequest(message);
  }
});

async function roleRequest(message) {
  const role = message.content.substring(13).toLowerCase();
  const possibleRoles = ['spec', 'spectator', 'reader', 'writer'];
  if (possibleRoles.indexOf(role) === -1) {
    message.reply("Not a valid role");
    return;
  }
  const verificationMessage = message.channel.send(`<@&826508679636844574>, <@${message.author.id}> would like the **${role}** role. Are they worthy?`);
  verificationMessage.react('👍');
  verificationMessage.react('👎');
  const filter = (reaction, user) => {
    return ['👍', '👎'].includes(reaction.emoji.name) && user.hasPermission('ADMINISTRATOR');
  };
  verificationMessage.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
    .then(userReaction => {
      const reaction = userReaction.first();
      if (reaction.emoji === '👍') {
        if (role === 'reader') {
          message.member.roles.add(readerRole).catch(console.error);
        } else if (role === 'writer') {
          message.member.roles.add(writerRole).catch(console.error);
        } else if (role === 'spectator' || role === 'spec') {
          message.member.roles.add(writerRole).catch(console.error);
        }
      } else {
        message.reply("I guess you won't be getting that role!");
      }
    }).catch("Role reaction timeout, I guess the mods don't really care about you and forgot.");
}

async function bulkDelete(message) {
  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.reply("you do not have permissions!");
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
}

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
  const compRole = member.guild.roles.cache.get("826846965114339419");
  const botRole = member.guild.roles.cache.get("826871012724441158");
  if (member.bot) {
    member.roles.add(botRole).catch(console.error);
  } else {
    member.roles.add(compRole).catch(console.error);
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
});

client.login(process.env.BOT_TOKEN);
