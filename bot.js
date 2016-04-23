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

var conversation = {
  check: [
    'how much your sugar?',
    'did you check sugar?',
    'sugar??',
    'how much?'
  ],
  inject: [
    'did you inject?',
    'inject??',
    'injection?',
    'will you inject?'
  ],
  eat: [
    'what did you eat?',
    'food??',
  ],
  goodSugar: [
    'Nice! :100:',
    'Good job! :+1:',
    'Mimi will be proud :heart: :simple_smile:',
    ':ok_hand:',
    ':clap:'
  ],
  highSugar: [
    ':pouting_cat:',
    'you had too much :cake:',
    'Please Inject! :syringe:',
    ':face_with_head_bandage: Not very good...',
    'Not good :-1:',
    'high sugar :baby_bottle:',
  ],
  lowSugar: [
    'low sugar :baby_bottle:',
    'You need to eat :apple: and then :bread:',
    'Too low!',
    ':chocolate_bar:'
  ],
  thanks: [
    'Thank you :wave:',
    'talk later',
    ':+1:'
  ]
}

mongoose.connect(db)

var today;
var PATIENT = 'U135E4DG9'
var CHANNEL = 'D1359F8H3'//'C1357PUCB'
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
  console.log(message)
  if (message.user != PATIENT) return

  if (state.check) {
    today.checks.push({ unit: message.text, time: Date.now() })
    commentOnSugar(message.text)
    today.save()
    rtm.sendMessage(sample(conversation.inject), CHANNEL, function() {
      setState('inject')
    });

  } else if(state.inject) {
    today.injections.push({ unit: message.text, time: Date.now() })
    today.save()
    rtm.sendMessage(sample(conversation.eat), CHANNEL, function() {
      setState('eat')
    });

  } else if(state.eat) {
    today.food.push({ description: message.text, time: Date.now() })
    today.save()
    rtm.sendMessage(sample(conversation.thanks), CHANNEL, function() {
      setState('eat')
    });
    resetState()
  }
});

function isTimeToCheck() {
  var hhmm = moment().format('HHmm')
  return ['0800','1200', '1600', '1800', '2300'].indexOf(hhmm) !== -1
}

function commentOnSugar(value) {
  value = Number.parseFloat(value)
  var message;
  if(value < 5) {
    message = sample(conversation.lowSugar)
  } else if(value < 9) {
    message = sample(conversation.goodSugar)
  } else {
    message = sample(conversation.highSugar)
  }
  rtm.sendMessage(message, CHANNEL)
}

function didYouCheckSugar() {
  rtm.sendMessage(sample(conversation.check), CHANNEL, function() {
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
