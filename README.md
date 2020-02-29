# trello-github-actions
You can link GitHub Issues and Pull Request with Trello card.

# Input
## trello-action
You can choose from the following. 
- **create_card_when_issue_opened**

This creates Trello card when issue opened and corresponds to:

Issue Title ⇆ Trello Title

Issue Description ⇆ Trello Description

Issue Assignees ⇆ Trello Members

Issue Labels ⇆ Trello Labels

*To link Issue Assginees and Issue Members, the Github user name and Trello user name must be the same.

*To link Issue Labels and Trello Labels, each name must be the same.

- **move_card_when_pull_request_opened**

This moves Trello card when issue opened. It uses the issue number {#number} included in the description of the pull request and searches for cards from DEPARTURE_LIST and moves to DESTINATION_LIST. If you set up a reviewer, it will be added to the card members.

- **move_card_when_pull_request_closed**

This moves Trello card when issue closed.

# Env
`TRELLO_API_KEY`: Your Trello API key

`TRELLO_API_TOKEN`: Your Trello API token

`TRELLO_BOARD_ID`: Your Trello board ID

`TRELLO_LIST_ID`: Your Trello list ID (only: create_card_when_issue_open)

`TRELLO_DEPARTURE_LIST_ID`: Your Trello list ID to move from (only: create_card_when_issue_open, move_card_when_pull_request_closed)

`TRELLO_DESTINATION_LIST_ID`: Your Trello list ID to move to (only: create_card_when_issue_open, move_card_when_pull_request_closed)
