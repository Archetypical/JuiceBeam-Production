const config = require("config.json");
const db = require("_helpers/db");
const SocketJoint = require('../server');

module.exports = {
  getEvents,
  checkBalance,
  create,
  eventPusher,
};

const events = [
  {
    name: "Confetti",
    cost: "10",
  },
  {
    name: "Fire",
    cost: "15",
  },
  {
    name: "Tayne",
    cost: "150",
  },
  {
    name: "Juice-Rain",
    cost: "200",
  },
];

async function checkBalance(name, event) {
  let eventValid = false;
  const user = await getUserByName(name);
  let isEnough = false;
  let eventIndex;
  for (let i = 0; i < events.length; i++) {
    if (events[i].name == event) {
      eventIndex = i;
      eventValid = true;
      break;
    }
  }

  if (eventValid) {
    if (user.points >= events[eventIndex].cost) {
      isEnough = true;
      return isEnough;
    }
  }
  return isEnough;
}

async function getEvents(name) {
  const user = await getUserByName(name);
  let rankEvents;

  switch (user.rank) {
    case "Dreamer":
      rankEvents = [events[0], events[1]];
      return rankEvents;
    case "Heartbeat":
      rankEvents = [events[0], events[1]];
      return rankEvents;
    case "Aware":
      rankEvents = [events[0], events[1], events[2]];
      return rankEvents;
    case "Lucid":
      rankEvents = [events[0], events[1], events[2], events[3]];
      return rankEvents;
    default:
      rankEvents = [events[0], events[1]];
      return rankEvents;
  }
}

async function create(event, name) {
  const user = await getUserByName(name);
  var eventValid;
  if (await db.Event.findOne({ where: { username: user.username } })) {
    throw "User already has an event queued";
  }
  for (var i = 0; i < events.length; i++) {
    if (events[i].name == event) {
      eventValid = true;
      break;
    }
  }
  if (!eventValid) {
    throw "Event Does Not Exist";
  }
  if (checkBalance(user.username, event) != true){
    const params = {};
    params.eventname = event;
    params.username = user.username;
    params.isRunning = 'off';
    await db.Event.create(params);
  }
  else {
    throw "User does not have enough juice!";
  }
}


async function eventPusher() {
  let oldestEvent = await db.Event.findAll({
    limit: 1,
    order: [["createdAt", "ASC"]],
  });

  if (oldestEvent.length == 0) return; //if the event table is empty do not proceed

  oldestEvent = oldestEvent[0];
  oldestEvent = await getEventById(oldestEvent.event_id);
  
  //if the oldest event is off turn it on
  if (oldestEvent.isRunning == 'off') {
    await oldestEvent.setDataValue("isRunning", 'on');
    await oldestEvent.save();
    SocketJoint.eventNotify({name: oldestEvent.username, event: oldestEvent.eventname}); //tells all users the current event and the user that started it
    let user = await getUserByName(oldestEvent.username); //find the owner of the oldest event
    for (var i = 0; i < events.length; i++){ //find matching event in the list
      if (oldestEvent.eventname == events[i].name){
        user.points = user.points - events[i].cost; //subtract the correct amount of points from the user
        await user.save(); //update the user in the database
        break;
      }
    }
    //after 10 seconds turn the event off and enter rest mode
    setTimeout(async () => {
      await oldestEvent.setDataValue("isRunning", 'resting');
      await oldestEvent.save();
      SocketJoint.eventNotify("off"); //tells all users there are no events
      // after 5 second rest mode ends, delete the event
      //and restart pusher to check for next event
      setTimeout(async () => {
        await oldestEvent.destroy();
        eventPusher();
      }, 5000);
    }, 10000);
  }
}

async function getUserByName(name) {
  const user = await db.User.findOne({ where: { username: name } });
  if (!user) throw "User not found";
  return user;
}

async function getEventById(event_id) {
  const event = await db.Event.findByPk(event_id);
  if (!event) throw "Event not found";
  return event;
}
