let init = false;
let auth;
const initErrMsg = `util.js has not been initiated with a valid Canvas API access token
Call init(token) first.`;

const fs = require('fs');

exports.init = (token) => {
  auth = `Bearer ${token}`;
  init = true;
};

function getStandardHeader() {
  if (!init) {
    throw Error(initErrMsg);
  }

  return {
    'Content-Type': 'application/json',
    Authorization: auth
  };
}

exports.nextURL = (linkText) => {
  let url = null;
  if (linkText) {
    const links = linkText.split(',');
    const nextRegEx = new RegExp('^<(.*)>; rel="next"$');
    for (let i = 0; i < links.length; i++) {
      const matches = nextRegEx.exec(links[i]);
      if (matches) {
        url = matches[1];
      }
    }
  }
  return url;
};

exports.standardArgs = () => ({ headers: getStandardHeader() });

exports.newQuizArgs = (title, description, pointsPossible, numberOfAttempts) => ({
  headers: getStandardHeader(),
  data: {
    quiz: {
      title: `${title}`,
      description: `${description}`,
      type: 'assignment',
      points_possible: `${pointsPossible}`,
      scoring_policy: 'keep_highest',
      show_correct_answers: false,
      allowed_attempts: `${numberOfAttempts}`,
      published: false,
      only_visible_to_overrides: true
    }
  }
});

exports.editQuizArgs = quizObject => ({
  headers: getStandardHeader(),
  data: {
    quiz: quizObject
  }
});

exports.saveQuizArgs = id => ({
  headers: getStandardHeader(),
  data: {
    quizzes: [id]
  }
});

exports.newQuestionArgs = (position, questionName, pointsPossible, q, a) => ({
  headers: getStandardHeader(),
  data: {
    question: {
      position,
      name: questionName,
      question_type: 'short_answer_question',
      question_text: `<p>${q}</p>`,
      points_possible: `${pointsPossible}`,
      answers: [{
        answer_text: `${a}`,
        answer_weight: 100
      }]
    }
  }
});

exports.newOverrideArgs = (lockDate, studentId) => ({
  headers: getStandardHeader(),
  data: {
    assignment_override: {
      lock_at: `${lockDate}`,
      student_ids: [studentId]
    }
  }
});

exports.newPublishQuizArgs = () => ({
  headers: getStandardHeader(),
  data: {
    quiz: {
      published: true,
      notify_of_update: false
    }
  }
});

exports.loadStudentQaFile = file => JSON.parse(fs.readFileSync(file).toString());

/**
 * @param {object} QaObject
 * @return {object}
 */
exports.checkTruthy = (QaObject) => {
  const qRE = /q$/;
  const answerDescRE = /(\da|description)$/;

  const result = {};
  Object.keys(QaObject).forEach((auid) => {
    // check QA values
    Object.keys(QaObject[auid]).forEach((key) => {
      // for each "q" make sure a matching "a" exists and is truthy or 0.
      if (qRE.test(key)) {
        const aKey = key.replace(/.$/, 'a'); // replace last letter ('q') with an 'a'
        const aVal = QaObject[auid][aKey];

        if (!aVal && aVal !== 0) {
          addError(result, `${auid}-${aKey}: ${QaObject[auid][aKey]}`);
        }
      } else if (!answerDescRE.test(key)) {
        // if it's also not an "a" or "description" field then it's not a valid property.
        console.log(`${auid} :: invalid field found: ${key}`);
      }
    });

    // Check each student has a non-empty description.
    if (!QaObject[auid].description) {
      addError(result, `${auid}: missing or empty description`);
    }
  });

  return result;
};

function addError(resultObject, msg) {
  if (!resultObject.errors) {
    resultObject.errors = [];
  }

  resultObject.errors.push(msg);
}
