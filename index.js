const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');

try {
  const apiKey = process.env['TRELLO_API_KEY'];
  const apiToken = process.env['TRELLO_API_TOKEN'];
  const boardId = process.env['TRELLO_BOARD_ID'];
  const action = core.getInput('trello-action');

  switch (action) {
    case 'create_card_when_issue_opened':
      createCardWhenIssueOpen(apiKey, apiToken, boardId);
      break;
    case 'move_card_when_pull_request_opened':
      moveCardWhenPullRequestOpen(apiKey, apiToken, boardId);
      break;
    case 'move_card_when_pull_request_closed':
      moveCardWhenPullRequestClose(apiKey, apiToken, boardId);
      break;

  }
} catch (error) {
  core.setFailed(error.message);
}

function createCardWhenIssueOpen(apiKey, apiToken, boardId) {
  const listId = process.env['TRELLO_LIST_ID'];
  const issue = github.context.payload.issue
  const number = issue.number;
  const title = issue.title;
  const description = issue.body;
  const url = issue.html_url;
  const assignees = issue.assignees.map(assignee => assignee.login);
  const issueLabelNames = issue.labels.map(label => label.name);

  getLabelsOfBoard(apiKey, apiToken, boardId).then(function(response) {
    const trelloLabels = response;
    const trelloLabelIds = [];
    issueLabelNames.forEach(function(issueLabelName) {
      trelloLabels.forEach(function(trelloLabel) {
        if (trelloLabel.name == issueLabelName) {
          trelloLabelIds.push(trelloLabel.id);
        }
      });
    });

    getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
      const members = response;
      const memberIds = [];
      assignees.forEach(function(assignee) {
        members.forEach(function(member) {
          if (member.username == assignee) {
            memberIds.push(member.id)
          }
        });
      });
      const cardParams = {
        number: number, title: title, description: description, url: url, memberIds: memberIds.join(), labelIds: trelloLabelIds.join()
      }

      createCard(apiKey, apiToken, listId, cardParams).then(function(response) {
        console.dir(response);
      });
    });
  });
}

function moveCardWhenPullRequestOpen(apiKey, apiToken, boardId) {
  const departureListId = process.env['TRELLO_DEPARTURE_LIST_ID'];
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request
  const issue_number = pullRequest.body.match(/#[0-9]+/)[0].slice(1);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);

  getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
    const members = response;
    const additionalMemberIds = [];
    reviewers.forEach(function(reviewer) {
      members.forEach(function(member) {
        if (member.username == reviewer) {
          additionalMemberIds.push(member.id);
        }
      });
    });

    getCardsOfList(apiKey, apiToken, departureListId).then(function(response) {
      const cards = response;
      let cardId;
      let existingMemberIds = [];
      cards.some(function(card) {
        const card_issue_number = card.name.match(/#[0-9]+/)[0].slice(1);
        if (card_issue_number == issue_number) {
          cardId = card.id;
          existingMemberIds = card.idMembers;
          return true;
        }
      });
      const cardParams = {
        destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
      }

      if (cardId) {
        putCard(apiKey, apiToken, cardId, cardParams).then(function(response) {
          addUrlSourceToCard(apiKey, apiToken, cardId, url);
        });
      } else {
        core.setFailed('Card not found.');
      }
    });
  });
}

function moveCardWhenPullRequestClose(apiKey, apiToken, boardId) {
  const departureListId = process.env['TRELLO_DEPARTURE_LIST_ID'];
  const destinationListId = process.env['TRELLO_DESTINATION_LIST_ID'];
  const pullRequest = github.context.payload.pull_request
  const issue_number = pullRequest.body.match(/#[0-9]+/)[0].slice(1);
  const url = pullRequest.html_url;
  const reviewers = pullRequest.requested_reviewers.map(reviewer => reviewer.login);

  getMembersOfBoard(apiKey, apiToken, boardId).then(function(response) {
    const members = response;
    const additionalMemberIds = [];
    reviewers.forEach(function(reviewer) {
      members.forEach(function(member) {
        if (member.username == reviewer) {
          additionalMemberIds.push(member.id);
        }
      });
    });

    getCardsOfList(apiKey, apiToken, departureListId).then(function(response) {
      const cards = response;
      let cardId;
      let existingMemberIds = [];
      cards.some(function(card) {
        const card_issue_number = card.name.match(/#[0-9]+/)[0].slice(1);
        if (card_issue_number == issue_number) {
          cardId = card.id;
          existingMemberIds = card.idMembers;
          return true;
        }
      });
      const cardParams = {
        destinationListId: destinationListId, memberIds: existingMemberIds.concat(additionalMemberIds).join()
      }

      if (cardId) {
        putCard(apiKey, apiToken, cardId, cardParams);
      } else {
        core.setFailed('Card not found.');
      }
    });
  });
}

function getLabelsOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getMembersOfBoard(apiKey, apiToken, boardId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/boards/${boardId}/members?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function getCardsOfList(apiKey, apiToken, listId) {
  return new Promise(function(resolve, reject) {
    request(`https://api.trello.com/1/lists/${listId}/cards?key=${apiKey}&token=${apiToken}`)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function createCard(apiKey, apiToken, listId, params) {
  const options = {
    method: 'POST',
    url: 'https://api.trello.com/1/cards',
    form: {
      'idList': listId,
      'keepFromSource': 'all',
      'key': apiKey,
      'token': apiToken,
      'name': `[#${params.number}] ${params.title}`,
      'desc': params.description,
      'urlSource': params.url,
      'idMembers': params.memberIds,
      'idLabels': params.labelIds
    },
    json: true
  }
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function putCard(apiKey, apiToken, cardId, params) {
  const options = {
    method: 'PUT',
    url: `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`,
    form: {
      'idList': params.destinationListId,
      'idMembers': params.memberIds,
    }
  }
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}

function addUrlSourceToCard(apiKey, apiToken, cardId, url) {
  const options = {
    method: 'POST',
    url: `https://api.trello.com/1/cards/${cardId}/attachments?key=${apiKey}&token=${apiToken}`,
    form: {
      url: url
    }
  }
  return new Promise(function(resolve, reject) {
    request(options)
      .then(function(body) {
        resolve(JSON.parse(body));
      })
      .catch(function(error) {
        reject(error);
      })
  });
}
