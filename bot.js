var slackClient = require('slack-client')
var RTM_EVENTS = slackClient.RTM_EVENTS;
var RTM_CLIENT_EVENTS = slackClient.CLIENT_EVENTS.RTM;
var RtmClient = slackClient.RtmClient;

var moment = require('moment')
var mongoose = require('mongoose')
var db = "mongodb://localhost/diabotese"
var Day = require('./day')

var state = {
  check: false,
  inject: false,
  eat: false,
}

var questions = {
  check: [
    'how much your sugar?',
    'did you check sugar?',
    'sugar??',
    'how much?'
  ],
  inject: [
    'did you inject?',
    'inject??',
    'injection?'
  ],
  eat: [
    'what did you eat?',
    'eat??'
  ]
}

mongoose.connect(db)

var today;
var PATIENT  = 'U135E4DG9'
var CHANNEL = 'C1357PUCB'
var token   = process.env.DIABOTESE_TOKEN

var rtm = new RtmClient(token);
rtm.start();

rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {
  setTimeout(function(){
    if(isTimeToCheck()) {
      didYouCheckSugar()
    }
  },60000)
})

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  if (message.user != PATIENT) return

  if (state.check) {
    today.checks.push({ unit: message.text, time: Date.now() })
    today.save()
    rtm.sendMessage(sample(questions.inject), CHANNEL, function() {
      setState('inject')
    });

  } else if(state.inject) {
    today.injections.push({ unit: message.text, time: Date.now() })
    today.save()
    rtm.sendMessage(sample(questions.eat), CHANNEL, function() {
      setState('eat')
    });

  } else if(state.eat) {
    today.food.push({ description: message.text, time: Date.now() })
    today.save()
    rtm.sendMessage('Thank you', CHANNEL, function() {
      setState('eat')
    });
    resetState()
  }
});

function isTimeToCheck() {
  var hhmm = moment().format('HHmm')
  return ['0800', '1043' ,'1200', '1600', '1800', '2300'].indexOf(hhmm) !== -1
}

function didYouCheckSugar() {
  rtm.sendMessage(sample(questions.check), CHANNEL, function() {
    setState('check')
    askedSugar = true
    var day = moment().format('l');  // 4/22/2016
    Day.findOneOrCreate({ day: day }, { day: day }, function(err, _day) {
      today = _day
    })
  });
}

function resetState() {
  Object.keys(state).forEach(function(_state) {
    state[_state] = false
  })
}

function setState(newState) {
  Object.keys(state).forEach(function(_state) {
    state[_state] = newState == _state ? true : false
  })
}

function random(a,b) {
  return Math.floor(Math.random() * b) + a;
}

function sample(array) {
  return array[random(0, array.length - 1)]
}
