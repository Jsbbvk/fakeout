
var questionFile = require('../js/questions.json');

var questionList = questionFile.final.concat(questionFile.normal);

var queuedQuestions = [];

function resetQueuedQuestions() {
  for (var i = 0; i < questionList.length; i++) {
    queuedQuestions[i] = i;
  }
  shuffle(queuedQuestions);
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

resetQueuedQuestions();

module.exports = {
  getRandomQuestion: function() {
    var qObj = questionList[queuedQuestions.pop()];

    if (queuedQuestions.length==0) resetQueuedQuestions();

    var qText = qObj.question;
    qText = qText.replace("<BLANK>","_____");

    var ans = [qObj.answer];
    ans = ans.concat(qObj.alternateSpellings);

    return {
      question: qText,
      answer: ans
    };
  }
};
